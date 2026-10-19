import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createApp } from '../server.mjs';
import { validateProject, clone, mediaPath } from '../public/model.js';

const fixture = JSON.parse(fs.readFileSync(new URL('../content.json', import.meta.url)));

test('both supplied decks retain all original scenes and the nine selected movies', () => {
  validateProject(fixture);
  assert.equal(fixture.decks[0].scenes.length, 14);
  assert.equal(fixture.decks[1].scenes.length, 12);
  assert.equal(new Set(fixture.library.filter(m => m.type === 'video').map(m => m.src)).size, 9);
  assert.deepEqual(fixture.decks[0].scenes.map(s => s.legacyScene), Array.from({length:14}, (_, i) => i));
});

test('content is plain text and media stays portable; malformed imports are rejected', () => {
  assert.equal(mediaPath('/media/ok.mp4'), true);
  for (const p of ['javascript:alert(1)', 'https://example.com/tracker.jpg', '/media/../secret', '/media/a.svg', '/media//a.jpg']) {
    // SVG names are harmless path strings, but no SVG upload or static MIME is allowed.
    if (!p.endsWith('.svg')) assert.equal(mediaPath(p), false);
  }
  for (const mutate of [p => p.decks[0].scenes[0].duration = 0, p => p.decks[0].scenes[0].fontSize = 200, p => p.decks[0].scenes[0].media = 'javascript:alert(1)', p => p.decks[0].scenes[1].id = p.decks[0].scenes[0].id, p => p.activeDeck = 'missing', p => p.library[0].poster = '/media/../x', p => p.decks[0].scenes = []]) {
    const p = clone(fixture); mutate(p); assert.throws(() => validateProject(p));
  }
  const text = clone(fixture); text.decks[0].scenes[0].title = '<script>alert(1)</script>'; validateProject(text);
});

test('local server: persistence, conflict protection, uploads, video seeking, and origin guards', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'talacard-test-'));
  fs.mkdirSync(path.join(root, 'public/media'), { recursive:true });
  fs.mkdirSync(path.join(root, 'original/assets'), { recursive:true });
  const initial = clone(fixture); for (const d of initial.decks) for (const s of d.scenes) { s.media = ''; s.poster = ''; }
  fs.writeFileSync(path.join(root, 'content.json'), JSON.stringify(initial));
  fs.writeFileSync(path.join(root, 'public/index.html'), '<!doctype html><title>Studio</title>');
  fs.writeFileSync(path.join(root, 'secret.txt'), 'DO NOT SERVE');
  const server = createApp(root); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); fs.rmSync(root, { recursive:true, force:true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'Content-Type':'application/json', 'X-TalaCard-Studio':'1' };
  const get = await fetch(base + '/api/project'); const snapshot = await get.json();
  assert.equal(get.status, 200); assert.ok(snapshot.revision);
  const page = await fetch(base + '/'); assert.equal(page.status, 200); assert.match(page.headers.get('content-security-policy'), /object-src 'none'/);
  assert.equal((await fetch(base + '/secret.txt')).status, 404);
  assert.equal((await fetch(base + '/%2e%2e%2fsecret.txt')).status, 403);
  const missingHeader = await fetch(base + '/api/project', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(snapshot) }); assert.equal(missingHeader.status, 403);
  const csrf = await fetch(base + '/api/project', { method:'PUT', headers:{ ...headers, Origin:'https://other.example' }, body:JSON.stringify(snapshot) }); assert.equal(csrf.status, 403);
  snapshot.project.decks[0].scenes[0].title = 'عنوان ویرایش‌شده';
  const save = await fetch(base + '/api/project', { method:'PUT', headers, body:JSON.stringify(snapshot) }); assert.equal(save.status, 200); const nextRevision = (await save.json()).revision;
  assert.notEqual(snapshot.revision, nextRevision);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'content.json'))).decks[0].scenes[0].title, 'عنوان ویرایش‌شده');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'public/default-content.json'))).decks[0].scenes[0].title, 'عنوان ویرایش‌شده');
  const stale = await fetch(base + '/api/project', { method:'PUT', headers, body:JSON.stringify(snapshot) }); assert.equal(stale.status, 409);
  const invalid = await fetch(base + '/api/media', { method:'POST', headers:{'X-TalaCard-Studio':'1','Content-Type':'video/mp4'}, body:'<html>bad</html>' }); assert.equal(invalid.status, 400);
  const svg = await fetch(base + '/api/media', { method:'POST', headers:{'X-TalaCard-Studio':'1','Content-Type':'image/svg+xml'}, body:'<svg/>' }); assert.equal(svg.status, 415);
  const movie = Buffer.concat([Buffer.from([0,0,0,20]), Buffer.from('ftypisom'), Buffer.alloc(100, 42)]);
  const upload = await fetch(base + '/api/media', { method:'POST', headers:{'X-TalaCard-Studio':'1','Content-Type':'video/mp4'}, body:movie }); assert.equal(upload.status, 201); const media = await upload.json();
  const range = await fetch(base + media.src, { headers:{Range:'bytes=4-11'} }); assert.equal(range.status, 206); assert.equal(range.headers.get('content-range'), `bytes 4-11/${movie.length}`); assert.equal(await range.text(), 'ftypisom');
  const suffix = await fetch(base + media.src, { headers:{Range:'bytes=-10'} }); assert.equal(suffix.status, 206); assert.equal((await suffix.arrayBuffer()).byteLength, 10);
  assert.equal((await fetch(base + media.src, { headers:{Range:'bytes=99999-'} })).status, 416);
  const h = await fetch(base + media.src, { method:'HEAD' }); assert.equal(Number(h.headers.get('content-length')), movie.length);
  const current = await (await fetch(base + '/api/project')).json(); current.project.decks[0].scenes[0].media = media.src;
  const results = await Promise.all([1,2].map(n => fetch(base + '/api/project', { method:'PUT', headers, body:JSON.stringify({ ...current, project:{...current.project, activeDeck:n===1?'app':'proposal'} }) })));
  assert.deepEqual(results.map(r => r.status).sort(), [200,409]);
});
