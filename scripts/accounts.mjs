import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateAccounts} from '../cloud/auth.js';
import {atomicWrite} from '../server/storage.mjs';
export function importAccounts(input,{file,passwords=false}={}){
 if(!file)throw Error('An account file destination is required');
 if(fs.existsSync(file))throw Error('Accounts already exist. No accounts or passwords were replaced.');
 let records=Array.isArray(input)?input:input.accounts;
 if(passwords){
  if(!Array.isArray(records))throw Error('Expected a private accounts array');
  records=records.map(a=>{if(typeof a.password!=='string'||a.password.length<8||a.password.length>256)throw Error('Password length must be 8–256 characters');const salt=crypto.randomBytes(16).toString('hex'),iterations=600000;return {username:a.username,role:a.role,salt,iterations,hash:crypto.pbkdf2Sync(a.password,Buffer.from(salt,'hex'),iterations,32,'sha256').toString('hex')}});
 }
 validateAccounts(records);if(!records.some(a=>['admin','editor'].includes(a.role)))throw Error('At least one administrator account is required');
 fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});if(!fs.lstatSync(path.dirname(file)).isDirectory())throw Error('Account directory must not be a symlink');fs.chmodSync(path.dirname(file),0o700);
 atomicWrite(file,JSON.stringify({accounts:records},null,2)+'\n',{exclusive:true});return records.length;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const command=process.argv[2];if(!['import-hashes','import-passwords'].includes(command)||!process.argv.includes('--stdin'))throw Error('Usage: node scripts/accounts.mjs import-hashes|import-passwords --stdin. Supply private JSON on stdin; existing accounts are never overwritten.');
  let text='';for await(const part of process.stdin){text+=part;if(Buffer.byteLength(text)>65536)throw Error('Account input is too large')}
  const file=process.env.TALACARD_ACCOUNTS_FILE||path.join(process.env.TALACARD_DATA_DIR||'/data','private/accounts.json');
  console.log('Imported '+importAccounts(JSON.parse(text),{file,passwords:command==='import-passwords'})+' accounts. Credentials were not printed.');
 }catch(error){console.error(error.message);process.exitCode=1}
}
