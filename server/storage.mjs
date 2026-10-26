import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {validateProject,projectMediaPaths,mediaPath} from '../public/model.js';
export const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
export function syncDirectory(folder){let fd;try{fd=fs.openSync(folder,'r');fs.fsyncSync(fd)}catch(e){if(!['EINVAL','ENOTSUP'].includes(e.code))throw e}finally{if(fd!==undefined)fs.closeSync(fd)}}
export function atomicWrite(file,data,{exclusive=false,mode=0o600}={}){
 fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});const temp=file+'.tmp-'+crypto.randomUUID();let fd;
 try{fd=fs.openSync(temp,'wx',mode);fs.writeFileSync(fd,data);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
  if(exclusive){fs.linkSync(temp,file);fs.unlinkSync(temp)}else fs.renameSync(temp,file);
  syncDirectory(path.dirname(file));
 }finally{if(fd!==undefined)fs.closeSync(fd);fs.rmSync(temp,{force:true})}
}
export function safeFile(file,root){
 try{const realRoot=fs.realpathSync(root),realFile=fs.realpathSync(file);return realFile.startsWith(realRoot+path.sep)&&fs.lstatSync(file).isFile()}catch{return false}
}
export function copyMissingMedia(source,target,{verifyExisting=false}={}){
 fs.mkdirSync(target,{recursive:true,mode:0o750});if(!fs.lstatSync(target).isDirectory())throw Error('Media directory must not be a symlink');if(!fs.existsSync(source))return;
 for(const entry of fs.readdirSync(source,{withFileTypes:true})){
  if(!entry.isFile()||!mediaPath('/media/'+entry.name))continue;
  const destination=path.join(target,entry.name);if(fs.existsSync(destination)){if(!safeFile(destination,target))throw Error('Unsafe existing media file');if(verifyExisting&&digest(fs.readFileSync(destination))!==digest(fs.readFileSync(path.join(source,entry.name))))throw Error('Media collision; no file was overwritten: '+entry.name);continue}
  try{fs.copyFileSync(path.join(source,entry.name),destination,fs.constants.COPYFILE_EXCL)}catch(e){if(e.code!=='EEXIST')throw e}
 }
}
export function assertProjectMedia(project,mediaDir){for(const src of projectMediaPaths(project))if(!safeFile(path.join(mediaDir,src.slice('/media/'.length)),mediaDir))throw Error('Missing media: '+src)}
export function initializeData(root,dataDir){
 fs.mkdirSync(dataDir,{recursive:true,mode:0o750});fs.mkdirSync(path.join(dataDir,'private'),{recursive:true,mode:0o700});if(!fs.lstatSync(path.join(dataDir,'private')).isDirectory())throw Error('Private directory must not be a symlink');fs.chmodSync(path.join(dataDir,'private'),0o700);
 const file=path.join(dataDir,'content.json'),marker=path.join(dataDir,'.initialized');
 if(!fs.existsSync(file)&&fs.existsSync(marker))throw Error('Persistent content is missing; restore a backup instead of reseeding.');
 if(fs.existsSync(file))validateProject(JSON.parse(fs.readFileSync(file)));
 copyMissingMedia(path.join(root,'public/media'),path.join(dataDir,'media'));
 if(!fs.existsSync(file)){const data=fs.readFileSync(path.join(root,'content.json'));validateProject(JSON.parse(data));atomicWrite(file,data,{exclusive:true})}
 const project=validateProject(JSON.parse(fs.readFileSync(file)));assertProjectMedia(project,path.join(dataDir,'media'));
 if(!fs.existsSync(marker))atomicWrite(marker,JSON.stringify({version:1,initializedAt:new Date().toISOString()})+'\n',{exclusive:true});
 return file;
}
