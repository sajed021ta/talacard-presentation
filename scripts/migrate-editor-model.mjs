import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ensureEditableProject} from '../public/editor-model.js';
import {validateProject} from '../public/model.js';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source=path.join(root,'content.json'),target=path.join(root,'public/default-content.json');
const project=ensureEditableProject(validateProject(JSON.parse(fs.readFileSync(source,'utf8'))));
validateProject(project);const data=JSON.stringify(project,null,2)+'\n';
fs.writeFileSync(source,data);fs.writeFileSync(target,data);
console.log(JSON.stringify({schemaVersion:project.editor.schemaVersion,surfaces:project.editor.surfaces.length,elements:project.editor.surfaces.reduce((sum,surface)=>sum+surface.elements.length,0),bytes:Buffer.byteLength(data)}));
