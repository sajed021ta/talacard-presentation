import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { validateProject } from './public/model.js';
import { createCloudSync } from './cloud/sync.mjs';

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

export function createApp(root = ROOT) {
  let saveQueue = Promise.resolve();
  const sync = createCloudSync(root);
  const server = http.createServer(async (req, res) => {
    try {
      const host = req.headers.host || '';
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return json(res, 403, { error: 'فقط دسترسی محلی مجاز است.' });
      const url = new URL(req.url, `http://${host}`);
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (req.headers.origin && req.headers.origin !== `http://${host}`) return json(res, 403, { error: 'درخواست از این مبدأ مجاز نیست.' });
        if (req.headers['x-talacard-studio'] !== '1') return json(res, 403, { error: 'درخواست ویرایش معتبر نیست.' });
      }
      const contentFile = path.join(root, 'content.json');
      if (url.pathname === '/api/sync' && req.method === 'GET') return json(res, 200, sync.status());
      if (url.pathname === '/api/sync/retry' && req.method === 'POST') { sync.schedule(0); return json(res, 202, sync.status()); }
      if (url.pathname === '/api/project' && req.method === 'GET') {
        const data = fs.readFileSync(contentFile); return json(res, 200, { project: JSON.parse(data), revision: revision(data) });
      }
      if (url.pathname === '/api/project' && req.method === 'PUT') {
        const { project, revision: expected } = JSON.parse((await body(req, 2 * 1024 * 1024)).toString());
        validateProject(project);
        // Serialize compare-and-write so two browser tabs cannot silently overwrite each other.
        const operation = saveQueue.then(() => {
          const current = fs.readFileSync(contentFile);
          if (expected !== revision(current)) { const e = new Error('پروژه در پنجرهٔ دیگری تغییر کرده است. ابتدا خروجی بگیرید و پروژه را دوباره بارگذاری کنید.'); e.status = 409; throw e; }
          for (const d of project.decks) for (const s of d.scenes) for (const p of [s.media, s.poster]) if (p && !fs.existsSync(path.join(root, 'public', p))) throw new Error('یکی از رسانه‌ها روی دیسک پیدا نشد؛ فایل را دوباره انتخاب کنید.');
          const data = JSON.stringify(project, null, 2) + '\n';
          fs.writeFileSync(path.join(root, 'content.backup.json'), current);
          fs.writeFileSync(contentFile + '.tmp', data); fs.renameSync(contentFile + '.tmp', contentFile);
          fs.writeFileSync(path.join(root, 'public/default-content.json.tmp'), data); fs.renameSync(path.join(root, 'public/default-content.json.tmp'), path.join(root, 'public/default-content.json'));
          return revision(data);
        });
        saveQueue = operation.catch(() => {});
        const savedRevision = await operation; sync.schedule();
        return json(res, 200, { revision: savedRevision, sync:sync.status() });
      }
      if (url.pathname === '/api/media' && req.method === 'POST') {
        const type = (req.headers['content-type'] || '').split(';')[0];
        const ext = UPLOADS.get(type); if (!ext) return json(res, 415, { error: 'عکس PNG، JPG، WebP، GIF یا ویدیوی MP4 و WebM انتخاب کنید.' });
        const data = await body(req, 95 * 1024 * 1024);
        if (!data.length) throw new Error('فایل خالی است.');
        const valid = ext === '.mp4' ? data.subarray(4, 8).toString() === 'ftyp' : ext === '.webm' ? data.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) : ext === '.jpg' ? data[0] === 0xff && data[1] === 0xd8 : ext === '.png' ? data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : ext === '.gif' ? /^GIF8[79]a$/.test(data.subarray(0, 6).toString()) : data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
        if (!valid) throw new Error('محتوای فایل با نوع انتخاب‌شده مطابقت ندارد.');
        const id = 'upload-' + crypto.randomUUID(); const name = id + ext;
        fs.writeFileSync(path.join(root, 'public/media', name), data, { flag: 'wx' });
        return json(res, 201, { id, src: '/media/' + name, poster: type.startsWith('image/') ? '/media/' + name : '', type: type.startsWith('video/') ? 'video' : 'image' });
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'این روش پشتیبانی نمی‌شود.' });
      let decoded; try { decoded = decodeURIComponent(url.pathname); } catch { return json(res, 400, { error: 'نشانی نامعتبر است.' }); }
      if (decoded.split('/').some(x => x === '..' || x.startsWith('.')) || decoded.includes('\\') || decoded.includes('\0')) return json(res, 403, { error: 'مسیر مجاز نیست.' });
      let file;
      if (decoded.startsWith('/original/')) file = path.join(root, decoded);
      else if (decoded === '/content.json') file = contentFile;
      else file = path.join(root, 'public', decoded === '/' ? 'index.html' : decoded);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile() || !MIME[path.extname(file)]) return json(res, 404, { error: 'فایل پیدا نشد.' });
      const stat = fs.statSync(file); const headers = { 'Content-Type': MIME[path.extname(file)], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes', 'Referrer-Policy': 'same-origin' };
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
    } catch (e) { if (!res.headersSent) json(res, e.status || 400, { error: e.message || 'درخواست انجام نشد.' }); else res.destroy(); }
  });
  server.on('close', () => sync.close());
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.TALACARD_PORT || 4177);
  createApp().listen(port, '127.0.0.1', () => console.log(`TalaCard Studio: http://127.0.0.1:${port}/#edit`));
}
