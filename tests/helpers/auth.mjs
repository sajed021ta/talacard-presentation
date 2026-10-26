import {pbkdf2Sync} from 'node:crypto';
export const testAccounts=['editor','viewer'].map((role,i)=>{const salt=String(i+1).padStart(32,'0');return {username:role==='editor'?'admin':'viewer',role,salt,iterations:100000,hash:pbkdf2Sync(role+'-test-password',Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex')}});
export class Bucket{
 map=new Map();counter=0;
 async head(key){const x=this.map.get(key);return x?{...x,body:undefined}:null}
 async get(key,options={}){const x=this.map.get(key);if(!x)return null;const range=options.range?.get?.('Range');if(range){const [,start,end]=/^bytes=(\d+)-(\d+)$/.exec(range)||[];const offset=Number(start),length=Number(end)-offset+1;return {...x,body:x.bytes.slice(offset,offset+length),range:{offset,length}}}return {...x,body:x.bytes}}
 async put(key,body,options={}){
  const bytes=new Uint8Array(await new Response(body).arrayBuffer()),old=this.map.get(key),condition=options.onlyIf;
  if(condition?.get('If-Match')&&condition.get('If-Match')!==old?.httpEtag)return null;
  if(condition?.get('If-None-Match')==='*'&&old)return null;
  const etag=String(++this.counter),obj={bytes,size:bytes.length,httpEtag:'"'+etag+'"',etag,httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{}};this.map.set(key,obj);return obj;
 }
 async delete(key){this.map.delete(key)}
}
export const testEnvironment=()=>({BUCKET:new Bucket(),TALACARD_SYNC_TOKEN:'test-token',TALACARD_AUTH_ACCOUNTS:JSON.stringify(testAccounts)});
export async function signIn(worker,env,role='viewer',origin='https://site.test'){
 const response=await worker.fetch(new Request(origin+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:role==='editor'?'admin':'viewer',password:role+'-test-password'})}),env);
 if(response.status!==200)throw Error('Test login failed: '+response.status+' '+await response.text());return response.headers.get('Set-Cookie').split(';')[0];
}
