import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createWorker} from '../cloud/worker.js';
import {createCloudSync} from '../cloud/sync.mjs';

class Bucket {
 map=new Map();
 async head(key){const x=this.map.get(key);return x?{...x,body:undefined}:null}
 async get(key){const x=this.map.get(key);return x?{...x,body:x.bytes}:null}
 async put(key,body,options={}){
  const old=this.map.get(key),condition=options.onlyIf;
  if(condition?.get('If-Match')&&condition.get('If-Match')!==old?.httpEtag)return null;
  if(condition?.get('If-None-Match')==='*'&&old)return null;
  const bytes=new Uint8Array(await new Response(body).arrayBuffer());
  const etag=String(Math.random());const obj={bytes,size:bytes.length,httpEtag:'"'+etag+'"',etag,httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{}};this.map.set(key,obj);return obj;
 }
}
const project=()=>{const p=JSON.parse(fs.readFileSync(new URL('../content.json',import.meta.url)));for(const d of p.decks)for(const s of d.scenes){s.media='';s.poster=''}return p};
const url='https://site.test';
const env=()=>({BUCKET:new Bucket(),TALACARD_SYNC_TOKEN:'test-token'});
const headers={Authorization:'Bearer test-token','Content-Type':'application/json'};

test('public viewer stays read-only; publication requires secret and validates media and revision',async()=>{
 const e=env(),worker=createWorker({'/index.html':{type:'text/html',body:Buffer.from('<h1>viewer</h1>').toString('base64')}});
 assert.equal((await worker.fetch(new Request(url+'/'),e)).status,200);
 assert.equal((await worker.fetch(new Request(url+'/api/sync/status'),e)).status,401);
 const p=project(),rich=p.decks[1].scenes[0];
 rich.textBlocks=[{id:'body-1',runs:[{text:'متن قالب‌دار',bold:true}],format:{align:'center'}}];rich.description='متن قالب‌دار';rich.mediaEffect={type:'zoom-out',duration:20,delay:0,amount:20,repeat:false,easing:'ease-out'};
 let response=await worker.fetch(new Request(url+'/api/sync/project',{method:'PUT',headers,body:JSON.stringify(p)}),e);
 assert.equal(response.status,200);const first=await response.json();
 const get=await worker.fetch(new Request(url+'/default-content.json'),e);assert.deepEqual(await get.json(),p);
 assert.equal((await worker.fetch(new Request(url+'/default-content.json',{headers:{'If-None-Match':first.etag}}),e)).status,304);
 response=await worker.fetch(new Request(url+'/api/sync/project',{method:'PUT',headers,body:JSON.stringify(p)}),e);assert.equal(response.status,409);
 p.decks[0].scenes[0].title='new title';
 response=await worker.fetch(new Request(url+'/api/sync/project',{method:'PUT',headers:{...headers,'If-Match':first.etag},body:JSON.stringify(p)}),e);assert.equal(response.status,200);
 p.decks[0].scenes[0].media='/media/missing.mp4';
 response=await worker.fetch(new Request(url+'/api/sync/project',{method:'PUT',headers:{...headers,'If-Match':(await response.json()).etag},body:JSON.stringify(p)}),e);assert.equal(response.status,409);
 assert.equal((await worker.fetch(new Request(url+'/api/sync/media/secret.html',{method:'PUT',headers,body:'bad'}),e)).status,400);
});

test('local saves publish media before the project, skip repeat uploads, retry offline and protect remote edits',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tala-cloud-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'.private'));fs.mkdirSync(path.join(root,'public/media'),{recursive:true});
 fs.writeFileSync(path.join(root,'.private/cloud.json'),JSON.stringify({url,token:'test-token'}));
 const p=project();p.decks[1].scenes[0].media='/media/test.mp4';
 fs.writeFileSync(path.join(root,'public/media/test.mp4'),Buffer.from('0000ftypisom1234'));fs.writeFileSync(path.join(root,'content.json'),JSON.stringify(p));
 const e=env(),worker=createWorker();let offline=true,uploads=0;
 const fetchImpl=async(input,options)=>{if(offline)throw new Error('offline');if(options.method==='PUT'&&String(input).includes('/media/'))uploads++;return worker.fetch(new Request(input,options),e)};
 const sync=createCloudSync(root,{fetchImpl,delay:100000,retryDelay:100000});t.after(()=>sync.close());
 await sync.run();assert.equal(sync.status().status,'retrying');assert.ok(fs.existsSync(path.join(root,'content.json')));
 offline=false;await sync.run();assert.equal(sync.status().status,'published');assert.equal(uploads,1);assert.ok(await e.BUCKET.head('media/test.mp4'));
 await sync.run();assert.equal(uploads,1);
 p.decks[1].scenes[0].title='a second edit';fs.writeFileSync(path.join(root,'content.json'),JSON.stringify(p));await sync.run();assert.equal(sync.status().status,'published');assert.equal(uploads,1);
 const remote=await e.BUCKET.get('project/current.json');await e.BUCKET.put('project/current.json',JSON.stringify({...p,activeDeck:'app'}),{customMetadata:{revision:'other-device'}});
 p.decks[1].scenes[0].title='unsent local edit';fs.writeFileSync(path.join(root,'content.json'),JSON.stringify(p));await sync.run();assert.equal(sync.status().status,'conflict');assert.equal((await e.BUCKET.head('project/current.json')).customMetadata.revision,'other-device');
});
