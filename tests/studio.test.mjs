import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createApp } from '../server.mjs';
import { validateProject, clone, mediaPath } from '../public/model.js';
import {syncProjectEditor} from '../public/editor-model.js';

const fixture = JSON.parse(fs.readFileSync(new URL('../content.json', import.meta.url)));

test('all current decks retain editable scenes and the nine selected movies', () => {
  validateProject(fixture);
  assert.ok(fixture.decks[0].scenes.length>=14);
  assert.ok(fixture.decks[1].scenes.length >= 12);
  const supplied = JSON.parse(fs.readFileSync(new URL('../ASSETS.json', import.meta.url))).filter(m => m.path.endsWith('.mp4')).map(m => '/' + m.path.replace(/^public\//,''));
  assert.equal(supplied.length, 9);
  const available = new Set(fixture.library.filter(m => m.type === 'video').map(m => m.src));
  assert.ok(supplied.every(src => available.has(src)), 'supplied films remain available alongside owner uploads');
  assert.equal(fixture.decks.length,4);for(const deck of fixture.decks){assert.ok(deck.scenes.length);assert.equal(new Set(deck.scenes.map(scene=>scene.id)).size,deck.scenes.length)}
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
  const text = clone(fixture); delete text.decks[0].scenes[0].titleRuns; text.decks[0].scenes[0].title = '<script>alert(1)</script>'; validateProject(text);
});

test('local server: persistence, conflict protection, uploads, video seeking, and origin guards', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'talacard-test-'));
  fs.mkdirSync(path.join(root, 'public/media'), { recursive:true });
  fs.mkdirSync(path.join(root, 'original/assets'), { recursive:true });
  const initial = clone(fixture); for (const d of initial.decks) for (const s of d.scenes) { s.media = ''; s.poster = ''; s.mediaItems=[]; } initial.homeCards={};
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
  delete snapshot.project.decks[0].scenes[0].titleRuns; snapshot.project.decks[0].scenes[0].title = 'عنوان ویرایش‌شده';
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

test('scene geometry accepts portable device layouts and rejects off-canvas or invalid boxes', async () => {
  const {adjustBox} = await import('../public/placement.js');
  const p=clone(fixture), s=p.decks[1].scenes[0];
  s.placement={desktop:{copy:{x:55,y:15,w:40,h:30},media:{x:5,y:10,w:45,h:80}},compact:{copy:{x:5,y:5,w:90,h:35}}};
  validateProject(p);
  for(const bad of [{x:-1,y:0,w:10,h:10},{x:90,y:0,w:20,h:10},{x:0,y:0,w:NaN,h:10},{x:0,y:0,w:7,h:10}]) {
    s.placement.desktop.copy=bad;assert.throws(()=>validateProject(p));
  }
  assert.deepEqual(adjustBox({x:5,y:10,w:40,h:50},-30,90),{x:0,y:50,w:40,h:50});
  assert.deepEqual(adjustBox({x:5,y:10,w:40,h:50},90,-90,true),{x:5,y:10,w:95,h:8});
  const serialized=clone(fixture);serialized.decks[0].scenes[0].placement={desktop:{copy:{x:5,y:10,w:40,h:50}}};
  validateProject(JSON.parse(JSON.stringify(serialized)));
});

test('text movement snaps to an 8px grid and smart guides, while Shift disables both',async()=>{
  const {snapTextMove}=await import('../public/placement.js'),viewport={width:800,height:600};
  const grid=snapTextMove({x:13.1,y:16.1,w:20,h:20},[],viewport);
  assert.equal(grid.box.x,13);assert.equal(grid.box.y,16);assert.deepEqual(grid.guides,[]);
  const guided=snapTextMove({x:10.1,y:20,w:20,h:20},[{x:30.5,y:60,w:15,h:15}],viewport);
  assert.equal(guided.box.x,10.5);assert.deepEqual(guided.guides,[{axis:'x',position:30.5}]);
  const free=snapTextMove({x:13.1,y:16.1,w:20,h:20},[{x:30.5,y:60,w:15,h:15}],viewport,{},true);
  assert.deepEqual(free,{box:{x:13.1,y:16.1,w:20,h:20},guides:[]});
});

test('media movement stays free and aspect-preserving resize is opt-in',async()=>{
  const {adjustBox,resizeBox}=await import('../public/placement.js');
  const start={x:10,y:10,w:32,h:18},free=adjustBox(start,1.237,2.643);
  assert.deepEqual(free,{x:11.237,y:12.643,w:32,h:18});
  const unconstrained=resizeBox(start,8,2,false);assert.deepEqual(unconstrained,{x:10,y:10,w:40,h:20});
  const constrained=resizeBox(start,8,2,true);assert.equal(constrained.w/constrained.h,start.w/start.h);assert.equal(constrained.w,40);assert.equal(constrained.h,22.5);
});

test('precise media geometry and future grid settings survive save and refresh',()=>{
  const project=clone(fixture),scene=project.decks[0].scenes[0];
  scene.media='/media/exact.mp4';scene.placement={desktop:{media:{x:11.237,y:12.643,w:37.891,h:42.135}}};
  project.editor.settings={placement:{grid:{enabled:true,visible:true,size:16},guides:{enabled:true,threshold:5},media:{snap:false,preserveAspectModifier:'alt'}}};syncProjectEditor(project);
  const restored=validateProject(JSON.parse(JSON.stringify(project)));
  assert.deepEqual(restored.decks[0].scenes[0].placement.desktop.media,scene.placement.desktop.media);
  assert.deepEqual(restored.editor.settings.placement,project.editor.settings.placement);
  const invalid=clone(restored);invalid.editor.settings.placement.grid.size=0;assert.throws(()=>validateProject(invalid));
  const invalidVisibility=clone(restored);invalidVisibility.editor.settings.placement.grid.visible='yes';assert.throws(()=>validateProject(invalidVisibility));
  const autoplay=clone(restored);autoplay.editor.settings.playback={autoplay:true};validateProject(autoplay);autoplay.editor.settings.playback.autoplay='yes';assert.throws(()=>validateProject(autoplay));
});
