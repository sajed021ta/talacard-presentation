import fs from 'node:fs';
import {validateProject} from '../public/model.js';
const origin='http://127.0.0.1:4177';
const current=await(await fetch(origin+'/api/project')).json();const project=structuredClone(current.project);let videos=0,changed=0;
for(const deck of project.decks)for(const scene of deck.scenes){
 if(!scene.loop){scene.loop=true;changed++}
 if(/\.(mp4|webm|mov|m4v)$/i.test(scene.media))videos++;
 for(const item of scene.mediaItems||[]){if(/\.(mp4|webm|mov|m4v)$/i.test(item.media)){videos++;if(!item.loop){item.loop=true;changed++}}}
}
validateProject(project);
if(changed){fs.writeFileSync(new URL('../.private/before-video-loops-'+Date.now()+'.json',import.meta.url),JSON.stringify(current.project,null,2),{mode:0o600});
 const r=await fetch(origin+'/api/project',{method:'PUT',headers:{'Content-Type':'application/json','X-Talacard-Studio':'1',Origin:origin},body:JSON.stringify({project,revision:current.revision})});if(!r.ok)throw Error(await r.text());}
console.log(JSON.stringify({decks:project.decks.length,videos,changed,allLooping:project.decks.every(d=>d.scenes.every(s=>s.loop&&(s.mediaItems||[]).filter(m=>/\.(mp4|webm|mov|m4v)$/i.test(m.media)).every(m=>m.loop)))}));
