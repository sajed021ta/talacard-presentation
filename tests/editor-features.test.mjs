import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateProject,clone,validateRichScene,sceneMediaPaths,renameChapter} from '../public/model.js';
import {splitSentences,textBlocks,ensureTextBlocks,syncDescription,sliceRuns,runsText,bulletLines,applyRunFormat,normalizeRuns,safeTextLink} from '../public/text.js';
import {effectFrames,applyMediaEffect,controlMediaEffect} from '../public/effects.js';
import {syncProjectEditor} from '../public/editor-model.js';
const baseline=JSON.parse(fs.readFileSync(new URL('../content.json',import.meta.url)));

test('a selected word keeps its link and other styles through save, reload and unlink',()=>{
 const project=clone(baseline),scene=project.decks[0].scenes[0];
 scene.title='خرید Gold امروز';
 scene.titleRuns=applyRunFormat([{text:scene.title,bold:true}],5,9,{href:'https://example.com/gold',color:'#285a9f'});
 syncProjectEditor(project);
 const restored=validateProject(JSON.parse(JSON.stringify(project))).decks[0].scenes[0];
 assert.deepEqual(restored.titleRuns,[{text:'خرید ',bold:true},{text:'Gold',bold:true,href:'https://example.com/gold',color:'#285a9f'},{text:' امروز',bold:true}]);
 const unlinked=applyRunFormat(restored.titleRuns,5,9,{href:undefined});
 assert.equal(unlinked[1].href,undefined);assert.equal(unlinked[1].color,'#285a9f');assert.equal(unlinked[1].bold,true);
 for(const href of ['javascript:alert(1)','data:text/html,x','//untrusted.example','https:\\bad','https://example.com\n']){
  assert.equal(safeTextLink(href),false);
  const bad=clone(restored);bad.titleRuns[1].href=href;assert.throws(()=>validateRichScene(bad));
 }
});

test('legacy descriptions remain plain until edited; sentence splitting preserves text and styled runs',()=>{
 const s={description:'یک جمله. جملهٔ دوم؟ مقدار ۱.۵ گرم است.\nخط آخر',title:'عنوان'};
 assert.equal(textBlocks(s).length,4);assert.equal(s.textBlocks,undefined);
 assert.equal(textBlocks(s).map(b=>runsText(b.runs)).join(''),s.description);
 const blocks=ensureTextBlocks(s);blocks[0].runs=[{text:'جمله',bold:true},{text:' نخست',color:'#a87816'}];syncDescription(s);assert.ok(s.description.startsWith('جمله نخست\n'));
 const runs=[{text:'first ',bold:true},{text:'second',italic:true}];assert.deepEqual(sliceRuns(runs,3,9),[{text:'st ',bold:true},{text:'sec',italic:true}]);
 assert.equal(splitSentences('وزن 1.25 گرم است. تمام.').length,2);
});

test('rich text, independent placement and timed effects survive JSON; unsafe/imported formats fail',()=>{
 const p=clone(baseline),s=p.decks[1].scenes[0];
 s.titleRuns=[{text:s.title,bold:false,color:'#222225'}];s.titleFormat={align:'center',fontFamily:'YekanX'};
 s.textBlocks=[{id:'body-1',runs:[{text:'متن قالب‌دار',bold:true,italic:true,underline:true,fontSize:26}],format:{align:'left',lineHeight:1.6},placement:{desktop:{x:5,y:70,w:45,h:20}}}];syncDescription(s);
 s.mediaEffect={type:'zoom-out',duration:20,delay:1.5,amount:30,repeat:true,easing:'ease-in-out'};validateProject(JSON.parse(JSON.stringify(p)));
 for(const mutate of [s=>s.textBlocks[0].runs[0].color='url(x)',s=>s.textBlocks[0].format.align='middle',s=>s.textBlocks[0].format.fontFamily='remote-font',s=>s.textBlocks[0].placement.desktop.x=90,s=>s.mediaEffect.duration=0,s=>s.mediaEffect.type='eval',s=>s.titleRuns[0].text='mismatch',s=>s.textBlocks.push({...s.textBlocks[0]})]){const bad=clone(s);mutate(bad);assert.throws(()=>validateRichScene(bad))}
});

