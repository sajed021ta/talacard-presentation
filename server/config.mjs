import path from 'node:path';
import {BlockList,isIP} from 'node:net';
export function serverConfig(root,options={},env=process.env){
 const mode=options.mode||env.TALACARD_MODE||(env.NODE_ENV==='production'?'self-hosted':'local'),selfHosted=mode==='self-hosted';
 if(!['local','self-hosted'].includes(mode))throw Error('Invalid TALACARD_MODE');
 let publicUrl=null;
 if(selfHosted){publicUrl=new URL(options.publicUrl||env.TALACARD_PUBLIC_URL||'');if(publicUrl.protocol!=='https:'||publicUrl.username||publicUrl.password||publicUrl.pathname!=='/'||publicUrl.search||publicUrl.hash)throw Error('TALACARD_PUBLIC_URL must be an HTTPS origin');}
 const dataDir=path.resolve(options.dataDir||env.TALACARD_DATA_DIR||(selfHosted?'/data':root));
 if(selfHosted&&(dataDir===root||dataDir.startsWith(root+path.sep)))throw Error('Persistent data must be outside the source directory');
 const accountsFile=path.resolve(options.accountsFile||env.TALACARD_ACCOUNTS_FILE||path.join(dataDir,'private/accounts.json'));
 if(selfHosted&&[path.join(root,'public'),path.join(root,'original'),path.join(dataDir,'media')].some(folder=>accountsFile===folder||accountsFile.startsWith(folder+path.sep)))throw Error('Account records cannot be placed in a served asset directory');
 const trusted=new BlockList();for(const raw of (options.trustedProxies||env.TALACARD_TRUSTED_PROXIES||'127.0.0.1/32,::1/128').split(',')){const [address,bits]=raw.trim().split('/');const family=isIP(address);if(!family)throw Error('Invalid trusted proxy');trusted.addSubnet(address,Number(bits??(family===4?32:128)),family===4?'ipv4':'ipv6')}
 const sessionSeconds=Number(options.sessionSeconds||env.TALACARD_SESSION_SECONDS||28800);if(!Number.isSafeInteger(sessionSeconds)||sessionSeconds<60||sessionSeconds>604800)throw Error('Invalid session duration');
 return {selfHosted,dataDir,publicUrl,sessionSeconds,accountsFile,trustProxy:options.trustProxy??env.TALACARD_TRUST_PROXY==='1',trusted,host:env.TALACARD_HOST||(selfHosted?'0.0.0.0':'127.0.0.1'),port:Number(env.TALACARD_PORT||(selfHosted?4187:4177))};
}
export function clientAddress(req,config){
 const remote=(req.socket.remoteAddress||'').replace(/^::ffff:/,''),family=isIP(remote);
 if(config.trustProxy&&family&&config.trusted.check(remote,family===4?'ipv4':'ipv6')){const last=String(req.headers['x-forwarded-for']||'').split(',').at(-1).trim();if(isIP(last))return last}
 return remote||'unknown';
}
