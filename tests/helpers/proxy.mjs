import http from 'node:http';
// Model Caddy's preserved Host over plain HTTP to the private backend.
export function proxyRequest(base,publicOrigin,p,options={}){
 const target=new URL(base);return new Promise((resolve,reject)=>{
  const req=http.request({hostname:target.hostname,port:target.port,path:p,method:options.method||'GET',headers:{Host:new URL(publicOrigin).host,...options.headers}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{const headers=new Headers();for(const [key,value] of Object.entries(res.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value);resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers}))});res.on('error',reject)});
  req.on('error',reject);req.setTimeout(15000,()=>req.destroy(Error('Proxy request timed out')));req.end(options.body);
 });
}
