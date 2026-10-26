import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {proxyRequest} from '../tests/helpers/proxy.mjs';
import {testAccounts} from '../tests/helpers/auth.mjs';
const id='talacard-test-'+crypto.randomBytes(6).toString('hex'),volume=id+'-data',image=id+':initial',rebuilt=id+':rebuilt',origin='https://presentation.test';let container;
const docker=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',...options}).trim();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function launch(tag){container=docker(['run','-d','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges:true','--init','-e','TALACARD_PUBLIC_URL='+origin,'-v',volume+':/data','-p','127.0.0.1::4187',tag]);const port=docker(['port',container,'4187/tcp']).split(':').at(-1);const request=(p,opts)=>proxyRequest('http://127.0.0.1:'+port,origin,p,opts);for(let i=0;i<120;i++){try{if((await request('/healthz')).status===200)return request}catch{}await pause(1000)}throw Error('Container readiness failed: '+docker(['logs',container]))}
async function signIn(request,role){const response=await request('/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:role==='editor'?'admin':'viewer',password:role+'-test-password'})});assert.equal(response.status,200,await response.clone().text());return response.headers.get('Set-Cookie').split(';')[0]}
try{
 docker(['info'],{stdio:'ignore'});docker(['build','-t',image,'.'],{stdio:'inherit'});docker(['volume','create',volume]);
 docker(['run','--rm','-i','-v',volume+':/data',image,'node','scripts/accounts.mjs','import-hashes','--stdin'],{input:JSON.stringify({accounts:testAccounts})});
 let request=await launch(image);assert.equal((await request('/')).status,302);assert.equal((await request('/default-content.json')).status,401);
 const admin=await signIn(request,'editor'),viewer=await signIn(request,'viewer'),headers={Cookie:admin,Origin:origin,'Content-Type':'application/json','X-TalaCard-Studio':'1'};
 assert.equal((await request('/api/project',{method:'PUT',headers:{...headers,Cookie:viewer},body:'{}'})).status,403);assert.equal((await request('/index.html',{headers:{Cookie:viewer}})).status,200);assert.equal((await request('/edit.html',{headers:{Cookie:viewer}})).status,302);
 const movie=Buffer.from('0000ftypisomDocker persistent video'),upload=await request('/api/media',{method:'POST',headers:{...headers,'Content-Type':'video/mp4'},body:movie});assert.equal(upload.status,201);const media=await upload.json();
 const current=await(await request('/api/project',{headers})).json();current.project.decks[0].scenes[0].title='Persistent Docker test';delete current.project.decks[0].scenes[0].titleRuns;delete current.project.editor;current.project.decks[0].scenes[0].media=media.src;
 const save=await request('/api/project',{method:'PUT',headers,body:JSON.stringify(current)});assert.equal(save.status,200,await save.clone().text());
 docker(['restart',container]);for(let i=0;i<60;i++){try{if((await request('/healthz')).status===200)break}catch{}await pause(1000)}assert.equal((await request('/api/auth/me',{headers})).status,200);
 docker(['stop',container]);docker(['rm',container]);container=undefined;
 docker(['build','-t',rebuilt,'.'],{stdio:'inherit'});request=await launch(rebuilt);
 assert.equal((await request('/api/auth/me',{headers})).status,200);
 const project=await(await request('/default-content.json',{headers:{Cookie:viewer}})).json();assert.equal(project.decks[0].scenes[0].title,'Persistent Docker test');
 const range=await request(media.src,{headers:{Cookie:viewer,Range:'bytes=4-11'}});assert.equal(range.status,206);assert.equal(await range.text(),'ftypisom');
 assert.equal((await request('/api/auth/logout',{method:'POST',headers:{Cookie:viewer,Origin:origin}})).status,200);assert.equal((await request('/api/auth/me',{headers:{Cookie:viewer}})).status,401);
 docker(['exec',container,'node','--input-type=module','-e',"import fs from 'node:fs';const dir='/data/private/auth-store';for(const name of fs.readdirSync(dir).filter(n=>n.startsWith('sessions-'))){const file=dir+'/'+name,value=JSON.parse(fs.readFileSync(file));fs.writeFileSync(file,JSON.stringify({...value,expires:0}))}"]);
 assert.equal((await request('/api/auth/me',{headers})).status,401);console.log('PASS: Docker login, authorization, uploads, save/reload, restart, rebuild, logout and expiration.');
}catch(error){console.error(error.message);process.exitCode=1}
finally{
 if(container)try{docker(['rm','-f',container],{stdio:'ignore'})}catch{}
 try{docker(['volume','rm',volume],{stdio:'ignore'})}catch{}
 for(const tag of [image,rebuilt])try{docker(['image','rm',tag],{stdio:'ignore'})}catch{}
}
