import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createApp} from '../server.mjs';
import {serverConfig,clientAddress} from '../server/config.mjs';
import {initializeData,digest} from '../server/storage.mjs';
import {importAccounts} from '../scripts/accounts.mjs';
import {importContent,backupData,restoreData} from '../scripts/data.mjs';
import {testAccounts} from './helpers/auth.mjs';
import {proxyRequest} from './helpers/proxy.mjs';
const PUBLIC='https://presentation.example.test';
function fixture(t){const folder=fs.mkdtempSync(path.join(os.tmpdir(),'talacard-selfhost-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));const root=path.join(folder,'source'),data=path.join(folder,'persistent');fs.mkdirSync(path.join(root,'public/media'),{recursive:true});const project=JSON.parse(fs.readFileSync(new URL('../content.json',import.meta.url)));for(const d of project.decks)for(const s of d.scenes){s.media='';s.poster='';delete s.mediaItems}project.homeCards={};delete project.editor;fs.writeFileSync(path.join(root,'content.json'),JSON.stringify(project));for(const [name,body] of [['index.html','editor page'],['viewer.html','viewer page'],['login.html','login form'],['studio.js','editor source']])fs.writeFileSync(path.join(root,'public',name),body);return {folder,root,data,project}}
async function start(root,data,options={}){const server=createApp(root,{mode:'self-hosted',dataDir:data,publicUrl:PUBLIC,...options});server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;return {server,close:()=>new Promise(r=>server.close(r)),request:(p,opts={})=>proxyRequest(base,PUBLIC,p,opts)}}
async function login(app,role='editor'){const response=await app.request('/api/auth/login',{method:'POST',headers:{Origin:PUBLIC,'Content-Type':'application/json'},body:JSON.stringify({username:role==='editor'?'admin':'viewer',password:role+'-test-password'})});assert.equal(response.status,200,await response.clone().text());return {cookie:response.headers.get('Set-Cookie').split(';')[0],response}}
function provision(data){const file=path.join(data,'private/accounts.json');importAccounts({accounts:testAccounts},{file});return file}

test('self-hosted mode fails closed without accounts and never starts cloud synchronization',async t=>{
 const f=fixture(t),old=globalThis.fetch;let outbound=0;globalThis.fetch=()=>{outbound++;throw Error('Outbound calls forbidden')};t.after(()=>{globalThis.fetch=old});
 // A legacy cloud configuration must have no effect in independent mode.
 fs.mkdirSync(path.join(f.root,'.private'));fs.writeFileSync(path.join(f.root,'.private/cloud.json'),JSON.stringify({url:'https://should-not-be-contacted.invalid',token:'synthetic-test-token'}));
 const app=await start(f.root,f.data);t.after(app.close);
 assert.equal((await app.request('/login')).status,200);for(const p of ['/','/api/auth/me','/api/project','/default-content.json'])assert.equal((await app.request(p)).status,503);
 assert.equal(outbound,0);assert.ok(!fs.existsSync(path.join(f.data,'private/accounts.json')));
});

test('Caddy HTTPS origin enforces Secure cookies, host validation, CSRF and viewer/admin boundaries',async t=>{
 const f=fixture(t);provision(f.data);const app=await start(f.root,f.data,{trustProxy:true});t.after(app.close);
 assert.equal((await app.request('/')).status,302);assert.equal((await app.request('/api/auth/me')).status,401);assert.equal((await app.request('/default-content.json')).status,401);
 assert.equal((await app.request('/',{headers:{Host:'attacker.test'}})).status,403);
 const admin=await login(app);assert.ok(admin.response.headers.get('Set-Cookie').includes('; Secure'));assert.equal((await admin.response.json()).role,'admin');
 const viewer=await login(app,'viewer'),headers={Cookie:viewer.cookie};assert.equal(await(await app.request('/index.html',{headers})).text(),'viewer page');assert.equal((await app.request('/edit.html',{headers})).status,302);
 for(const p of ['/%65dit.html','/st%75dio.js'])assert.equal((await app.request(p,{headers})).status,302);
 for(const p of ['/%2565dit.html','/st%2575dio.js'])assert.notEqual((await app.request(p,{headers})).status,200);
 for(const p of ['/api/project','/api/media','/api/sync/retry'])assert.equal((await app.request(p,{method:'POST',headers:{...headers,Origin:PUBLIC,'X-TalaCard-Studio':'1','X-Role':'admin'},body:'{}'})).status,403);
 assert.equal((await app.request('/api/project',{method:'PUT',headers:{Cookie:admin.cookie,Origin:'http://presentation.example.test','X-TalaCard-Studio':'1'},body:'{}'})).status,403);
 for(const p of ['/private/accounts.json','/data/private/accounts.json','/.private/auth.json','/media/%2e%2e%2fprivate/accounts.json'])assert.notEqual((await app.request(p,{headers:{Cookie:admin.cookie}})).status,200);
 assert.equal((await app.request('/api/project',{headers:{Cookie:admin.cookie}})).status,200);
 assert.equal((await app.request('/api/project',{method:'PUT',headers:{Cookie:admin.cookie,Origin:PUBLIC,'X-TalaCard-Studio':'1'},body:'{bad json'})).status,400);
 const revoked=await app.request('/api/auth/logout',{method:'POST',headers:{Cookie:viewer.cookie,Origin:PUBLIC}});assert.equal(revoked.status,200);assert.equal((await app.request('/api/auth/me',{headers})).status,401);
});

test('content, media, accounts and sessions survive restart and a changed source release',async t=>{
 const f=fixture(t),accounts=provision(f.data),accountBytes=fs.readFileSync(accounts);let app=await start(f.root,f.data);let active=true;t.after(async()=>{if(active)await app.close()});
 const admin=await login(app),viewer=await login(app,'viewer'),headers={Cookie:admin.cookie,Origin:PUBLIC,'X-TalaCard-Studio':'1','Content-Type':'application/json'};
 const first=await(await app.request('/api/project',{headers})).json(),movie=Buffer.from('0000ftypisomIndependent media bytes');
 const upload=await app.request('/api/media',{method:'POST',headers:{...headers,'Content-Type':'video/mp4'},body:movie});assert.equal(upload.status,201);const media=await upload.json();
 const p=first.project;p.decks[0].scenes[0].title='ماندگار فارسی English';p.decks[0].scenes[0].media=media.src;delete p.decks[0].scenes[0].titleRuns;delete p.editor;
 const saved=await app.request('/api/project',{method:'PUT',headers,body:JSON.stringify({project:p,revision:first.revision})});assert.equal(saved.status,200,await saved.clone().text());
 assert.equal((await app.request('/api/project',{method:'PUT',headers,body:JSON.stringify({project:p,revision:first.revision})})).status,409);
 assert.notEqual(fs.readFileSync(path.join(f.root,'content.json'),'utf8'),fs.readFileSync(path.join(f.data,'content.json'),'utf8'));
 await app.close();active=false;const rebuilt=path.join(f.folder,'rebuilt-source');fs.cpSync(f.root,rebuilt,{recursive:true});const newSeed=structuredClone(f.project);newSeed.decks[0].scenes[0].title='new image default must not replace saved data';fs.writeFileSync(path.join(rebuilt,'content.json'),JSON.stringify(newSeed));
 app=await start(rebuilt,f.data);active=true;
 const me=await(await app.request('/api/auth/me',{headers})).json();assert.equal(me.role,'admin');assert.equal(me.storage,'self-hosted');
 const loaded=await(await app.request('/default-content.json',{headers:{Cookie:viewer.cookie}})).json();assert.equal(loaded.decks[0].scenes[0].title,'ماندگار فارسی English');
 const range=await app.request(media.src,{headers:{Cookie:viewer.cookie,Range:'bytes=4-11'}});assert.equal(range.status,206);assert.equal(await range.text(),'ftypisom');assert.deepEqual(fs.readFileSync(accounts),accountBytes);
 assert.equal((await(await app.request('/api/sync',{headers})).json()).storage,'self-hosted');
 const sessionDir=path.join(f.data,'private/auth-store');for(const name of fs.readdirSync(sessionDir).filter(n=>n.startsWith('sessions-'))){const file=path.join(sessionDir,name),value=JSON.parse(fs.readFileSync(file));fs.writeFileSync(file,JSON.stringify({...value,expires:Date.now()-1}))}
 assert.equal((await app.request('/api/auth/me',{headers})).status,401);
});

test('existing hash import is exact and cannot replace accounts; supplied passwords keep the same login',async t=>{
 const f=fixture(t),file=path.join(f.data,'private/accounts.json');importAccounts({accounts:testAccounts},{file});const original=fs.readFileSync(file);assert.throws(()=>importAccounts({accounts:testAccounts},{file}),/already exist/);assert.deepEqual(fs.readFileSync(file),original);assert.deepEqual(JSON.parse(original).accounts,testAccounts);
 const other=path.join(f.folder,'password-data'),destination=path.join(other,'private/accounts.json');importAccounts({accounts:[{username:'fixture_admin',role:'admin',password:'same-password-kept'}]},{file:destination,passwords:true});const stored=JSON.parse(fs.readFileSync(destination));assert.ok(stored.accounts[0].iterations>=600000);assert.ok(!fs.readFileSync(destination,'utf8').includes('same-password-kept'));
 const app=await start(f.root,other);t.after(app.close);const r=await app.request('/api/auth/login',{method:'POST',headers:{Origin:PUBLIC,'Content-Type':'application/json'},body:JSON.stringify({username:'fixture_admin',password:'same-password-kept'})});assert.equal(r.status,200);
});

test('old static content imports without overwriting data; verified backups restore into empty storage only',t=>{
 const f=fixture(t),legacy=path.join(f.folder,'old-nginx'),media=Buffer.from('0000ftypisomold custom bytes');fs.mkdirSync(path.join(legacy,'media'),{recursive:true});
 const p=structuredClone(f.project);p.decks[0].scenes[0].media='/media/custom.mp4';fs.writeFileSync(path.join(legacy,'default-content.json'),JSON.stringify(p));fs.writeFileSync(path.join(legacy,'media/custom.mp4'),media);fs.writeFileSync(path.join(f.root,'public/media/custom.mp4'),'different seed');
 provision(f.data);importContent(legacy,f.data,{seedRoot:f.root});initializeData(f.root,f.data);assert.deepEqual(fs.readFileSync(path.join(f.data,'media/custom.mp4')),media);assert.throws(()=>importContent(legacy,f.data,{seedRoot:f.root}),/already exists/);
 const collision=path.join(f.folder,'partial-import');fs.mkdirSync(path.join(collision,'media'),{recursive:true});fs.writeFileSync(path.join(collision,'media/custom.mp4'),'preserve existing bytes');assert.throws(()=>importContent(legacy,collision,{seedRoot:f.root}),/collision/);assert.equal(fs.readFileSync(path.join(collision,'media/custom.mp4'),'utf8'),'preserve existing bytes');assert.equal(fs.existsSync(path.join(collision,'content.json')),false);
 const backup=path.join(f.folder,'snapshot');backupData(f.data,backup);const restored=path.join(f.folder,'restored');restoreData(backup,restored);assert.equal(digest(fs.readFileSync(path.join(restored,'content.json'))),digest(fs.readFileSync(path.join(f.data,'content.json'))));assert.deepEqual(fs.readFileSync(path.join(restored,'private/accounts.json')),fs.readFileSync(path.join(f.data,'private/accounts.json')));assert.throws(()=>restoreData(backup,restored),/empty/);
 fs.appendFileSync(path.join(backup,'content.json'),'corrupt');assert.throws(()=>restoreData(backup,path.join(f.folder,'bad-restore')),/checksum/);
 fs.unlinkSync(path.join(f.data,'content.json'));assert.throws(()=>initializeData(f.root,f.data),/restore a backup/);
});

test('proxy address selection ignores spoofed headers from untrusted peers and never downgrades HTTPS',()=>{
 const c=serverConfig('/app',{mode:'self-hosted',dataDir:'/data',publicUrl:PUBLIC,trustProxy:true,trustedProxies:'127.0.0.1/32'});
 assert.equal(clientAddress({socket:{remoteAddress:'198.51.100.9'},headers:{'x-forwarded-for':'203.0.113.1'}},c),'198.51.100.9');
 assert.equal(clientAddress({socket:{remoteAddress:'127.0.0.1'},headers:{'x-forwarded-for':'spoofed, 203.0.113.2'}},c),'203.0.113.2');
 assert.throws(()=>serverConfig('/app',{mode:'self-hosted',publicUrl:'http://presentation.example.test'}),/HTTPS/);
 assert.throws(()=>serverConfig('/app',{mode:'self-hosted',publicUrl:PUBLIC,dataDir:'/app/original/data'}),/outside/);
 assert.throws(()=>serverConfig('/app',{mode:'self-hosted',publicUrl:PUBLIC,dataDir:'/data',accountsFile:'/data/media/accounts.json'}),/served asset/);
});
