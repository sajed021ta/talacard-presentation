import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProject } from '../public/model.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.resolve(process.argv[2] || path.join(root, 'dist-share'));
const mediaSource = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, 'public/media');
validateProject(JSON.parse(fs.readFileSync(path.join(root, 'content.json'))));
fs.mkdirSync(output, { recursive:true });
fs.copyFileSync(path.join(root, 'public/viewer.html'), path.join(output, 'index.html'));
fs.copyFileSync(path.join(root,'public/index.html'),path.join(output,'edit.html'));
for (const f of ['viewer.js', 'viewer.css', 'studio.js','reconcile.js','rich-editor.js','login.html','login.js','access.js','access.css','studio.css', 'model.js', 'editor-model.js', 'navigation.js', 'placement.js','text.js','text.css','effects.js','backdrop.js','multimedia.js','home.js','home.css','page-transition.js','playback.js']) fs.copyFileSync(path.join(root, 'public', f), path.join(output, f));
fs.copyFileSync(path.join(root, 'content.json'), path.join(output, 'default-content.json'));
fs.cpSync(path.join(root, 'public/legacy'), path.join(output, 'legacy'), { recursive:true });
fs.cpSync(path.join(root,'public/legacy-2026-10-19'),path.join(output,'legacy-2026-10-19'),{recursive:true});
fs.cpSync(path.join(root,'public/legacy-previous'),path.join(output,'legacy-previous'),{recursive:true});
fs.cpSync(path.join(root,'public/reference'),path.join(output,'reference'),{recursive:true});
fs.mkdirSync(path.join(output, 'original'), { recursive:true });
fs.copyFileSync(path.join(root, 'original/style.css'), path.join(output, 'original/style.css'));
fs.cpSync(path.join(root, 'original/assets'), path.join(output, 'original/assets'), { recursive:true });
fs.mkdirSync(path.join(output, 'media'), { recursive:true });
for (const f of fs.readdirSync(path.join(root, 'public/media'))) {
  // Movies live in durable cloud storage; keep large uploads out of hosted source Git.
  if(/\.(mp4|webm)$/i.test(f))continue;
  const source = fs.existsSync(path.join(mediaSource, f)) ? path.join(mediaSource, f) : path.join(root, 'public/media', f);
  const destination = path.join(output, 'media', f);
  if (path.resolve(source) !== path.resolve(destination)) fs.copyFileSync(source, destination);
}
console.log('Viewer and admin editor exported; the Worker must protect editor assets and write endpoints. No credentials or source archives are included.');
console.log('For hosting with per-file limits, supply a directory of optimized videos as the third argument.');
