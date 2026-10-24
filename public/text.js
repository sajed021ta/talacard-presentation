// Plain structured runs are the only persisted text format. Never store or render HTML.
export const FAMILIES=['YekanX','Tahoma','Arial'];
export const ALIGNS=['right','center','left','justify'];
export const INLINE_FORMATS=['bold','italic','underline','strike','color','highlight','fontFamily','fontSize','href'];
export function safeTextLink(value){
 if(typeof value!=='string'||!value||value.length>2000||/[\s\\\u0000-\u001f]/.test(value))return false;
 if(/^(#[^#]*|\/(?!\/)|\?)/.test(value))return true;
 try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?Boolean(url.hostname):['mailto:','tel:'].includes(url.protocol)&&Boolean(url.pathname)}catch{return false}
}
export function splitSentences(text){
 const parts=[];let start=0;
 for(let i=0;i<text.length;i++){
  const c=text[i],decimal=c==='.'&&/[0-9۰-۹]/.test(text[i-1]||'')&&/[0-9۰-۹]/.test(text[i+1]||'');
  if(c==='\n'||(/[.!?؟]/.test(c)&&!decimal)){
   while(i+1<text.length&&/[.!?؟\s]/.test(text[i+1]))i++;
   parts.push(text.slice(start,i+1));start=i+1;
  }
 }
 if(start<text.length)parts.push(text.slice(start));
 const result=parts.filter(x=>x.trim());if(result.length>40)return [...result.slice(0,39),result.slice(39).join('')];return result;
}
export const runsText=runs=>runs.map(r=>r.text).join('');
const runFormat=run=>Object.fromEntries(Object.entries(run).filter(([key,value])=>key!=='text'&&value!==undefined&&value!==null&&value!==''));
export function normalizeRuns(runs){
 const result=[];for(const source of runs){if(!source?.text)continue;const next={text:source.text,...runFormat(source)},last=result.at(-1);if(last&&JSON.stringify(runFormat(last))===JSON.stringify(runFormat(next)))last.text+=next.text;else result.push(next)}return result;
}
export function applyRunFormat(runs,start,end,format){
 const length=runsText(runs).length,from=Math.max(0,Math.min(length,start)),to=Math.max(from,Math.min(length,end));if(from===to)return normalizeRuns(runs);
 const selected=sliceRuns(runs,from,to).map(run=>{const next={...run};for(const [key,value] of Object.entries(format)){if(value===undefined||value===null||value==='')delete next[key];else next[key]=value}return next});
 return normalizeRuns([...sliceRuns(runs,0,from),...selected,...sliceRuns(runs,to,length)]);
}
export function textBlocks(scene){return scene.textBlocks ?? splitSentences(scene.description).map((text,i)=>({id:'description-'+i,runs:[{text}],format:{}}))}
export function ensureTextBlocks(scene){if(!scene.textBlocks)scene.textBlocks=textBlocks(scene);return scene.textBlocks}
export function syncDescription(scene){scene.description=(scene.textBlocks||[]).map(b=>runsText(b.runs)).join('\n')}
export function trimRuns(runs,max){let left=Math.max(0,max);return runs.map(r=>{const next={...r,text:r.text.slice(0,left)};left-=next.text.length;return next}).filter(r=>r.text.length)}
export function sliceRuns(runs,start,end){let cursor=0;const result=[];for(const r of runs){const from=Math.max(0,start-cursor),to=Math.min(r.text.length,end-cursor);if(to>from)result.push({...r,text:r.text.slice(from,to)});cursor+=r.text.length}return result}
const cssMap={fontFamily:'fontFamily',fontSize:'fontSize',color:'color',highlight:'backgroundColor',align:'textAlign',lineHeight:'lineHeight'};
export function formatElement(el,format={}){
 for(const [k,css] of Object.entries(cssMap))el.style[css]=format[k]===undefined?'':k==='fontSize'?format[k]+'px':format[k];
 for(const [key,prop,on,off] of [['bold','fontWeight','700','400'],['italic','fontStyle','italic','normal']])el.style[prop]=format[key]===undefined?'':format[key]?on:off;
 const decoration=[];if(format.underline)decoration.push('underline');if(format.strike)decoration.push('line-through');el.style.textDecorationLine=decoration.join(' ');
 if(format.paragraphSpacing!==undefined)el.style.setProperty('--paragraph-spacing',format.paragraphSpacing+'em');else el.style.removeProperty('--paragraph-spacing');
}
export function renderRuns(el,runs,highlight='',accent=''){
 el.replaceChildren();let offset=0;const plain=runsText(runs),at=highlight?plain.indexOf(highlight):-1;
 for(const r of runs){
  const cuts=[0,r.text.length];if(at>=0){for(const point of [at-offset,at+highlight.length-offset])if(point>0&&point<r.text.length)cuts.push(point)}cuts.sort((a,b)=>a-b);
  for(let i=1;i<cuts.length;i++){
   const span=el.ownerDocument.createElement(safeTextLink(r.href)?'a':'span');span.textContent=r.text.slice(cuts[i-1],cuts[i]);formatElement(span,r);
   if(safeTextLink(r.href)){span.href=r.href;span.className='rich-inline-link';span.rel='noopener noreferrer';span.addEventListener('click',event=>{if(span.closest('[contenteditable=true]'))event.preventDefault()})}
   if(!r.color&&at>=0&&offset+cuts[i-1]>=at&&offset+cuts[i-1]<at+highlight.length)span.style.color=accent;
   el.append(span);
  }offset+=r.text.length;
 }
}
export function renderTitle(el,scene){formatElement(el,scene.titleFormat);renderRichContent(el,scene.titleRuns||[{text:scene.title}],scene.titleFormat,scene.highlight,scene.accent)}
export function renderDescription(root,container,scene,mode,legacy=false){
 root.querySelectorAll(':scope > .placed-text').forEach(el=>el.remove());container.replaceChildren();
 if(scene.table){renderSceneTable(container,scene.table);return}
 const computed=getComputedStyle(container),blocks=textBlocks(scene),explicit=Array.isArray(scene.textBlocks);
 for(const block of blocks){
  const el=container.ownerDocument.createElement(explicit?'div':'span');el.className='scene-text-box rich-text-block'+(explicit?'':' original-flow');el.dataset.textBlock=block.id;
  renderRichContent(el,block.runs,block.format);formatElement(el,block.format);
  const box=block.placement?.[mode];
  if(box){
   const placeholder=el.cloneNode(true);placeholder.removeAttribute('data-text-block');placeholder.classList.add('text-placeholder');container.append(placeholder);
   el.classList.add('placed-text');Object.assign(el.style,{position:legacy?'fixed':'absolute',left:box.x+'%',top:box.y+'%',width:box.w+'%',height:box.h+'%',fontSize:block.format?.fontSize?block.format.fontSize+'px':computed.fontSize,lineHeight:block.format?.lineHeight||computed.lineHeight,fontFamily:block.format?.fontFamily||computed.fontFamily,color:block.format?.color||computed.color});root.append(el);
  }else container.append(el);
 }
}

export function paragraphLines(runs){const text=runsText(runs);let offset=0;return text.split('\n').map(line=>{const value=sliceRuns(runs,offset,offset+line.length);offset+=line.length+1;return value})}
export const bulletLines=paragraphLines;
export function renderRichContent(el,runs,format={},highlight='',accent=''){
 el.dir=format.direction||'auto';
 if(!['bullet','ordered'].includes(format?.list)){
  if(!format.paragraphSpacing){renderRuns(el,runs,highlight,accent);return}
  const fragment=el.ownerDocument.createDocumentFragment(),lines=paragraphLines(runs);let offset=0,highlightAt=highlight?runsText(runs).indexOf(highlight):-1;
  for(const line of lines){const paragraph=el.ownerDocument.createElement('div');paragraph.className='rich-paragraph';const lineText=runsText(line),lineHighlight=highlightAt>=offset&&highlightAt+highlight.length<=offset+lineText.length?highlight:'';if(line.length)renderRuns(paragraph,line,lineHighlight,accent);else paragraph.append(el.ownerDocument.createElement('br'));fragment.append(paragraph);offset+=lineText.length+1}el.replaceChildren(fragment);return;
 }
 const list=el.ownerDocument.createElement(format.list==='ordered'?'ol':'ul');list.className='rich-bullet-list '+(format.list==='ordered'?'rich-ordered-list':'');const lines=bulletLines(runs);let offset=0;const highlightAt=highlight?runsText(runs).indexOf(highlight):-1;
 for(const [i,line] of lines.entries()){
  const item=el.ownerDocument.createElement('li');item.className='rich-bullet-item';
  const lineText=runsText(line),lineHighlight=highlightAt>=offset&&highlightAt+highlight.length<=offset+lineText.length?highlight:'';
  renderRuns(item,line,lineHighlight,accent);if(i<lines.length-1){const separator=el.ownerDocument.createElement('span');separator.className='list-line-break';separator.textContent='\n';item.append(separator)}
  list.append(item);offset+=lineText.length+1;
 }
 el.replaceChildren(list);
}

export function renderSceneTable(container,model){
 const table=container.ownerDocument.createElement('table');table.className='ownership-table';
 const head=table.createTHead().insertRow();for(const label of model.columns){const cell=container.ownerDocument.createElement('th');cell.scope='col';cell.textContent=label;head.append(cell)}
 const body=table.createTBody();for(const row of model.rows){const tr=body.insertRow();row.forEach((value,i)=>{const cell=container.ownerDocument.createElement(i===0?'th':'td');if(i===0)cell.scope='row';cell.textContent=value;tr.append(cell)})}container.append(table);
}
