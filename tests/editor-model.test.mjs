import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ensureEditableProject,editorSurface,homeEditorContent,updateEditorElement,validateEditorProject,reorderEditorElement,syncProjectEditor} from '../public/editor-model.js';
import {validateProject} from '../public/model.js';

const baseline=JSON.parse(fs.readFileSync(new URL('../content.json',import.meta.url)));
const copy=value=>structuredClone(value);

test('every presentation page and the home page share one editable surface model',()=>{
 const project=ensureEditableProject(copy(baseline)),scenes=project.decks.flatMap(deck=>deck.scenes);
 assert.equal(project.editor.schemaVersion,1);assert.equal(project.editor.surfaces.length,scenes.length+1);assert.equal(editorSurface(project,'home').kind,'home');
 for(const scene of scenes){const surface=editorSurface(project,scene.id);assert.equal(surface.sourceId,scene.id);assert.ok(surface.elements.some(element=>element.role==='title'));for(const element of surface.elements){assert.ok(element.id);assert.ok(element.type);assert.ok(element.position);assert.ok(element.dimensions);assert.ok(Number.isInteger(element.zIndex));assert.ok(element.content);assert.ok(element.style)}}
 validateEditorProject(project);validateProject(project);
});

test('element updates bridge back to current renderer fields and survive JSON',()=>{
 const project=ensureEditableProject(copy(baseline)),scene=project.decks[0].scenes[0],surface=editorSurface(project,scene.id),title=surface.elements.find(element=>element.role==='title');
 updateEditorElement(project,scene.id,title.id,{content:{text:'عنوان تازه',runs:[{text:'عنوان ',bold:true},{text:'تازه',color:'#A87816'}],format:{align:'center'}},position:{desktop:{x:10,y:15}},dimensions:{desktop:{width:55,height:20}}});
 assert.equal(scene.title,'عنوان تازه');assert.equal(scene.titleRuns.length,2);assert.deepEqual(scene.placement.desktop.copy,{x:10,y:15,w:55,h:20});validateProject(JSON.parse(JSON.stringify(project)));
});

test('home heading and every card are independent editable elements',()=>{
 const project=ensureEditableProject(copy(baseline)),home=homeEditorContent(project);assert.equal(home.cards.length,4);
 updateEditorElement(project,'home',home.title.id,{content:{text:'عنوان خانه',runs:[{text:'عنوان خانه'}]}});assert.equal(homeEditorContent(project).title.content.text,'عنوان خانه');
 const card=home.cards.find(element=>element.content.key==='kiosk');updateEditorElement(project,'home',card.id,{content:{name:'کیوسک تازه'}});assert.equal(project.homeCards.kiosk.name,'کیوسک تازه');assert.equal(homeEditorContent(project).cards.find(element=>element.content.key==='kiosk').content.name,'کیوسک تازه');
});

test('all four home cards keep independent rich text, media, destination and appearance after refresh',()=>{
 const project=ensureEditableProject(copy(baseline)),cards=homeEditorContent(project).cards,targets=project.decks.map(deck=>deck.id),video=project.library.find(item=>item.type==='video').src;
 cards.forEach((card,index)=>{
  const name=`کارت ${index+1}`,description=`توضیح مستقل ${index+1}`;
  updateEditorElement(project,'home',card.id,{content:{name,nameRuns:[{text:'کارت ',bold:true},{text:String(index+1),color:'#A87816'}],nameFormat:{align:'center'},description,descriptionRuns:[{text:description,italic:index%2===0}],descriptionFormat:{align:'right'},image:index===0?video:card.content.image,target:targets[index%targets.length]},style:{background:index%2?'#FFFFFF':'#F9F1DC',borderColor:'#D7B34E',borderWidth:index+1,borderRadius:18+index,padding:14+index,gap:8+index,offsetX:index*2,offsetY:index,width:240+index,height:360+index},zIndex:10+index});
 });
 const restored=ensureEditableProject(JSON.parse(JSON.stringify(project))),saved=homeEditorContent(restored).cards;
 assert.equal(saved.length,4);assert.equal(new Set(saved.map(card=>card.content.name)).size,4);
 saved.forEach((card,index)=>{assert.equal(card.content.name,`کارت ${index+1}`);assert.equal(card.content.nameRuns.length,2);assert.equal(card.content.description,`توضیح مستقل ${index+1}`);assert.equal(card.content.target,targets[index%targets.length]);assert.equal(card.style.borderWidth,index+1);assert.equal(card.style.width,240+index);assert.equal(card.zIndex,10+index)});
 assert.equal(saved[0].type,'card');assert.equal(saved[0].content.image,video);validateProject(restored);
});

