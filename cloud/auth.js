const encoder=new TextEncoder();
const COOKIE='talacard_session',SESSION_SECONDS=8*60*60,ATTEMPT_WINDOW=15*60*1000,ATTEMPT_LIMIT=8;
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const bytes=value=>Uint8Array.from(value.match(/../g)||[],v=>parseInt(v,16));
const digest=async value=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
export const LOGIN_ASSETS=new Set(['/login','/login.html','/access.css','/access.js','/login.js','/media/talacard-logo.png','/original/assets/18892ffc31be2992.ttf','/original/assets/3c8442fb10f298d0.ttf']);
export const EDITOR_ASSETS=new Set(['/edit.html','/studio.js','/rich-editor.js']);
function accounts(env){
 try{const list=JSON.parse(env.TALACARD_AUTH_ACCOUNTS);if(!Array.isArray(list)||!list.length||list.length>10)return [];
  if(new Set(list.map(a=>a.username)).size!==list.length)return [];
  return list.every(a=>/^[a-z0-9_-]{1,64}$/.test(a.username)&&['viewer','editor'].includes(a.role)&&/^[a-f0-9]{32,64}$/.test(a.salt)&&/^[a-f0-9]{64}$/.test(a.hash)&&Number.isSafeInteger(a.iterations)&&a.iterations>=100000)?list:[];
 }catch{return []}
}
export const authConfigured=env=>Boolean(env.BUCKET&&accounts(env).length);
export const sameOrigin=request=>request.headers.get('Origin')===new URL(request.url).origin&&request.headers.get('Sec-Fetch-Site')!=='cross-site';
function tokenFrom(request){const token=request.headers.get('Cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);return /^[a-f0-9]{64}$/.test(token||'')?token:null}
function cookie(request,token,seconds){return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${new URL(request.url).protocol==='https:'?'; Secure':''}`}
async function read(bucket,key){const object=await bucket.get(key);if(!object)return null;return {data:await new Response(object.body).json(),etag:object.httpEtag}}
async function write(bucket,key,value,expected){const conditions=new Headers();if(expected===null)conditions.set('If-None-Match','*');else if(expected)conditions.set('If-Match',expected);return bucket.put(key,JSON.stringify(value),{...(expected!==undefined?{onlyIf:conditions}:{}),httpMetadata:{contentType:'application/json',cacheControl:'no-store'}})}
const fingerprint=account=>digest([account.username,account.role,account.salt,account.hash,account.iterations].join('|'));
async function matches(password,account){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const actual=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(account.salt),iterations:account.iterations},key,256)),expected=bytes(account.hash);
 let different=actual.length^expected.length;for(let i=0;i<actual.length;i++)different|=actual[i]^expected[i];return different===0;
}
export async function getSession(request,env,{now=Date.now()}={}){
 const token=tokenFrom(request);if(!token||!authConfigured(env))return null;
 const key='auth/sessions/'+await digest(token),record=await read(env.BUCKET,key);if(!record)return null;
 const session=record.data,account=accounts(env).find(a=>a.username===session.username);
 if(!account||!Number.isFinite(session.expires)||session.expires<=now||session.fingerprint!==await fingerprint(account)){await env.BUCKET.delete(key);return null}
 return {username:account.username,role:account.role,expires:session.expires};
}
async function reserveAttempt(bucket,key,now){
 for(let attempt=0;attempt<5;attempt++){
  const old=await read(bucket,key),current=old?.data?.until>now?old.data:{count:0,until:now+ATTEMPT_WINDOW};
  if(current.count>=ATTEMPT_LIMIT)return false;
  if(await write(bucket,key,{count:current.count+1,until:current.until},old?.etag??null))return true;
 }
 return false;
}
export async function handleAuth(request,env,{ip='unknown',now=Date.now()}={}){
 const p=new URL(request.url).pathname;
 if(p==='/api/auth/me'&&request.method==='GET'){
  if(!authConfigured(env))return json({error:'ورود هنوز پیکربندی نشده است.'},503);
  const session=await getSession(request,env,{now});return session?json({...session,required:true,storage:env.TALACARD_STORAGE||'cloud'}):json({error:'برای ادامه وارد شوید.'},401);
 }
 if(!['/api/auth/login','/api/auth/logout'].includes(p)||request.method!=='POST')return json({error:'Not found'},404);
 if(!sameOrigin(request))return json({error:'مبدأ درخواست معتبر نیست.'},403);
 if(!authConfigured(env))return json({error:'ورود هنوز پیکربندی نشده است.'},503);
 if(p==='/api/auth/logout'){
  const token=tokenFrom(request);if(token)await env.BUCKET.delete('auth/sessions/'+await digest(token));
  return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
 }
 if(!request.headers.get('Content-Type')?.startsWith('application/json')||Number(request.headers.get('Content-Length'))>4096)return json({error:'درخواست ورود معتبر نیست.'},400);
 const text=await request.text();if(encoder.encode(text).length>4096)return json({error:'درخواست ورود معتبر نیست.'},400);
 let input;try{input=JSON.parse(text)}catch{return json({error:'درخواست ورود معتبر نیست.'},400)}
 if(typeof input?.username!=='string'||typeof input.password!=='string'||input.username.length>64||input.password.length>256)return json({error:'نام کاربری یا رمز عبور درست نیست.'},401);
 const username=input.username.trim().toLowerCase(),list=accounts(env),account=list.find(a=>a.username===username);
 const limitKey='auth/limits/'+await digest(ip+'|'+(account?.username||'unknown'));
 if(!await reserveAttempt(env.BUCKET,limitKey,now))return json({error:'تلاش‌های ورود زیاد است؛ ۱۵ دقیقه دیگر دوباره امتحان کنید.'},429,{'Retry-After':'900'});
 const correct=await matches(input.password,account||list[0]);
 if(!account||!correct)return json({error:'نام کاربری یا رمز عبور درست نیست.'},401);
 const token=random(),expires=now+SESSION_SECONDS*1000;
 if(!await write(env.BUCKET,'auth/sessions/'+await digest(token),{username:account.username,fingerprint:await fingerprint(account),expires},null))return json({error:'ورود انجام نشد؛ دوباره تلاش کنید.'},503);
 await env.BUCKET.delete(limitKey);
 return json({role:account.role,redirect:account.role==='editor'?'/edit.html#edit-home':'/'},200,{'Set-Cookie':cookie(request,token,SESSION_SECONDS)});
}
export function loginRequired(request){const url=new URL(request.url);return url.pathname.startsWith('/api/')||/\.(json|js|css|mp4|webm|png|jpg|webp|ttf)$/.test(url.pathname)?json({error:'برای ادامه وارد شوید.'},401):new Response(null,{status:302,headers:{Location:'/login','Cache-Control':'no-store'}})}
