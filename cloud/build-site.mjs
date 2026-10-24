import fs from 'node:fs';
import path from 'node:path';
// Run from the existing hosted source checkout, after refreshing site-assets/.
const root=process.cwd(),assets={},types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.ttf':'font/ttf','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.gif':'image/gif'};
function collect(dir,relative=''){
 for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  const rel=relative?relative+'/'+ent.name:ent.name;if(ent.name.startsWith('.'))continue;
  const file=path.join(dir,ent.name);if(ent.isDirectory())collect(file,rel);else{
   const type=types[path.extname(rel)];if(!type||rel.endsWith('.prompt.json'))continue;
   assets['/'+rel]={type,body:fs.readFileSync(file).toString('base64')};
  }
 }
}
collect(path.join(root,'site-assets'));
// Use the same current validators as the viewer and local editor.
const moduleSource=name=>fs.readFileSync(path.join(root,'site-assets',name),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const editor=moduleSource('editor-model.js'),text=moduleSource('text.js'),model=moduleSource('model.js');
const worker=fs.readFileSync(path.join(root,'worker/source.js'),'utf8').replace(/^import .*model.js';\n/m,'');
const source=`const ASSET_MAP=${JSON.stringify(assets)};\nconst {validateEditorProject}=(()=>{\n${editor}\nreturn {validateEditorProject};})();\nconst {safeTextLink}=(()=>{\n${text}\nreturn {safeTextLink};})();\n${model}\n${worker}\nexport default createWorker(ASSET_MAP);\n`;
fs.rmSync(path.join(root,'dist'),{recursive:true,force:true});
fs.mkdirSync(path.join(root,'dist/server'),{recursive:true});fs.mkdirSync(path.join(root,'dist/.openai'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/server/index.js'),source);fs.copyFileSync(path.join(root,'.openai/hosting.json'),path.join(root,'dist/.openai/hosting.json'));
const mod=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);if(typeof mod.default?.fetch!=='function')throw new Error('Invalid Worker');
console.log(`Built self-contained Worker with ${Object.keys(assets).length} embedded assets (${source.length} bytes); movies are served from durable R2 storage.`);
