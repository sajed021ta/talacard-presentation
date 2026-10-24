import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {clone,validateProject} from '../public/model.js';
import {syncProjectEditor,homeEditorContent,updateEditorElement} from '../public/editor-model.js';
import {deckDisplayName} from '../public/home.js';

test('section names follow all four home cards, including later renames, without changing destinations',()=>{
 const project=JSON.parse(fs.readFileSync(new URL('../content.json',import.meta.url)));syncProjectEditor(project);
 const cards=homeEditorContent(project).cards;
 const ids=project.decks.map(deck=>deck.id),targets=cards.map(card=>card.content.target),previousNames=cards.map(card=>card.content.name);
 for(const [index,card] of cards.entries()){
   assert.equal(deckDisplayName(project,card.content.key),previousNames[index]);
   const name=`نام بخش ${index+1}`;
   updateEditorElement(project,'home',card.id,{content:{name,nameRuns:[{text:name}]}});
   const restored=validateProject(clone(project));
   assert.equal(deckDisplayName(restored,card.content.key),name);
   assert.deepEqual(restored.decks.map(deck=>deck.id),ids);
   assert.deepEqual(homeEditorContent(restored).cards.map(value=>value.content.target),targets);
   for(let sibling=index+1;sibling<cards.length;sibling++)assert.equal(deckDisplayName(restored,cards[sibling].content.key),previousNames[sibling]);
 }
 assert.equal(deckDisplayName({decks:[{id:'extra',name:'بخش اضافه'}]},'extra'),'بخش اضافه');
});
