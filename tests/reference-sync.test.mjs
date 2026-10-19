import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {mergeReference} from '../scripts/merge-reference.mjs';import {validateProject,clone} from '../public/model.js';
const root=new URL('../',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root)));
const current=read('content.json'),baseline=read('references/original-app-content.json'),catalog=read('public/reference/catalog.json');
test('reference merge refreshes source copy, keeps owner edits and original branch detail, and is idempotent',()=>{
 const input=clone(current);input.decks=input.decks.filter(d=>['app','proposal'].includes(d.id));const app=input.decks[0];delete app.referenceVersion;
 app.scenes=baseline.map((s,i)=>({...current.decks[0].scenes[0],...s,id:s.id,legacyScene:i,layout:'legacy'}));
 const custom=app.scenes[10];custom.title='عنوان مالک';custom.titleRuns=[{text:'عنوان مالک',bold:true}];custom.description='توضیح مالک';custom.textBlocks=[{id:'owner',runs:[{text:'توضیح مالک'}]}];custom.placement={desktop:{copy:{x:10,y:20,w:40,h:30}}};
 const next=mergeReference(input);validateProject(next);const updated=next.decks[0].scenes.find(s=>s.id===custom.id);assert.equal(updated.title,custom.title);assert.deepEqual(updated.textBlocks,custom.textBlocks);assert.deepEqual(updated.placement,custom.placement);
 assert.deepEqual(next.decks[1].scenes.map(s=>({media:s.media,placement:s.placement,title:s.title,description:s.description})),input.decks[1].scenes.map(s=>({media:s.media,placement:s.placement,title:s.title,description:s.description})));
 assert.equal(next.decks[0].scenes.find(s=>s.id==='app-13').legacyDeck,'previous');assert.ok(next.decks[0].scenes.some(s=>s.label==='هدف کامل شد'));
 assert.equal(next.decks.find(d=>d.id==='kiosk').scenes.length,22);assert.equal(next.decks.find(d=>d.id==='deliv').scenes.length,13);assert.deepEqual(mergeReference(next),next);
});
test('all referenced images/fonts are exact supplied bytes and each source step maps to an editable scene',()=>{
 const manifest=read('references/artifact-2026-10-19.json');for(const a of manifest.assets){const p=a.path.startsWith('/original')?a.path.slice(1):'public'+a.path;assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(p,root))).digest('hex'),a.sha256)}
 const merged=mergeReference(current);for(const [id,list] of Object.entries(catalog)){const deck=merged.decks.find(d=>d.id===id);for(const item of list)assert.ok(deck.scenes.some(s=>s.legacyDeck===id&&s.legacyScene===item.legacyScene),id+' '+item.label)}
 const bad=clone(merged);bad.decks[0].scenes[0].legacyDeck='unknown';assert.throws(()=>validateProject(bad));bad.decks[0].scenes[0].legacyDeck='app';bad.decks[0].scenes[0].presentationStyle='url(x)';assert.throws(()=>validateProject(bad));
});
