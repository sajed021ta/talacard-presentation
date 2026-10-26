import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import {validateProject,projectMediaPaths} from './public/model.js';
import {ensureEditableProject} from './public/editor-model.js';
import { createCloudSync } from './cloud/sync.mjs';
import {localAuthEnvironment} from './cloud/local-auth.mjs';
import {handleAuth,getSession,authConfigured,LOGIN_ASSETS,EDITOR_ASSETS,loginRequired,sameOrigin} from './cloud/auth.js';
import {validMediaHeader} from './cloud/media.js';
import {serverConfig,clientAddress} from './server/config.mjs';
import {initializeData,atomicWrite,safeFile,syncDirectory} from './server/storage.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.ttf': 'font/ttf', '.pdf': 'application/pdf' };
const UPLOADS = new Map([['video/mp4', '.mp4'], ['video/webm', '.webm'], ['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'], ['image/gif', '.gif']]);
const revision = data => crypto.createHash('sha256').update(data).digest('hex');
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };

async function body(req, max) {
  const parts = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > max) { const e = new Error('حجم فایل بیشتر از حد مجاز است.'); e.status = 413; throw e; } parts.push(chunk); }
  return Buffer.concat(parts);
}

export function createApp(root = ROOT, options={}) {
  const config=serverConfig(root,options);
  const contentFile=config.selfHosted?initializeData(root,config.dataDir):path.join(root,'content.json');
  const mediaDir=config.selfHosted?path.join(config.dataDir,'media'):path.join(root,'public/media');
  let saveQueue = Promise.resolve();
  const independentStatus=()=>({enabled:true,status:'published',revision:revision(fs.readFileSync(contentFile)),storage:'self-hosted'});
  const sync=config.selfHosted?{status:independentStatus,schedule(){},close(){}}:createCloudSync(root);
  const server = http.createServer(async (req, res) => {
    try {
      const host = (req.headers.host || '').toLowerCase();
      if(!req.url.startsWith('/')||req.url.startsWith('//'))return json(res,400,{error:'نشانی معتبر نیست.'});
      const isHealth=config.selfHosted&&req.url.split('?')[0]==='/healthz';
      if(config.selfHosted?host!==config.publicUrl.host&&!(isHealth&&/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)):!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))return json(res,403,{error:'میزبان مجاز نیست.'});
      // The configured HTTPS origin, rather than untrusted forwarded headers,
      // controls cookies and CSRF when Caddy terminates TLS.
      const url = new URL(req.url,config.selfHosted?config.publicUrl.origin:`http://${host}`);
      let canonicalPath;try{canonicalPath=decodeURIComponent(url.pathname)}catch{return json(res,400,{error:'نشانی نامعتبر است.'})}
      if(canonicalPath.split('/').some(p=>p==='..'||p.startsWith('.'))||canonicalPath.includes('\\')||canonicalPath.includes('\0'))return json(res,403,{error:'مسیر مجاز نیست.'});
      url.pathname=canonicalPath;
      const auth=localAuthEnvironment(root,config.selfHosted?{accountsFile:config.accountsFile,storeDir:path.join(config.dataDir,'private/auth-store'),storage:'self-hosted',canonicalRoles:true,sessionSeconds:config.sessionSeconds}:{}),publicAsset=LOGIN_ASSETS.has(url.pathname);
      if(isHealth)return json(res,['GET','HEAD'].includes(req.method)?authConfigured(auth||{})?200:503:405,{status:authConfigured(auth||{})?'ok':'configuration-required'});
      const authRequest=new Request(url,{method:req.method,headers:req.headers,...(url.pathname.startsWith('/api/auth/')&&req.method==='POST'?{body:await body(req,4096)}:{})});
      const send=async response=>{res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))};
      if(url.pathname.startsWith('/api/auth/')){
        if(!auth&&!config.selfHosted)return json(res,url.pathname==='/api/auth/me'?200:404,url.pathname==='/api/auth/me'?{required:false,role:'editor',storage:'local'}:{error:'ورود فعال نیست.'});
        return send(await handleAuth(authRequest,auth||{},{ip:clientAddress(req,config)}));
      }
      if(config.selfHosted&&!publicAsset&&!authConfigured(auth||{}))return json(res,503,{error:'حساب‌های ورود هنوز پیکربندی نشده‌اند.'});
      if((auth||config.selfHosted)&&!publicAsset){
        const session=await getSession(authRequest,auth);if(!session)return send(loginRequired(authRequest));
        if(EDITOR_ASSETS.has(url.pathname)&&!['editor','admin'].includes(session.role)){res.writeHead(302,{Location:'/#home','Cache-Control':'no-store'});return res.end()}
        if(url.pathname.startsWith('/api/')&&!['editor','admin'].includes(session.role))return json(res,403,{error:'این حساب فقط اجازهٔ مشاهده دارد.'});
        if(!['GET','HEAD'].includes(req.method)&&!sameOrigin(authRequest))return json(res,403,{error:'مبدأ درخواست معتبر نیست.'});
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (req.headers.origin && req.headers.origin !== url.origin) return json(res, 403, { error: 'درخواست از این مبدأ مجاز نیست.' });
        if (req.headers['x-talacard-studio'] !== '1') return json(res, 403, { error: 'درخواست ویرایش معتبر نیست.' });
      }
      if (url.pathname === '/api/sync' && req.method === 'GET') return json(res, 200, sync.status());
      if (url.pathname === '/api/sync/retry' && req.method === 'POST') { sync.schedule(0); return json(res, 202, sync.status()); }
      if (url.pathname === '/api/project' && req.method === 'GET') {
        const data = fs.readFileSync(contentFile); return json(res, 200, { project: JSON.parse(data), revision: revision(data),...(config.selfHosted?{storage:'self-hosted'}:{}) });
      }
      if (url.pathname === '/api/project' && req.method === 'PUT') {
        let input;try{input=JSON.parse((await body(req,2*1024*1024)).toString());if(!input||typeof input!=='object')throw Error()}catch(e){if(e.status)throw e;const error=new Error('درخواست ذخیره معتبر نیست.');error.status=400;throw error}
        const {project,revision:expected}=input;
        try{ensureEditableProject(project);validateProject(project)}catch(e){e.status=400;throw e}
        // Serialize compare-and-write so two browser tabs cannot silently overwrite each other.
        const operation = saveQueue.then(() => {
          const current = fs.readFileSync(contentFile);
          if (expected !== revision(current)) { const e = new Error('پروژه در پنجرهٔ دیگری تغییر کرده است. ابتدا خروجی بگیرید و پروژه را دوباره بارگذاری کنید.'); e.status = 409; throw e; }
          for (const p of projectMediaPaths(project)) if (!safeFile(path.join(mediaDir,p.slice('/media/'.length)),mediaDir)){const e=new Error('یکی از رسانه‌ها روی دیسک پیدا نشد؛ فایل را دوباره انتخاب کنید.');e.status=400;throw e}
          const data = JSON.stringify(project, null, 2) + '\n';
          atomicWrite(config.selfHosted?path.join(config.dataDir,'private/content.previous.json'):path.join(root,'content.backup.json'),current);
          atomicWrite(contentFile,data);
          if(!config.selfHosted)atomicWrite(path.join(root,'public/default-content.json'),data);
          return revision(data);
        });
        saveQueue = operation.catch(() => {});
        const savedRevision = await operation; sync.schedule();
        return json(res, 200, { revision: savedRevision, sync:sync.status() });
      }
      if (url.pathname === '/api/media' && req.method === 'POST') {
        const type = (req.headers['content-type'] || '').split(';')[0];
        const ext = UPLOADS.get(type); if (!ext) return json(res, 415, { error: 'عکس PNG، JPG، WebP، GIF یا ویدیوی MP4 و WebM انتخاب کنید.' });
        const id = 'upload-' + crypto.randomUUID(); const name = id + ext;
        await saveUpload(req,path.join(mediaDir,name),type);
        return json(res, 201, { id, src: '/media/' + name, poster: type.startsWith('image/') ? '/media/' + name : '', type: type.startsWith('video/') ? 'video' : 'image' });
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'این روش پشتیبانی نمی‌شود.' });
      const decoded=canonicalPath;
      if (decoded.split('/').some(x => x === '..' || x.startsWith('.')) || decoded.includes('\\') || decoded.includes('\0')) return json(res, 403, { error: 'مسیر مجاز نیست.' });
      let file;
      let allowedRoot=path.join(root,'public');
      if (decoded.startsWith('/original/')){file=path.join(root,decoded);allowedRoot=path.join(root,'original')}
      else if (['/content.json','/default-content.json'].includes(decoded)){file=contentFile;allowedRoot=config.selfHosted?config.dataDir:root}
      else if(decoded.startsWith('/media/')){file=path.join(mediaDir,decoded.slice('/media/'.length));allowedRoot=mediaDir}
      else file = path.join(root, 'public', decoded==='/login'?'login.html':decoded==='/edit.html'?'index.html':['/','/index.html'].includes(decoded)?(auth||config.selfHosted?'viewer.html':'index.html'):decoded);
      if (!safeFile(file,allowedRoot) || !MIME[path.extname(file)]) return json(res, 404, { error: 'فایل پیدا نشد.' });
      const stat = fs.statSync(file); const headers = { 'Content-Type': MIME[path.extname(file)], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': auth&&!publicAsset?'private, no-store':'no-cache', 'Accept-Ranges': 'bytes', 'Referrer-Policy': 'same-origin' };
      if (!decoded.startsWith('/original/')) headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'";
      let start = 0, end = stat.size - 1, status = 200;
      if (req.headers.range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (!m || (!m[1] && !m[2])) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); return res.end(); }
        if (!m[1]) start = Math.max(0, stat.size - Number(m[2]));
        else { start = Number(m[1]); if (m[2]) end = Math.min(end, Number(m[2])); }
        if (start > end || start >= stat.size) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); return res.end(); }
        status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      }
      headers['Content-Length'] = end - start + 1; res.writeHead(status, headers);
      if (req.method === 'HEAD') return res.end();
      const stream = fs.createReadStream(file, { start, end }); stream.on('error', () => res.destroy()); stream.pipe(res);
    } catch (e) { if (!res.headersSent) json(res, e.status || (config.selfHosted?500:400), { error:config.selfHosted&&!e.status?'درخواست انجام نشد.':e.message||'درخواست انجام نشد.' }); else res.destroy(); }
  });
  server.on('close', () => sync.close());
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config=serverConfig(ROOT),server=createApp();
  server.requestTimeout=300000;server.headersTimeout=60000;
  server.listen(config.port,config.host,()=>console.log(`TalaCard ${config.selfHosted?'self-hosted':'local'} server listening on ${config.host}:${config.port}`));
  const stop=()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),25000).unref()};process.on('SIGTERM',stop);process.on('SIGINT',stop);
}

async function saveUpload(req,target,type){
 const max=95*1024*1024;if(Number(req.headers['content-length'])>max){const e=new Error('حجم فایل بیشتر از حد مجاز است.');e.status=413;throw e}
 fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o750});const temp=target+'.tmp-'+crypto.randomUUID();let fd,total=0,header=Buffer.alloc(0);
 try{fd=fs.openSync(temp,'wx',0o640);for await(const chunk of req){total+=chunk.length;if(total>max){const e=new Error('حجم فایل بیشتر از حد مجاز است.');e.status=413;throw e}if(header.length<12)header=Buffer.concat([header,chunk.subarray(0,12-header.length)]);fs.writeFileSync(fd,chunk)}
  if(!total||!validMediaHeader(header,type)){const e=new Error('محتوای فایل با نوع انتخاب‌شده مطابقت ندارد.');e.status=400;throw e}
  fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(temp,target);syncDirectory(path.dirname(target));
 }finally{if(fd!==undefined)fs.closeSync(fd);fs.rmSync(temp,{force:true})}
}