test('effect paths zoom/pan media only and are independent of scene duration',()=>{
 assert.deepEqual(effectFrames({type:'zoom-in',amount:25}),[{transform:'scale(1)'},{transform:'scale(1.25)'}]);
 assert.deepEqual(effectFrames({type:'zoom-out',amount:25}),[{transform:'scale(1.25)'},{transform:'scale(1)'}]);
 assert.equal(effectFrames({type:'zoom-in-out',amount:20}).length,3);
 assert.match(effectFrames({type:'pan-left',amount:20})[0].transform,/translateX/);
 assert.match(effectFrames({type:'pan-up',amount:20})[0].transform,/translateY/);
 assert.equal(effectFrames({type:'none'}),null);
});

test('effect playback uses seconds, survives text changes and resumes without restarting finished motion',()=>{
 let options,calls=0;const animation={playState:'running',cancel(){this.playState='idle'},pause(){this.playState='paused'},play(){calls++;this.playState='running'}};
 const media={animate(frames,timing){options=timing;return animation}},canvas={querySelector(){return media}};
 const scene={duration:5,mediaEffect:{type:'zoom-in',duration:20,delay:2,repeat:true}};
 applyMediaEffect(canvas,scene);assert.equal(options.duration,20000);assert.equal(options.delay,2000);assert.equal(options.iterations,Infinity);
 controlMediaEffect(canvas,false);assert.equal(animation.playState,'paused');controlMediaEffect(canvas,true);assert.equal(calls,1);
 animation.playState='finished';applyMediaEffect(canvas,{...scene,title:'edited'});assert.equal(calls,1);
});

test('multiple scene media retain individual playback, effects and device placement, while rejecting unsafe assets',()=>{
 const p=clone(baseline),s=p.decks[0].scenes[0];s.mediaItems=[{id:'second',name:'ویدیوی دوم',media:'/media/second.mp4',poster:'',fit:'contain',loop:true,placement:{desktop:{x:10,y:60,w:30,h:30},compact:{x:5,y:65,w:40,h:25}},mediaEffect:{type:'zoom-out',duration:7,delay:0,amount:20,repeat:false,easing:'ease-out'}}];
 validateProject(JSON.parse(JSON.stringify(p)));assert.ok(sceneMediaPaths(s).includes('/media/second.mp4'));
 for(const mutate of [m=>m.media='https://tracker.test/a.mp4',m=>m.placement.compact.w=200,m=>m.mediaEffect.duration=-1,m=>m.loop='yes']){const bad=clone(p);mutate(bad.decks[0].scenes[0].mediaItems[0]);assert.throws(()=>validateProject(bad))}
 s.mediaItems.push(clone(s.mediaItems[0]));assert.throws(()=>validateProject(p));
});
test('renaming a chapter updates all siblings while preventing accidental merge or empty names',()=>{
 const d={scenes:[{chapter:'همکاری'},{chapter:'همکاری'},{chapter:'معرفی'}]};renameChapter(d,'همکاری','همکاران');assert.deepEqual(d.scenes.map(s=>s.chapter),['همکاران','همکاران','معرفی']);assert.throws(()=>renameChapter(d,'همکاران','معرفی'));assert.throws(()=>renameChapter(d,'همکاران',' '));
});

test('bullet lists preserve individual inline styles, blank lines and safe portable block formatting',()=>{
 const runs=[{text:'اول',color:'#b43838'},{text:'\nدوم\n\nسوم',bold:true}];const lines=bulletLines(runs);assert.equal(lines.length,4);assert.deepEqual(lines[0],[{text:'اول',color:'#b43838'}]);assert.deepEqual(lines[1],[{text:'دوم',bold:true}]);assert.deepEqual(lines[2],[]);assert.equal(lines.map(runsText).join('\n'),runsText(runs));
 const p=clone(baseline),s=p.decks[1].scenes[0];s.textBlocks=[{id:'bullets',runs,format:{list:'bullet',align:'right'}}];syncDescription(s);validateProject(JSON.parse(JSON.stringify(p)));s.textBlocks[0].format.list='html';assert.throws(()=>validateProject(p));
});

