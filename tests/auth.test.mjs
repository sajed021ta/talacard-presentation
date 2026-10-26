import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {createWorker} from '../cloud/worker.js';
import {getSession,handleAuth} from '../cloud/auth.js';
import {createApp} from '../server.mjs';
import {testEnvironment,testAccounts,signIn} from './helpers/auth.mjs';
const origin='https://site.test',asset=text=>({type:'text/html',body:Buffer.from(text).toString('base64')});
const project=()=>{const p=JSON.parse(fs.readFileSync(new URL('../content.json',import.meta.url)));for(const d of p.decks)for(const s of d.scenes){s.media='';s.poster='';delete s.mediaItems}p.homeCards={};delete p.editor;return p};
const headers=cookie=>({Cookie:cookie,Origin:origin,'Content-Type':'application/json'});

test('hosted export contains the complete viewer and admin editor module dependency graph',t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'tala-auth-package-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
 execFileSync(process.execPath,[new URL('../scripts/export-viewer.mjs',import.meta.url).pathname,folder]);
 const checked=new Set(),check=file=>{if(checked.has(file))return;checked.add(file);assert.ok(fs.existsSync(file),'Missing hosted module '+path.basename(file));for(const match of fs.readFileSync(file,'utf8').matchAll(/(?:import|export)\s+[^;]*?from\s+['"]([^'"]+)['"]/g)){if(match[1].startsWith('.'))check(path.resolve(path.dirname(file),match[1]))}};
 check(path.join(folder,'studio.js'));check(path.join(folder,'viewer.js'));assert.ok(fs.existsSync(path.join(folder,'edit.html')));assert.ok(fs.existsSync(path.join(folder,'login.html')));
});

test('protected pages, media and project data require a real session; login remains accessible',async()=>{
 const env=testEnvironment(),worker=createWorker({'/index.html':asset('viewer'),'/edit.html':asset('editor'),'/login.html':asset('login')});
 assert.equal((await worker.fetch(new Request(origin+'/'),env)).headers.get('Location'),'/login');
 assert.equal(await (await worker.fetch(new Request(origin+'/login'),env)).text(),'login');
 for(const p of ['/default-content.json','/media/intro.mp4','/api/project','/studio.js'])assert.equal((await worker.fetch(new Request(origin+p),env)).status,401);
 assert.equal((await worker.fetch(new Request(origin+'/',{headers:{Cookie:'talacard_session='+ '0'.repeat(64)}}),env)).status,302);
 assert.equal((await worker.fetch(new Request(origin+'/'),{BUCKET:env.BUCKET})).status,503);
 const cookie=await signIn(worker,env),me=await (await worker.fetch(new Request(origin+'/api/auth/me',{headers:{Cookie:cookie}}),env)).json();assert.equal(me.role,'viewer');assert.ok(!('hash'in me));
 assert.equal((await worker.fetch(new Request(origin+'/',{headers:{Cookie:cookie}}),env)).headers.get('Cache-Control'),'private, no-store');
});

test('viewer cannot open the editor or write, upload, retry, or gain role through headers',async()=>{
 const env=testEnvironment(),worker=createWorker({'/edit.html':asset('editor')}),cookie=await signIn(worker,env);
 assert.equal((await worker.fetch(new Request(origin+'/edit.html',{headers:headers(cookie)}),env)).headers.get('Location'),'/');
 assert.equal((await worker.fetch(new Request(origin+'/studio.js',{headers:headers(cookie)}),env)).status,302);
 for(const [p,method] of [['/api/project','PUT'],['/api/media','POST'],['/api/sync/retry','POST'],['/api/sync/project','PUT']])assert.ok([401,403].includes((await worker.fetch(new Request(origin+p,{method,headers:{...headers(cookie),'X-Role':'editor','X-TalaCard-Studio':'1'},body:'{}'}),env)).status));
});

test('admin saves to durable storage with conflict protection and uploads actual media; viewer sees saved version after reload',async()=>{
 const env=testEnvironment(),p=project();await env.BUCKET.put('project/current.json',JSON.stringify(p),{customMetadata:{}});
 const worker=createWorker({'/edit.html':asset('editor')}),cookie=await signIn(worker,env,'editor'),viewer=await signIn(worker,env),req=(p,options={})=>worker.fetch(new Request(origin+p,{...options,headers:{...headers(cookie),...(p==='/api/media'&&options.body?{'X-Upload-Length':String(Buffer.byteLength(options.body))}:{}),...options.headers}}),env);
 assert.equal((await req('/edit.html')).status,200);
 const current=await (await req('/api/project')).json();assert.equal(current.storage,'cloud');
 p.decks[0].scenes[0].title='متن فارسی English';delete p.decks[0].scenes[0].titleRuns;
 const saved=await req('/api/project',{method:'PUT',body:JSON.stringify({project:p,revision:current.revision})});assert.equal(saved.status,200,await saved.clone().text());
 assert.equal((await req('/api/project',{method:'PUT',body:JSON.stringify({project:p,revision:current.revision})})).status,409);
 const reload=await worker.fetch(new Request(origin+'/default-content.json',{headers:{Cookie:viewer}}),env);assert.equal((await reload.json()).decks[0].scenes[0].title,'متن فارسی English');
 assert.equal((await worker.fetch(new Request(origin+'/api/project',{method:'PUT',headers:{Cookie:cookie,Origin:'https://other.test'},body:'{}'}),env)).status,403);
 const movie=Buffer.from('0000ftypisomMovie-data');
 const upload=await req('/api/media',{method:'POST',headers:{'Content-Type':'video/mp4'},body:movie});assert.equal(upload.status,201);const media=await upload.json();
 const range=await worker.fetch(new Request(origin+media.src,{headers:{Cookie:viewer,Range:'bytes=4-11'}}),env);assert.equal(range.status,206);assert.equal(await range.text(),'ftypisom');assert.equal(range.headers.get('Cache-Control'),'private, no-store');
 assert.equal((await req('/api/media',{method:'POST',headers:{'Content-Type':'video/mp4'},body:'not a real movie'})).status,400);
 assert.equal((await req('/api/media',{method:'POST',headers:{'Content-Type':'video/mp4','Content-Length':String(96*1024*1024)},body:'x'})).status,413);
});

