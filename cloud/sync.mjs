import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import {sceneMediaPaths} from '../public/model.js';
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
const TYPES={'.mp4':'video/mp4','.webm':'video/webm','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif'};
export function createCloudSync(root,{fetchImpl=fetch,delay=1200,retryDelay=15000}={}) {
 const privateDir=path.join(root,'.private'),stateFile=path.join(privateDir,'sync-state.json');
 let timer,running=false,again=false,closed=false;
 let cache={assets:{}};try{cache=JSON.parse(fs.readFileSync(stateFile))}catch{}
 let state={enabled:false,status:'pending',revision:cache.revision||null,publishedAt:cache.publishedAt||null,error:null,asset:null};
 const config=()=>{try{return JSON.parse(fs.readFileSync(path.join(privateDir,'cloud.json')))}catch{return null}};
 const persist=()=>{fs.mkdirSync(privateDir,{recursive:true,mode:0o700});fs.writeFileSync(stateFile+'.tmp',JSON.stringify(cache),{mode:0o600});fs.renameSync(stateFile+'.tmp',stateFile)};
 const status=()=>({...state,enabled:!!config()});
 function schedule(ms=delay){if(closed)return;clearTimeout(timer);timer=setTimeout(()=>run(),ms);timer.unref?.()}
 async function run(){
  if(closed)return;if(running){again=true;return}const conf=config();if(!conf){state={...state,enabled:false,status:'disabled'};return}
  running=true;state={...state,enabled:true,status:'syncing',error:null};
  try{
   const origin=new URL(conf.url);if(origin.protocol!=='https:'||origin.username||origin.password)throw new Error('Invalid cloud address');
   const call=async(p,options={})=>{
    const response=await fetchImpl(new URL(p,origin),{...options,redirect:'error',headers:{Authorization:'Bearer '+conf.token,...options.headers},signal:AbortSignal.timeout(180000)});
    if(!response.ok&&response.status!==404){const error=new Error(response.status===409?'نسخهٔ آنلاین تغییر کرده؛ برای جلوگیری از بازنویسی، همگام‌سازی متوقف شد.':response.status===401?'اتصال انتشار معتبر نیست.':'ارتباط با سایت انجام نشد؛ دوباره تلاش می‌شود.');error.status=response.status;throw error}return response;
   };
   const text=fs.readFileSync(path.join(root,'content.json'),'utf8'),revision=digest(text),project=JSON.parse(text);
   const remoteResponse=await call('/api/sync/status');if(!remoteResponse.ok)throw new Error('نسخهٔ آنلاین هنوز برای همگام‌سازی آماده نیست.');const remote=await remoteResponse.json();
   if(remote.revision===revision){cache={...cache,revision,etag:remote.etag,publishedAt:remote.updatedAt};persist();state={...state,status:'published',revision,publishedAt:remote.updatedAt,asset:null};return}
   if(cache.etag&&remote.etag!==cache.etag&&remote.revision!==cache.revision) {const e=new Error('نسخهٔ آنلاین از دستگاه دیگری تغییر کرده؛ همگام‌سازی برای حفظ آن متوقف شد.');e.status=409;throw e}
   if(!remote.revision)cache.assets={};
   const paths=[...new Set(project.decks.flatMap(d=>d.scenes.flatMap(s=>sceneMediaPaths(s))).filter(Boolean))];
   for(const src of paths){
    const name=src.slice('/media/'.length),override=conf.optimizedMediaPath&&path.join(conf.optimizedMediaPath,name);
    const filename=override&&fs.existsSync(override)?override:path.join(root,'public',src);
    const bytes=fs.readFileSync(filename),sha=digest(bytes);
    if(cache.assets?.[src]===sha)continue;
    state.asset=name;const head=await call('/api/sync/media/'+encodeURIComponent(name),{method:'HEAD'});
    if(head.status===404||head.headers.get('X-Asset-Hash')!==sha){
     await call('/api/sync/media/'+encodeURIComponent(name),{method:'PUT',headers:{'Content-Type':TYPES[path.extname(name)],'Content-Length':String(bytes.length),'X-Asset-Hash':sha},body:Readable.toWeb(fs.createReadStream(filename)),duplex:'half'});
    }
    cache.assets||={};cache.assets[src]=sha;persist();
   }
   const result=await call('/api/sync/project',{method:'PUT',headers:{'Content-Type':'application/json',...(remote.etag?{'If-Match':remote.etag}:{})},body:text});
   const published=await result.json();cache={...cache,revision,etag:published.etag,publishedAt:published.updatedAt};persist();
   state={...state,status:'published',revision,publishedAt:published.updatedAt,asset:null,error:null};
   if(digest(fs.readFileSync(path.join(root,'content.json')))!==revision)again=true;
  }catch(error){state={...state,status:error.status===409?'conflict':'retrying',error:error.message,asset:null};if(error.status!==409)schedule(retryDelay)}
  finally{running=false;if(again){again=false;schedule()}}
 }
 schedule();
 return {status,schedule,run,close(){closed=true;clearTimeout(timer)}};
}
