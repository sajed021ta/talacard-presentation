import fs from 'node:fs';
import {blankScene,validateProject} from '../public/model.js';
import {syncProjectEditor} from '../public/editor-model.js';
const before=JSON.parse(fs.readFileSync(new URL('../references/catalog-before-latest.json',import.meta.url))),next=JSON.parse(fs.readFileSync(new URL('../public/reference/catalog.json',import.meta.url)));
const origin='http://127.0.0.1:4177';const current=await(await fetch(origin+'/api/project')).json();const project=structuredClone(current.project);
const partner=value=>value.replace(/میلی[‌\s-]*گلد|نشنال[‌\s-]*گلد|ملی[‌\s-]*گلد|national\s*gold|milli\s*gold|mili\s*gold/gi,'دیجی‌کالا');
let refreshed=0,replaced=0;
for(const deck of project.decks)for(const scene of deck.scenes){
 const base=before[scene.legacyDeck]?.[scene.legacyScene],fresh=next[scene.legacyDeck]?.[scene.legacyScene];
 if(base&&fresh)for(const key of ['title','description','highlight','label','chapter'])if(scene[key]===base[key]&&base[key]!==fresh[key]&&!(key==='title'&&scene.titleRuns)&&!(key==='description'&&scene.textBlocks)){scene[key]=fresh[key];refreshed++}
}
function walk(value){if(Array.isArray(value)){for(let i=0;i<value.length;i++)if(typeof value[i]==='string'){const result=partner(value[i]);if(result!==value[i])replaced++;value[i]=result}else walk(value[i])}else if(value&&typeof value==='object'){for(const key of Object.keys(value))if(typeof value[key]==='string'&&!['media','poster','src','image','id','originalName'].includes(key)){const result=partner(value[key]);if(result!==value[key])replaced++;value[key]=result}else if(typeof value[key]==='object')walk(value[key])}}
walk(project);
// Runs may split a partner name across formatting spans. Consolidate only an affected phrase's text.
function normalizeRuns(runs){if(!runs)return;const plain=runs.map(r=>r.text).join(''),changed=partner(plain);if(changed!==plain){const format={...runs[0]};delete format.text;runs.splice(0,runs.length,{...format,text:changed})}}
for(const deck of project.decks)for(const scene of deck.scenes){normalizeRuns(scene.titleRuns);if(scene.titleRuns)scene.title=scene.titleRuns.map(r=>r.text).join('');if(scene.textBlocks){for(const b of scene.textBlocks)normalizeRuns(b.runs);scene.description=scene.textBlocks.map(b=>b.runs.map(r=>r.text).join('')).join('\n')}}
const proposal=project.decks.find(d=>d.id==='proposal');
if(!proposal.scenes.some(s=>s.id==='proposal-ownership-framework')){
 const table={columns:['حوزه','دیجی‌کالا','طلاکارت','مشترک / نیازمند توافق'],rows:[['قیمت‌گذاری','✓','',''],['دفتر کل دیجیتال','✓','',''],['اجرای معامله','✓','',''],['شبکهٔ فیزیکی','','✓',''],['تحویل فیزیکی','','✓',''],['بهره‌برداری طلاپرداز','','✓',''],['مالکیت موجودی','','','نیازمند توافق'],['احراز هویت (KYC)','','','نیازمند توافق'],['تسویه','','','نیازمند توافق'],['تطبیق حساب‌ها','','','✓'],['پشتیبانی مشتری','','','نیازمند توافق'],['رسیدگی به اختلافات','','','نیازمند توافق']]};
 const page={...blankScene(),id:'proposal-ownership-framework',chapter:'همکاری',label:'چارچوب مسئولیت‌ها',title:'چارچوب تقسیم مسئولیت‌ها',description:'',layout:'title',table,fontSize:36,transition:'none'};
 const after=proposal.scenes.reduce((last,s,i)=>s.chapter==='همکاری'?i:last,-1);proposal.scenes.splice(after<0?proposal.scenes.length:after+1,0,page);
}
syncProjectEditor(project);validateProject(project);const backup=new URL('../.private/before-partnership-update.json',import.meta.url);if(!fs.existsSync(backup))fs.writeFileSync(backup,JSON.stringify(current.project,null,2),{mode:0o600});
const saved=await fetch(origin+'/api/project',{method:'PUT',headers:{'Content-Type':'application/json','X-Talacard-Studio':'1',Origin:origin},body:JSON.stringify({project,revision:current.revision})});if(!saved.ok)throw Error(await saved.text());console.log({refreshed,replaced,table:proposal.scenes.find(s=>s.table).table.rows.length,saved:saved.status});
