import {validateProject,projectMediaPaths} from '../public/model.js';
import {authConfigured,handleAuth,getSession,LOGIN_ASSETS,EDITOR_ASSETS,sameOrigin,loginRequired} from './auth.js';
import {MEDIA_TYPES,validMediaHeader} from './media.js';

const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra}});
const hash=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
const TYPES={mp4:'video/mp4',webm:'video/webm',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif'};
const validName=name=>/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,180}$/.test(name)&&!name.includes('..')&&TYPES[name.split('.').pop()];
async function authorized(request,env){
 if(!env.TALACARD_SYNC_TOKEN)return false;
 const a=await hash(new TextEncoder().encode(request.headers.get('Authorization')||''));
 const b=await hash(new TextEncoder().encode('Bearer '+env.TALACARD_SYNC_TOKEN));
 return a===b;
}
async function publish(request,env,assets){
 if(Number(request.headers.get('Content-Length'))>2*1024*1024)return json({error:'Project too large'},413);
 const text=await request.text();if(new TextEncoder().encode(text).length>2*1024*1024)return json({error:'Project too large'},413);
 let project;try{project=validateProject(JSON.parse(text))}catch{return json({error:'Invalid project'},400)}
 const paths=projectMediaPaths(project);
 for(const p of paths){if(!assets[p]&&!await env.BUCKET.head(p.slice(1)))return json({error:'Missing media',path:p},409)}
 const digest=await hash(new TextEncoder().encode(text));const conditions=new Headers();
 const expected=request.headers.get('If-Match');
 if(expected)conditions.set('If-Match',expected);else conditions.set('If-None-Match','*');
 const result=await env.BUCKET.put('project/current.json',text,{onlyIf:conditions,httpMetadata:{contentType:'application/json; charset=utf-8',cacheControl:'no-store'},customMetadata:{revision:digest,updatedAt:new Date().toISOString()}});
 if(!result)return json({error:'Cloud version changed. Reload before publishing.'},409);
 return json({revision:digest,etag:result.httpEtag,updatedAt:result.customMetadata.updatedAt});
}
export function createWorker(assets={}) {
 return {async fetch(request,env){try{
  const url=new URL(request.url),p=url.pathname;
  if(p.startsWith('/api/auth/'))return await handleAuth(request,env,{ip:request.headers.get('CF-Connecting-IP')||'unknown'});
  // Device synchronization keeps its existing server-only bearer credential.
  if(p==='/api/sync/status'||p==='/api/sync/project'||p.startsWith('/api/sync/media/')){
   if(!await authorized(request,env))return json({error:'Unauthorized'},401);
   if(!env.BUCKET)return json({error:'Storage unavailable'},503);
   if(p==='/api/sync/status'&&request.method==='GET'){
    const current=await env.BUCKET.head('project/current.json');return json({etag:current?.httpEtag||null,revision:current?.customMetadata?.revision||null,updatedAt:current?.customMetadata?.updatedAt||null});
   }
   if(p==='/api/sync/project'&&request.method==='PUT')return await publish(request,env,assets);
   if(p.startsWith('/api/sync/media/')){
    const name=p.slice('/api/sync/media/'.length);if(!validName(name))return json({error:'Invalid media name'},400);
    const key='media/'+name;
    if(request.method==='HEAD'){
     const obj=await env.BUCKET.head(key);return new Response(null,{status:obj?200:404,headers:{'Cache-Control':'no-store','X-Asset-Hash':obj?.customMetadata?.sha256||''}});
    }
    if(request.method==='PUT'){
     const size=Number(request.headers.get('Content-Length')),digest=request.headers.get('X-Asset-Hash');
     if(!size||size>95*1024*1024||!/^[a-f0-9]{64}$/.test(digest||''))return json({error:'Invalid media size or digest'},400);
     const previous=await env.BUCKET.head(key);
     if(previous&&previous.customMetadata?.sha256!==digest)return json({error:'Immutable media name already used'},409);
     if(!previous)await env.BUCKET.put(key,request.body,{httpMetadata:{contentType:TYPES[name.split('.').pop()],cacheControl:'public, max-age=31536000, immutable'},customMetadata:{sha256:digest}});
     return json({ok:true});
    }
   }
   return json({error:'Not found'},404);
  }
  const publicAsset=LOGIN_ASSETS.has(p),session=publicAsset?null:await getSession(request,env);
  if(!publicAsset){
   if(!authConfigured(env))return json({error:'ورود هنوز پیکربندی نشده است.'},503);
   if(!session)return loginRequired(request);
   if(EDITOR_ASSETS.has(p)&&session.role!=='editor')return new Response(null,{status:302,headers:{Location:'/','Cache-Control':'no-store'}});
  }
  if(p.startsWith('/api/')){
   if(session?.role!=='editor')return json({error:'این حساب فقط اجازهٔ مشاهده دارد.'},403);
   if(!['GET','HEAD'].includes(request.method)&&!sameOrigin(request))return json({error:'مبدأ درخواست معتبر نیست.'},403);
   const current=await env.BUCKET.get('project/current.json');
   const text=current?await new Response(current.body).text():assets['/default-content.json']?new TextDecoder().decode(Uint8Array.from(atob(assets['/default-content.json'].body),c=>c.charCodeAt(0))):null;
   if(!text)return json({error:'پروژه پیدا نشد.'},404);
   const revision=current?.customMetadata?.revision||await hash(new TextEncoder().encode(text));
   if(p==='/api/project'&&request.method==='GET')return json({project:JSON.parse(text),revision,storage:'cloud'});
   if(p==='/api/project'&&request.method==='PUT'){
    if(Number(request.headers.get('Content-Length'))>2*1024*1024)return json({error:'Project too large'},413);
    const inputText=await request.text();if(new TextEncoder().encode(inputText).length>2*1024*1024)return json({error:'Project too large'},413);
    const input=JSON.parse(inputText);if(input.revision!==revision)return json({error:'پروژه در پنجرهٔ دیگری تغییر کرده است.'},409);
    const headers={'Content-Type':'application/json',...(current?{'If-Match':current.httpEtag}:{})};
    return await publish(new Request(request.url,{method:'PUT',headers,body:JSON.stringify(input.project,null,2)+'\n'}),env,assets);
   }
   if(p==='/api/sync'&&request.method==='GET'||p==='/api/sync/retry'&&request.method==='POST')return json({enabled:true,status:'published',revision,publishedAt:current?.customMetadata?.updatedAt||null,storage:'cloud'},p.endsWith('/retry')?202:200);
   if(p==='/api/media'&&request.method==='POST')return await uploadBrowserMedia(request,env);
   return json({error:'Not found'},404);
  }
  if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed'},405);
  if(p==='/default-content.json'){
   const obj=await env.BUCKET?.get('project/current.json');
   if(obj){if(request.headers.get('If-None-Match')===obj.httpEtag)return new Response(null,{status:304,headers:{ETag:obj.httpEtag,'Cache-Control':'no-store'}});
    return new Response(request.method==='HEAD'?null:obj.body,{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store',ETag:obj.httpEtag}})}
  }
  if(p.startsWith('/media/')&&validName(p.slice(7))){
   const obj=await env.BUCKET?.get(p.slice(1),request.headers.has('Range')?{range:request.headers}:{});
   if(obj){const headers=new Headers({'Content-Type':obj.httpMetadata.contentType,'Accept-Ranges':'bytes','Cache-Control':'private, no-store',ETag:obj.httpEtag,'X-Content-Type-Options':'nosniff'});let status=200;
    if(obj.range){const offset=obj.range.offset??Math.max(0,obj.size-obj.range.suffix),length=obj.range.length??obj.size-offset;headers.set('Content-Range',`bytes ${offset}-${offset+length-1}/${obj.size}`);headers.set('Content-Length',String(length));status=206}else headers.set('Content-Length',String(obj.size));
    return new Response(request.method==='HEAD'?null:obj.body,{status,headers});}
  }
  const asset=assets[p==='/'?'/index.html':p==='/login'?'/login.html':p];
  if(asset){const body=Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':asset.type,'Cache-Control':publicAsset?'no-cache':'private, no-store','Referrer-Policy':'same-origin','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"}})}
  return json({error:'Not found'},404);
 }catch(error){return json({error:error.status?error.message:'Request failed'},error.status||500)}}};
}

async function uploadBrowserMedia(request,env){
 const type=(request.headers.get('Content-Type')||'').split(';')[0],ext=MEDIA_TYPES[type],max=95*1024*1024;
 if(!ext)return json({error:'نوع فایل پشتیبانی نمی‌شود.'},415);
 const length=Number(request.headers.get('Content-Length')||request.headers.get('X-Upload-Length'));
 if(length>max)return json({error:'حجم فایل بیشتر از حد مجاز است.'},413);
 if(!Number.isSafeInteger(length)||length<=0)return json({error:'اندازهٔ فایل معتبر نیست.'},411);
 if(!request.body)return json({error:'فایل خالی است.'},400);
 const reader=request.body.getReader(),prefix=[];let total=0;
 while(total<12){const chunk=await reader.read();if(chunk.done)break;prefix.push(chunk.value);total+=chunk.value.length;if(total>max){await reader.cancel();return json({error:'حجم فایل بیشتر از حد مجاز است.'},413)}}
 const header=new Uint8Array(Math.min(total,12));let offset=0;for(const chunk of prefix){const amount=Math.min(chunk.length,12-offset);if(amount>0){header.set(chunk.subarray(0,amount),offset);offset+=amount}}
 if(!validMediaHeader(header,type)){await reader.cancel();return json({error:'محتوای فایل با نوع انتخاب‌شده مطابقت ندارد.'},400)}
 const stream=new ReadableStream({start(controller){for(const chunk of prefix)controller.enqueue(chunk)},async pull(controller){const chunk=await reader.read();if(chunk.done){controller.close();return}total+=chunk.value.length;if(total>max){await reader.cancel();const e=new Error('حجم فایل بیشتر از حد مجاز است.');e.status=413;controller.error(e);return}controller.enqueue(chunk.value)},cancel(reason){return reader.cancel(reason)}});
 const id='upload-'+crypto.randomUUID(),name=id+ext,digest=request.headers.get('X-Asset-Hash');
 // R2 requires a stream with a known length; avoid buffering large movies.
 const payload=typeof FixedLengthStream==='function'?stream.pipeThrough(new FixedLengthStream(length)):stream;
 const checksum=/^[a-f0-9]{64}$/.test(digest||'');
 await env.BUCKET.put('media/'+name,payload,{...(checksum?{sha256:digest}:{}),httpMetadata:{contentType:type,cacheControl:'private, no-store'},customMetadata:checksum?{sha256:digest}:{}});
 return json({id,src:'/media/'+name,poster:type.startsWith('image/')?'/media/'+name:'',type:type.startsWith('video/')?'video':'image'},201);
}
