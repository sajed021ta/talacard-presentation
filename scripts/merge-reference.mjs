import fs from 'node:fs';
import {clone,blankScene,validateProject} from '../public/model.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/reference/catalog.json',import.meta.url)));
// Retain owner copy, formatting, media and placements; only source-owned plain fields refresh.
export function mergeReference(input){
 const project=clone(input),app=project.decks.find(d=>d.id==='app');
 if(app&&!app.referenceVersion){
  const old=JSON.parse(fs.readFileSync(new URL('../references/original-app-content.json',import.meta.url)));
  const oldById=new Map(old.map(s=>[s.id,s]));const mapped=new Set();
  for(const scene of app.scenes){
   const base=oldById.get(scene.id);if(!base){scene.legacyDeck||='previous';continue}
   const next=catalog.app.find(s=>s.label===base.label);
   if(!next){scene.legacyDeck='previous';continue}
   mapped.add(next.legacyScene);scene.legacyDeck='app';scene.legacyScene=next.legacyScene;
   for(const key of ['title','description','highlight','chapter','label','duration'])if(scene[key]===base[key]&&!(key==='title'&&scene.titleRuns)&&!(key==='description'&&scene.textBlocks))scene[key]=next[key];
  }
  for(const next of catalog.app){if(mapped.has(next.legacyScene))continue;const fresh={...blankScene(),...next,id:'ref-app-'+next.legacyScene,layout:'legacy',background:'#FFFFFF',presentationStyle:'reference'};
   const following=app.scenes.findIndex(s=>s.legacyDeck==='app'&&s.legacyScene>next.legacyScene);app.scenes.splice(following<0?app.scenes.length:following,0,fresh);
  }
  app.referenceVersion='2026-10-19';
 }
 for(const key of ['kiosk','deliv'])if(!project.decks.some(d=>d.id===key))project.decks.push({id:key,name:key==='kiosk'?'طلاکارت × دیجی‌کالا · طلاپرداز':'طلاکارت × دیجی‌کالا · تحویل از موجودی',flowDescription:'مسیر کامل نسخهٔ به‌روز مرجع، با متن و چیدمان قابل ویرایش.',referenceVersion:'2026-10-19',scenes:catalog[key].map(next=>({...blankScene(),...next,id:'ref-'+key+'-'+next.legacyScene,layout:'legacy',background:'#FFFFFF',presentationStyle:'reference'}))});
 for(const d of project.decks)for(const s of d.scenes)if(s.presentationStyle===undefined)s.presentationStyle=['#FFFFFF','#ffffff','#F3F1F4'].includes(s.background)?'reference':'plain';
 return validateProject(project);
}
if(typeof process!=='undefined'&&process.argv[1]===new URL(import.meta.url).pathname){const file=process.argv[2];if(!file)throw Error('Supply a project JSON; this command never overwrites the live project.');const project=mergeReference(JSON.parse(fs.readFileSync(file)));process.stdout.write(JSON.stringify(project,null,2)+'\n')}
