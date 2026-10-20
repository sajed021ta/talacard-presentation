import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const input=fs.readFileSync(process.argv[2],'utf8');
const authored=input.slice(input.indexOf('<title>'));
if(!authored.includes('const S_KM='))throw Error('Expected the inspected three-flow reference');
const scripts=[...authored.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const styles=[...authored.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const assets=[];
const extract=text=>text.replace(/data:([^;"'()\s]+);base64,([A-Za-z0-9+/=]+)/g,(all,mime,data)=>{
 const bytes=Buffer.from(data,'base64'),hash=sha(bytes),ext=mime.includes('ttf')?'ttf':mime.split('/')[1];
 let destination=fs.existsSync(path.join(root,'original/assets',hash.slice(0,16)+'.'+ext))?'original/assets/':'reference/assets/';
 const url='/'+destination+hash.slice(0,16)+'.'+ext;
 if(destination.startsWith('reference')){fs.mkdirSync(path.join(root,'public/reference/assets'),{recursive:true});fs.writeFileSync(path.join(root,'public',url),bytes)}
 if(!assets.some(a=>a.path===url))assets.push({path:url,sha256:hash,bytes:bytes.length,mime});return url;
});
const source=scripts.find(s=>s.includes('const IMG0='));
// Only evaluate inspected metadata array literals. Scene run functions are never invoked here.
const declarations=['CH_APP','S_APP','CH_K','S_K','CH_D','S_D','S_APPK','CH_KM','S_KM'];
const definitions=declarations.map(name=>{const match=source.match(new RegExp('const '+name+'=(\\[[\\s\\S]*?'+(name.startsWith('CH_')?'\\]':'\\n\\]')+');'));if(!match)throw Error('Missing '+name);return `const ${name}=${match[1]};`}).join('\n');
const catalog=vm.runInNewContext(definitions+'\nS_APP.splice(S_APP.findIndex(x=>x.c===6),0,...S_APPK);({app:[CH_APP,S_APP],kiosk:[CH_KM,S_KM],deliv:[CH_D,S_D]})',{}, {timeout:1000});
const plain=s=>s.replace(/<[^>]+>/g,'');
const metadata=Object.fromEntries(Object.entries(catalog).map(([key,[chapters,scenes]])=>[key,scenes.map((s,i)=>{
 const code=s.run.toString(),title=s.t||code.match(/\$\('#tag'\)\.innerHTML='([^']*)'/)?.[1]||'',description=s.p||code.match(/\$\('#sub'\)\.textContent='([^']*)'/)?.[1]||'';
 return {legacyDeck:key,legacyScene:i,chapter:chapters[s.c].t,label:s.f,title:plain(title),highlight:title.match(/<(?:em|span)>(.*?)<\/(?:em|span)>/)?.[1]||'',description,duration:s.d/1000};
})]));
const previous=path.join(root,'public/legacy-previous');if(!fs.existsSync(previous))fs.cpSync(path.join(root,'public/legacy'),previous,{recursive:true});
let js=extract(source);
js=js.replace(/for\(const k in IMG0\)\{[\s\S]*?DECODED\.push\(im\.decode\(\)\.catch\(\(\)=>\{\}\)\)\}/,'for(const k in IMG0){IMG[k]=IMG0[k];const im=new Image();im.src=IMG[k];DECODED.push(im.decode().catch(()=>{}))}');
js=js.replace("$('#capC').textContent=c.t;","$('#capC').textContent=c.t;if(location.hash===\"#render\")return;");
js=js.replace('/* background: slow guilloche drift */',fs.readFileSync(path.join(root,'scripts/reference-bridge.inc.js'),'utf8')+'\n/* background: slow guilloche drift */');
js=js.replace('if(!reduce&&playing){ph+=.0032}','if(!reduce&&(playing||location.hash===\"#render\")){ph+=.0032}');
js=js.replace("if(location.hash==='#kiosk'", "if(location.hash==='#render'){document.body.classList.remove('menu');playing=false;window.__ready=true;parent.postMessage({type:'talacard-ready'},location.origin)}else if(location.hash==='#kiosk'");
js='import {renderTitle,renderDescription} from "../text.js";\n'+scripts.find(s=>s.includes('window.__advance='))+'\n'+js;
fs.writeFileSync(path.join(root,'public/legacy/app.js'),js);
fs.writeFileSync(path.join(root,'public/legacy/reference.css'),styles.map(extract).join('\n')+'\n'+fs.readFileSync(path.join(root,'scripts/reference-layout.css'),'utf8'));
let html=authored.replace(/<style[^>]*>[\s\S]*?<\/style>/g,'').replace(/<script[^>]*>[\s\S]*?<\/script>/g,'').replace(/<\/body>[\s\S]*/,'');
html=html.replace('<h1 class="tag"','<div class="opener-copy"><h1 class="tag"').replace(/<p class="sub"([^>]*)>(.*?)<\/p>/s,'<div class="sub scene-description"$1>$2</div></div>').replace(/<p id="capD">.*?<\/p>/s,'<div class="scene-description" id="capD"></div>');
html=html.replace('<div class="btile tc" id="tTC">طلاکارت</div>','<div class="btile tc" id="tTC"><img src="/media/talacard-logo.png" alt="طلاکارت" style="width:80px;height:80px;object-fit:contain"></div>');
html='<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="reference.css"><link rel="stylesheet" href="/text.css"></head><body>'+html+'<script type="module" src="app.js"></script></body></html>';
fs.writeFileSync(path.join(root,'public/legacy/index.html'),html);
fs.writeFileSync(path.join(root,'public/reference/catalog.json'),JSON.stringify(metadata,null,2)+'\n');
fs.writeFileSync(path.join(root,'references/artifact-2026-10-20.json'),JSON.stringify({url:'https://claude.ai/artifact/A1CLteSL9qqvEHSW4Rpa8r',sha256:sha(input),assets,scenes:Object.fromEntries(Object.entries(metadata).map(([k,v])=>[k,v.length]))},null,2)+'\n');
console.log('Imported reference:',Object.fromEntries(Object.entries(metadata).map(([k,v])=>[k,v.length])),assets.length,'assets');