test('changing one selected Persian word preserves surrounding text and element geometry',()=>{
 const original=[{text:'قیمت طلا امروز'}],start='قیمت '.length,end=start+'طلا'.length;
 const placement={desktop:{x:12,y:18,w:44,h:22}},before=clone(placement);
 const runs=applyRunFormat(original,start,end,{color:'#b43838'});
 assert.deepEqual(runs,[{text:'قیمت '},{text:'طلا',color:'#b43838'},{text:' امروز'}]);
 assert.equal(runsText(runs),'قیمت طلا امروز');assert.deepEqual(placement,before);
});

test('multiple independent inline styles coexist in one sentence',()=>{
 let runs=[{text:'طلاکارت جریان امن طلا'}];
 runs=applyRunFormat(runs,0,7,{bold:true,fontFamily:'Tahoma'});
 runs=applyRunFormat(runs,8,13,{italic:true,underline:true,fontSize:28});
 runs=applyRunFormat(runs,14,17,{strike:true,highlight:'#f4df98'});
 assert.equal(runsText(runs),'طلاکارت جریان امن طلا');
 assert.deepEqual(runs.find(run=>run.text==='طلاکارت'),{text:'طلاکارت',bold:true,fontFamily:'Tahoma'});
 assert.deepEqual(runs.find(run=>run.text==='جریان'),{text:'جریان',italic:true,underline:true,fontSize:28});
 assert.deepEqual(runs.find(run=>run.text==='امن'),{text:'امن',strike:true,highlight:'#f4df98'});
 assert.deepEqual(normalizeRuns([{text:'الف',bold:true},{text:'ب',bold:true}]),[{text:'الفب',bold:true}]);
});

test('rich text styles survive project save, JSON refresh and editor-model synchronization',()=>{
 const project=clone(baseline),scene=project.decks[0].scenes[0];
 scene.titleRuns=applyRunFormat([{text:scene.title}],0,Math.min(4,scene.title.length),{color:'#285a9f',bold:true});
 scene.titleFormat={align:'center',lineHeight:1.6,paragraphSpacing:.5,direction:'auto'};
 scene.textBlocks=[{id:'persisted-rich-text',runs:[{text:'فارسی ',color:'#222225'},{text:'English',italic:true,highlight:'#f4df98'},{text:' ترکیبی',underline:true}],format:{list:'ordered',align:'right',direction:'auto'}}];syncDescription(scene);
 syncProjectEditor(project);const restored=validateProject(JSON.parse(JSON.stringify(project))),restoredScene=restored.decks[0].scenes[0];
 assert.deepEqual(restoredScene.titleRuns,scene.titleRuns);assert.deepEqual(restoredScene.titleFormat,scene.titleFormat);
 assert.deepEqual(restoredScene.textBlocks,scene.textBlocks);
 const surface=restored.editor.surfaces.find(value=>value.sourceId===scene.id),body=surface.elements.find(element=>element.binding?.itemId==='persisted-rich-text');
 assert.deepEqual(body.content.runs,scene.textBlocks[0].runs);assert.deepEqual(body.content.format,scene.textBlocks[0].format);
});

test('mixed Persian and English selection keeps Unicode text and isolated LTR styling',()=>{
 const text='قیمت Gold Card امروز',start=text.indexOf('Gold'),end=start+'Gold Card'.length;
 const runs=applyRunFormat([{text}],start,end,{fontFamily:'Arial',fontSize:24,color:'#23754d'});
 assert.equal(runsText(runs),text);assert.deepEqual(runs[1],{text:'Gold Card',fontFamily:'Arial',fontSize:24,color:'#23754d'});
 const scene={title:text,description:text,titleRuns:runs,titleFormat:{direction:'auto'},textBlocks:[{id:'mixed',runs,format:{direction:'auto'}}]};
 assert.doesNotThrow(()=>validateRichScene(scene));
});
