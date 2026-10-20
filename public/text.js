// Plain structured runs are the only persisted text format. Never store or render HTML.
export const FAMILIES=['YekanX','Tahoma','Arial'];
export const ALIGNS=['right','center','left','justify'];
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
export function textBlocks(scene){return scene.textBlocks ?? splitSentences(scene.description).map((text,i)=>({id:'description-'+i,runs:[{text}],format:{}}))}
export function ensureTextBlocks(scene){if(!scene.textBlocks)scene.textBlocks=textBlocks(scene);return scene.textBlocks}
export function syncDescription(scene){scene.description=(scene.textBlocks||[]).map(b=>runsText(b.runs)).join('\n')}
export function trimRuns(runs,max){let left=Math.max(0,max);return runs.map(r=>{const next={...r,text:r.text.slice(0,left)};left-=next.text.length;return next}).filter(r=>r.text.length)}
export function sliceRuns(runs,start,end){let cursor=0;const result=[];for(const r of runs){const from=Math.max(0,start-cursor),to=Math.min(r.text.length,end-cursor);if(to>from)result.push({...r,text:r.text.slice(from,to)});cursor+=r.text.length}return result}
const cssMap={fontFamily:'fontFamily',fontSize:'fontSize',color:'color',align:'textAlign',lineHeight:'lineHeight'};
export function formatElement(el,format={}){
 for(const [k,css] of Object.entries(cssMap))el.style[css]=format[k]===undefined?'':k==='fontSize'?format[k]+'px':format[k];
 for(const [key,prop,on,off] of [['bold','fontWeight','700','400'],['italic','fontStyle','italic','normal'],['underline','textDecoration','underline','none']])el.style[prop]=format[key]===undefined?'':format[key]?on:off;
}
export function renderRuns(el,runs,highlight='',accent=''){
 el.replaceChildren();let offset=0;const plain=runsText(runs),at=highlight?plain.indexOf(highlight):-1;
 for(const r of runs){
  const cuts=[0,r.text.length];if(at>=0){for(const point of [at-offset,at+highlight.length-offset])if(point>0&&point<r.text.length)cuts.push(point)}cuts.sort((a,b)=>a-b);
  for(let i=1;i<cuts.length;i++){
   const span=el.ownerDocument.createElement('span');span.textContent=r.text.slice(cuts[i-1],cuts[i]);formatElement(span,r);
   if(!r.color&&at>=0&&offset+cuts[i-1]>=at&&offset+cuts[i-1]<at+highlight.length)span.style.color=accent;
   el.append(span);
  }offset+=r.text.length;
 }
}
export function renderTitle(el,scene){formatElement(el,scene.titleFormat);renderRichContent(el,scene.titleRuns||[{text:scene.title}],scene.titleFormat,scene.highlight,scene.accent)}
export function renderDescription(root,container,scene,mode,legacy=false){
 root.querySelectorAll(':scope > .placed-text').forEach(el=>el.remove());container.replaceChildren();
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

export function bulletLines(runs){const text=runsText(runs);let offset=0;return text.split('\n').map(line=>{const value=sliceRuns(runs,offset,offset+line.length);offset+=line.length+1;return value})}
export function renderRichContent(el,runs,format={},highlight='',accent=''){
 if(format?.list!=='bullet'){renderRuns(el,runs,highlight,accent);return}
 const list=el.ownerDocument.createElement('ul');list.className='rich-bullet-list';const lines=bulletLines(runs);let offset=0;const highlightAt=highlight?runsText(runs).indexOf(highlight):-1;
 for(const [i,line] of lines.entries()){
  const item=el.ownerDocument.createElement('li');item.className='rich-bullet-item';
  const lineText=runsText(line),lineHighlight=highlightAt>=offset&&highlightAt+highlight.length<=offset+lineText.length?highlight:'';
  renderRuns(item,line,lineHighlight,accent);if(i<lines.length-1){const separator=el.ownerDocument.createElement('span');separator.className='list-line-break';separator.textContent='\n';item.append(separator)}
  list.append(item);offset+=lineText.length+1;
 }
 el.replaceChildren(list);
}