test('invalid geometry, duplicate surfaces and unsafe media are rejected',()=>{
 const project=ensureEditableProject(copy(baseline));const surface=project.editor.surfaces[1],element=surface.elements[0];element.position.desktop={x:-1,y:0};assert.throws(()=>validateEditorProject(project));
 const duplicate=ensureEditableProject(copy(baseline));duplicate.editor.surfaces.push(copy(duplicate.editor.surfaces[0]));assert.throws(()=>validateEditorProject(duplicate));
 const unsafe=ensureEditableProject(copy(baseline)),media=unsafe.editor.surfaces.flatMap(value=>value.elements).find(value=>value.type==='video'||value.type==='image');media.content.src='https://tracker.invalid/file.mp4';assert.throws(()=>validateEditorProject(unsafe));
});

test('context panel layer order and media aspect preference persist through synchronization and refresh',()=>{
 const project=ensureEditableProject(copy(baseline)),scene=project.decks.find(deck=>deck.scenes.some(page=>page.media))?.scenes.find(page=>page.media),surface=editorSurface(project,scene.id),media=surface.elements.find(element=>element.binding.field==='primaryMedia'),title=surface.elements.find(element=>element.binding.field==='title');
 updateEditorElement(project,scene.id,media.id,{style:{preserveAspect:true},zIndex:9});assert.equal(editorSurface(project,scene.id).elements.find(element=>element.id===media.id).style.preserveAspect,true);
 assert.equal(reorderEditorElement(project,scene.id,title.id,1),true);const moved=editorSurface(project,scene.id).elements.find(element=>element.id===title.id).zIndex;
 syncProjectEditor(project);const restored=JSON.parse(JSON.stringify(project)),restoredSurface=editorSurface(restored,scene.id);assert.equal(restoredSurface.elements.find(element=>element.id===media.id).style.preserveAspect,true);assert.equal(restoredSurface.elements.find(element=>element.id===title.id).zIndex,moved);validateProject(restored);
});

test('image elements expose the same geometry, fit and layer model as video elements',()=>{
 const project=copy(baseline),scene=project.decks[1].scenes[0];scene.media='/media/panel-image.png';scene.poster='';scene.fit='contain';ensureEditableProject(project);
 const image=editorSurface(project,scene.id).elements.find(element=>element.binding.field==='primaryMedia');assert.equal(image.type,'image');
 updateEditorElement(project,scene.id,image.id,{content:{fit:'cover'},style:{preserveAspect:true},zIndex:12,position:{desktop:{x:12.25,y:8.5}},dimensions:{desktop:{width:47.75,height:63.25}}});
 assert.equal(scene.fit,'cover');assert.deepEqual(scene.placement.desktop.media,{x:12.25,y:8.5,w:47.75,h:63.25});const restored=JSON.parse(JSON.stringify(project)),element=editorSurface(restored,scene.id).elements.find(value=>value.id===image.id);assert.equal(element.style.preserveAspect,true);assert.equal(element.zIndex,12);validateProject(restored);
});

test('full-page and standard media sizing survive save and refresh',()=>{
 const project=ensureEditableProject(copy(baseline)),scene=project.decks.find(deck=>deck.scenes.some(page=>page.media))?.scenes.find(page=>page.media),media=editorSurface(project,scene.id).elements.find(element=>element.binding.field==='primaryMedia');
 updateEditorElement(project,scene.id,media.id,{content:{fit:'fill'},position:{desktop:{x:0,y:0}},dimensions:{desktop:{width:100,height:100}}});
 const card=homeEditorContent(project).cards[0];updateEditorElement(project,'home',card.id,{content:{fit:'cover'},style:{mediaPreset:'wide',mediaWidth:100,mediaHeight:0,mediaAspect:'16 / 9'}});
 const restored=ensureEditableProject(JSON.parse(JSON.stringify(project))),restoredMedia=editorSurface(restored,scene.id).elements.find(element=>element.id===media.id),restoredCard=homeEditorContent(restored).cards.find(element=>element.id===card.id);
 assert.equal(restoredMedia.content.fit,'fill');assert.deepEqual(scene.placement.desktop.media,{x:0,y:0,w:100,h:100});assert.equal(restoredCard.content.fit,'cover');assert.equal(restoredCard.style.mediaAspect,'16 / 9');validateProject(restored);
});
