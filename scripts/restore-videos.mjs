import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function restoreVideos(root=path.resolve(import.meta.dirname,'..')){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'VIDEO-ASSETS.json'),'utf8'));let count=0;
 for(const file of manifest.files.filter(f=>f.storage==='split')){
  if(!/^public\/media\/[a-zA-Z0-9_.-]+$/.test(file.path))throw Error('Invalid video path');
  const target=path.join(root,file.path);
  if(fs.existsSync(target)){if(sha(fs.readFileSync(target))!==file.sha256)throw Error('Existing video checksum differs: '+file.path);continue}
  const chunks=file.parts.map(part=>{
   if(!/^video-archive\/[a-zA-Z0-9_.-]+$/.test(part.path))throw Error('Invalid archive path');
   const bytes=fs.readFileSync(path.join(root,part.path));if(bytes.length!==part.bytes||sha(bytes)!==part.sha256)throw Error('Video archive checksum differs: '+part.path);return bytes;
  });
  const data=Buffer.concat(chunks);if(data.length!==file.bytes||sha(data)!==file.sha256)throw Error('Restored video checksum differs: '+file.path);
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data,{flag:'wx'});count++;
 }
 return count;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log('Verified video archives; restored '+restoreVideos()+' original video(s).');
