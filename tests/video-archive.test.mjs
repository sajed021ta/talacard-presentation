import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {restoreVideos} from '../scripts/restore-videos.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
test('split original videos restore exactly, are idempotent and reject damaged parts',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tala-video-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'video-archive'));
 const data=Buffer.from('original bytes, unchanged'),a=data.subarray(0,8),b=data.subarray(8),parts=[a,b].map((bytes,i)=>{const p='video-archive/movie.part'+i;fs.writeFileSync(path.join(root,p),bytes);return {path:p,bytes:bytes.length,sha256:hash(bytes)}});
 const target='public/media/movie.mp4';fs.writeFileSync(path.join(root,'VIDEO-ASSETS.json'),JSON.stringify({files:[{path:target,storage:'split',bytes:data.length,sha256:hash(data),parts}]}));
 assert.equal(restoreVideos(root),1);assert.deepEqual(fs.readFileSync(path.join(root,target)),data);assert.equal(restoreVideos(root),0);
 fs.unlinkSync(path.join(root,target));fs.writeFileSync(path.join(root,parts[1].path),'damaged');assert.throws(()=>restoreVideos(root),/checksum/);assert.equal(fs.existsSync(path.join(root,target)),false);
});
