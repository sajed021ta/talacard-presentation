import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {atomicWrite} from '../server/storage.mjs';
export function localAuthEnvironment(root,options={}){
 const config=options.accountsFile||path.join(root,'.private/auth.json');if(!fs.existsSync(config))return null;
 if(!fs.lstatSync(config).isFile())throw Error('Account records must be a regular private file');
 const records=JSON.parse(fs.readFileSync(config,'utf8')),folder=options.storeDir||path.join(root,'.private/auth-store');
 if(fs.existsSync(folder)&&!fs.lstatSync(folder).isDirectory())throw Error('Auth store must not be a symlink');
 const filename=key=>{if(!/^auth\/(sessions|limits)\/[a-f0-9]{64}$/.test(key))throw Error('Invalid auth key');return path.join(folder,key.slice(5).replace('/','-')+'.json')};
 const load=key=>{const file=filename(key);if(!fs.existsSync(file))return null;if(!fs.lstatSync(file).isFile())throw Error('Invalid auth record');const body=fs.readFileSync(file),httpEtag='"'+crypto.createHash('sha256').update(body).digest('hex')+'"';return {body,httpEtag}};
 return {TALACARD_STORAGE:options.storage||'local',TALACARD_SESSION_SECONDS:options.sessionSeconds,TALACARD_CANONICAL_ROLES:options.canonicalRoles,TALACARD_AUTH_ACCOUNTS:JSON.stringify(Array.isArray(records)?records:records.accounts),BUCKET:{
  async get(key){return load(key)},async delete(key){fs.rmSync(filename(key),{force:true})},
  async put(key,data,options={}){const current=load(key),condition=options.onlyIf;if(condition?.get('If-Match')&&condition.get('If-Match')!==current?.httpEtag||condition?.get('If-None-Match')==='*'&&current)return null;fs.mkdirSync(folder,{recursive:true,mode:0o700});if(!fs.lstatSync(folder).isDirectory())throw Error('Auth store must not be a symlink');atomicWrite(filename(key),data);return load(key)}
 }};
}