test('logout, expiration and password rotation invalidate sessions; browser cookies stay HttpOnly and Secure',async()=>{
 const env=testEnvironment(),worker=createWorker();
 const login=await worker.fetch(new Request(origin+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'editor-test-password'})}),env);
 const set=login.headers.get('Set-Cookie');for(const flag of ['HttpOnly','Secure','SameSite=Strict','Path=/'])assert.ok(set.includes(flag));const cookie=set.split(';')[0],request=new Request(origin+'/api/auth/me',{headers:{Cookie:cookie}});
 assert.equal((await getSession(request,env)).role,'editor');assert.equal(await getSession(request,env,{now:Date.now()+9*60*60*1000}),null);
 const active=await signIn(worker,env);assert.equal((await worker.fetch(new Request(origin+'/api/auth/logout',{method:'POST',headers:headers(active)}),env)).status,200);assert.equal(await getSession(new Request(origin,{headers:{Cookie:active}}),env),null);
 const rotated=await signIn(worker,env);env.TALACARD_AUTH_ACCOUNTS=JSON.stringify(testAccounts.map(a=>({...a,hash:'a'.repeat(64)})));assert.equal(await getSession(new Request(origin,{headers:{Cookie:rotated}}),env),null);
});

test('login rejects cross-origin requests and throttles incorrect passwords with durable, concurrent counters',async()=>{
 const env=testEnvironment(),now=Date.now(),login=password=>new Request(origin+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password})});
 assert.equal((await handleAuth(new Request(origin+'/api/auth/login',{method:'POST',headers:{Origin:'https://other.test'},body:'{}'}),env)).status,403);
 const attempts=await Promise.all(Array.from({length:10},()=>handleAuth(login('wrong'),env,{now,ip:'test-ip'})));assert.equal(attempts.filter(r=>r.status===401).length,8);assert.equal(attempts.filter(r=>r.status===429).length,2);
 assert.equal((await handleAuth(login('editor-test-password'),env,{now,ip:'test-ip'})).status,429);
 assert.equal((await handleAuth(login('editor-test-password'),env,{now:now+16*60*1000,ip:'test-ip'})).status,200);
});

test('local studio uses the same viewer/admin boundary and persists authenticated sessions across requests',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tala-auth-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));for(const dir of ['.private','public/media'])fs.mkdirSync(path.join(root,dir),{recursive:true});
 fs.writeFileSync(path.join(root,'.private/auth.json'),JSON.stringify({accounts:testAccounts}));const p=project();fs.writeFileSync(path.join(root,'content.json'),JSON.stringify(p));for(const [name,text] of [['index.html','editor'],['viewer.html','viewer'],['login.html','login']])fs.writeFileSync(path.join(root,'public',name),text);
 const server=createApp(root);server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));const base='http://127.0.0.1:'+server.address().port;
 const login=async role=>{const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:role==='editor'?'admin':'viewer',password:role+'-test-password'})});assert.equal(r.status,200);return r.headers.get('Set-Cookie').split(';')[0]};
 assert.equal((await fetch(base+'/',{redirect:'manual'})).status,302);const viewer=await login('viewer');assert.equal(await(await fetch(base+'/',{headers:{Cookie:viewer}})).text(),'viewer');assert.equal((await fetch(base+'/api/project',{method:'PUT',headers:{Origin:base,Cookie:viewer,'X-TalaCard-Studio':'1'},body:'{}'})).status,403);
 const editor=await login('editor');assert.equal(await(await fetch(base+'/edit.html',{headers:{Cookie:editor}})).text(),'editor');const current=await(await fetch(base+'/api/project',{headers:{Cookie:editor}})).json();const saved=await fetch(base+'/api/project',{method:'PUT',headers:{Origin:base,Cookie:editor,'Content-Type':'application/json','X-TalaCard-Studio':'1'},body:JSON.stringify(current)});assert.equal(saved.status,200,await saved.clone().text());
 assert.equal((await fetch(base+'/api/auth/me',{headers:{Cookie:editor}})).status,200);
});
