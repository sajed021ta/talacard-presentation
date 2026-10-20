// Merge independent edits from concurrent tabs; never choose a winner for a shared field.
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const keyed=list=>Array.isArray(list)&&list.every(x=>x&&typeof x==='object'&&typeof x.id==='string')&&new Set(list.map(x=>x.id)).size===list.length;
export function reconcileProjects(base,local,remote){
 const conflicts=[];
 function merge(b,l,r,path){
  if(same(l,r))return copy(l);if(same(l,b))return copy(r);if(same(r,b))return copy(l);
  if(keyed(b)&&keyed(l)&&keyed(r)){
   const maps=[b,l,r].map(items=>new Map(items.map(x=>[x.id,x]))),values=new Map();
   for(const id of new Set([...maps[0].keys(),...maps[1].keys(),...maps[2].keys()])){const value=merge(maps[0].get(id),maps[1].get(id),maps[2].get(id),path+'.'+id);if(value!==undefined)values.set(id,value)}
   const existing=b.map(x=>x.id),order=items=>items.map(x=>x.id).filter(id=>existing.includes(id)&&values.has(id));
   const original=existing.filter(id=>values.has(id)),lo=order(l),ro=order(r);
   const localReordered=!same(lo,original.filter(id=>lo.includes(id))),remoteReordered=!same(ro,original.filter(id=>ro.includes(id)));
   if(localReordered&&remoteReordered&&!same(lo,ro))conflicts.push(path+'.order');
   const ids=(localReordered?l:r).map(x=>x.id).filter(id=>values.has(id));
   for(const items of [l,r])for(let i=0;i<items.length;i++){const id=items[i].id;if(!values.has(id)||ids.includes(id))continue;const previous=items.slice(0,i).map(x=>x.id).filter(id=>ids.includes(id)).at(-1);ids.splice(previous===undefined?0:ids.indexOf(previous)+1,0,id)}
   return ids.map(id=>values.get(id));
  }
  if(b&&l&&r&&[b,l,r].every(x=>typeof x==='object'&&!Array.isArray(x))){const result={};for(const key of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){const value=merge(b[key],l[key],r[key],path+'.'+key);if(value!==undefined)result[key]=value}return result}
  conflicts.push(path);return copy(l);
 }
 const project=merge(base,local,remote,'project');return {project,conflicts};
}
// Keep scene references held by rich text controls alive during a successful merge.
export function applyProjectInPlace(target,next){
 for(const key of Object.keys(target))if(!(key in next))delete target[key];
 for(const [key,value] of Object.entries(next)){
  if(keyed(value)&&keyed(target[key])){const old=new Map(target[key].map(x=>[x.id,x]));target[key]=value.map(x=>{const item=old.get(x.id);return item?applyProjectInPlace(item,x):copy(x)})}
  else if(value&&target[key]&&typeof value==='object'&&typeof target[key]==='object'&&!Array.isArray(value)&&!Array.isArray(target[key]))applyProjectInPlace(target[key],value);
  else target[key]=copy(value);
 }
 return target;
}
