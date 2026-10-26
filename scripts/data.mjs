import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateProject} from '../public/model.js';
import {validateAccounts} from '../cloud/auth.js';
import {atomicWrite,copyMissingMedia,assertProjectMedia,digest} from '../server/storage.mjs';
const ROOT=path.resolve(import.meta.dirname,'..');
function files(root,relative=''){
 const result=[];for(const item of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){
  const name=relative?relative+'/'+item.name:item.name;if(item.name.includes('.tmp-')||name==='backup-manifest.json')continue;
  if(item.isSymbolicLink())throw Error('Symlinks are not allowed in data backups');
  if(item.isDirectory())result.push(...files(root,name));else if(item.isFile())result.push(name);
 }return result;
}
export function importContent(source,dataDir,{seedRoot=ROOT}={}){
 const destination=path.join(dataDir,'content.json');if(fs.existsSync(destination)||fs.existsSync(path.join(dataDir,'.initialized')))throw Error('Content already exists; import refused to prevent replacement.');
 const file=fs.existsSync(path.join(source,'content.json'))?path.join(source,'content.json'):path.join(source,'default-content.json');
 const data=fs.readFileSync(file),project=validateProject(JSON.parse(data));
 copyMissingMedia(path.join(source,'media'),path.join(dataDir,'media'),{verifyExisting:true});copyMissingMedia(path.join(seedRoot,'public/media'),path.join(dataDir,'media'));
 assertProjectMedia(project,path.join(dataDir,'media'));atomicWrite(destination,data,{exclusive:true});
}
export function backupData(dataDir,output){
 if(fs.existsSync(output)||path.resolve(output).startsWith(path.resolve(dataDir)+path.sep))throw Error('Backup destination must be a new directory outside the data volume');
 validateProject(JSON.parse(fs.readFileSync(path.join(dataDir,'content.json'))));
 const names=files(dataDir);fs.mkdirSync(output,{recursive:true,mode:0o700});const manifest={version:1,files:[]};
 for(const name of names){const target=path.join(output,name);fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});fs.copyFileSync(path.join(dataDir,name),target,fs.constants.COPYFILE_EXCL);fs.chmodSync(target,0o600);const bytes=fs.readFileSync(target);manifest.files.push({path:name,bytes:bytes.length,sha256:digest(bytes)})}
 atomicWrite(path.join(output,'backup-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{exclusive:true});return manifest.files.length;
}
export function restoreData(source,dataDir){
 if(fs.existsSync(dataDir)&&fs.readdirSync(dataDir).length)throw Error('Restore requires an empty data directory. Existing data was preserved.');
 const manifest=JSON.parse(fs.readFileSync(path.join(source,'backup-manifest.json')));if(manifest.version!==1||!Array.isArray(manifest.files))throw Error('Invalid backup manifest');
 const all=new Set(files(source));if(manifest.files.length!==all.size||new Set(manifest.files.map(f=>f.path)).size!==all.size)throw Error('Backup file inventory differs');
 for(const entry of manifest.files){if(typeof entry.path!=='string'||entry.path.startsWith('/')||entry.path.split('/').some(p=>!p||p==='..')||!all.has(entry.path))throw Error('Invalid backup path');const data=fs.readFileSync(path.join(source,entry.path));if(data.length!==entry.bytes||digest(data)!==entry.sha256)throw Error('Backup checksum mismatch')}
 const project=validateProject(JSON.parse(fs.readFileSync(path.join(source,'content.json'))));assertProjectMedia(project,path.join(source,'media'));
 const accountFile=path.join(source,'private/accounts.json');if(fs.existsSync(accountFile)){const data=JSON.parse(fs.readFileSync(accountFile));validateAccounts(Array.isArray(data)?data:data.accounts)}
 fs.mkdirSync(dataDir,{recursive:true,mode:0o750});for(const entry of manifest.files)atomicWrite(path.join(dataDir,entry.path),fs.readFileSync(path.join(source,entry.path)),{exclusive:true});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const args=process.argv.slice(2),command=args[0],value=key=>{const i=args.indexOf(key);return i<0?null:args[i+1]},dataDir=process.env.TALACARD_DATA_DIR||'/data';
  if(!args.includes('--offline'))throw Error('Stop only the presentation service first, then pass --offline.');
  if(command==='backup'&&value('--output'))console.log('Backup complete: '+backupData(dataDir,path.resolve(value('--output')))+' verified files.');
  else if(command==='restore'&&value('--from')){restoreData(path.resolve(value('--from')),dataDir);console.log('Backup restored into empty persistent storage.')}
  else if(command==='import'&&value('--from')){importContent(path.resolve(value('--from')),dataDir);console.log('Existing presentation imported without replacing persistent content.')}
  else throw Error('Usage: data.mjs backup --output DIR | restore --from DIR | import --from DIR; --offline is required.');
 }catch(error){console.error(error.message);process.exitCode=1}
}
