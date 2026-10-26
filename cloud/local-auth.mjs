import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function localAuthEnvironment(root){
 const config=path.join(root,'.private/auth.json');if(!fs.existsSync(config))return null;
 const records=JSON.parse(fs.readFileSync(config,'utf8')),folder=path.join(root,'.private/auth-store');
 const filename=key=>{if(!/^auth\/(sessions|limits)\/[a-f0-9]{64}$/.test(key))throw Error('Invalid auth key');return path.join(folder,key.slice(5).replace('/','-')+'.json')};
 const load=key=>{const file=filename(key);if(!fs.existsSync(file))return null;const body=fs.readFileSync(file),httpEtag='"'+crypto.createHash('sha256').update(body).digest('hex')+'"';return {body,httpEtag}};
 return {TALACARD_STORAGE:'local',TALACARD_AUTH_ACCOUNTS:JSON.stringify(records.accounts),BUCKET:{
  async get(key){return load(key)},async delete(key){fs.rmSync(filename(key),{force:true})},
  async put(key,data,options={}){const current=load(key),condition=options.onlyIf;if(condition?.get('If-Match')&&condition.get('If-Match')!==current?.httpEtag||condition?.get('If-None-Match')==='*'&&current)return null;fs.mkdirSync(folder,{recursive:true,mode:0o700});fs.writeFileSync(filename(key),data,{mode:0o600});return load(key)}
 }};
}
