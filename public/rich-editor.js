import {FAMILIES,textBlocks,ensureTextBlocks,runsText,renderRuns,renderRichContent,formatElement,syncDescription,trimRuns,splitSentences,sliceRuns} from './text.js';
const escaped=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const alignmentIcons={right:'M4 5h16M10 10h10M4 15h16M10 20h10',center:'M4 5h16M7 10h10M4 15h16M7 20h10',left:'M4 5h16M4 10h10M4 15h16M4 20h10',justify:'M4 5h16M4 10h16M4 15h16M4 20h16'};
export function richEditorMarkup(scene){
 const blocks=textBlocks(scene);
 return `<section class="word-section"><div class="word-toolbar" role="toolbar" aria-label="قالب‌بندی متن"><strong id="word-active">ویرایش عنوان</strong><div class="word-font-row"><select data-format="fontFamily" aria-label="فونت متن">${FAMILIES.map(x=>`<option value="${x}">${x==='YekanX'?'یکان':x}</option>`).join('')}</select><input type="number" data-format="fontSize" aria-label="اندازهٔ متن" min="12" max="96" value="19"><input type="color" data-format="color" aria-label="رنگ متن انتخاب‌شده" value="#222225"></div><div class="word-color-tools"><span id="word-selection" role="status">رنگ کل باکس</span><button type="button" data-color="#222225" aria-label="رنگ ذغالی" style="--swatch:#222225"><span></span></button><button type="button" data-color="#A87816" aria-label="رنگ طلایی" style="--swatch:#A87816"><span></span></button><button type="button" data-color="#b43838" aria-label="رنگ قرمز" style="--swatch:#b43838"><span></span></button><button type="button" data-color="#285a9f" aria-label="رنگ آبی" style="--swatch:#285a9f"><span></span></button><button type="button" data-color="#23754d" aria-label="رنگ سبز" style="--swatch:#23754d"><span></span></button><button type="button" data-color="#ffffff" aria-label="رنگ سفید" style="--swatch:#ffffff"><span></span></button></div><div class="word-tools"><button type="button" data-format="bold" aria-label="ضخیم" aria-pressed="false"><b>B</b></button><button type="button" data-format="italic" aria-label="مورب" aria-pressed="false"><i>I</i></button><button type="button" data-format="underline" aria-label="زیرخط" aria-pressed="false"><u>U</u></button>${Object.entries(alignmentIcons).map(([key,d])=>`<button type="button" data-align="${key}" aria-pressed="false" aria-label="${{right:'راست‌چین',center:'وسط‌چین',left:'چپ‌چین',justify:'تراز دوطرفه'}[key]}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg></button>`).join('')}</div><button type="button" class="word-list-button" data-list="bullet" aria-pressed="false" aria-label="فهرست بولت‌دار"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="19" cy="6" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="19" cy="18" r="1"/><path d="M3 6h11M3 12h11M3 18h11"/></svg><span>فهرست بولت‌دار</span></button><label class="word-line-height">فاصلهٔ خطوط <select data-format="lineHeight" aria-label="فاصلهٔ خطوط">${[1,1.3,1.6,1.9,2.1,2.5,3].map(x=>`<option value="${x}">${x}</option>`).join('')}</select></label><p class="hint">با انتخاب کلمه، فقط همان بخش را قالب‌بندی کن؛ بدون انتخاب، کل باکس تغییر می‌کند. در فهرست بولت‌دار، هر خط یک مورد است؛ با Enter مورد بعدی را بنویس.</p></div><label class="field word-label"><span>عنوان</span><div class="word-editor word-title" data-word-id="title" contenteditable="true" role="textbox" aria-label="عنوان با قالب‌بندی" aria-multiline="true" spellcheck="false" dir="rtl"></div></label><div class="text-block-heading"><h3>توضیحات · باکس‌های مستقل</h3><button type="button" class="button" data-block-action="add">افزودن باکس متن</button></div><div class="text-block-editors">${blocks.map((b,i)=>`<section class="text-block-editor" data-block-id="${escaped(b.id)}"><div class="text-block-tools"><label for="edit-${escaped(b.id)}">باکس ${i+1}</label><button type="button" class="text-button" data-block-action="select" aria-label="جابه‌جایی باکس ${i+1}">جابه‌جایی</button><button type="button" data-block-action="up" aria-label="باکس ${i+1} به بالا" ${i===0?'disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 14 7-7 7 7"/></svg></button><button type="button" data-block-action="down" aria-label="باکس ${i+1} به پایین" ${i===blocks.length-1?'disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 10 7 7 7-7"/></svg></button><button type="button" class="text-button danger" data-block-action="delete" aria-label="حذف باکس ${i+1}">حذف</button></div><div id="edit-${escaped(b.id)}" class="word-editor" data-word-id="${escaped(b.id)}" contenteditable="true" role="textbox" aria-label="متن باکس ${i+1}" aria-multiline="true" spellcheck="false" dir="rtl"></div><button type="button" class="text-button split-text" data-block-action="split">جمله‌ها را به باکس‌های جدا تبدیل کن</button></section>`).join('')}${blocks.length?'':'<p class="hint">هنوز باکس متنی نیست؛ یک باکس اضافه کن.</p>'}</div></section>`;
}
// Read only safe text and the formatting we authored. HTML is never persisted.
function readRuns(editor){
 const result=[];
 function append(text,format){if(!text)return;const last=result.at(-1),key=JSON.stringify(format);if(last&&JSON.stringify(Object.fromEntries(Object.entries(last).filter(([k])=>k!=='text')))===key)last.text+=text;else result.push({text,...format})}
 function walk(node,format={}){
  if(node.nodeType===3){append(node.textContent,format);return}if(node.nodeType!==1)return;
  if(node.classList?.contains('list-line-break'))return;
  if(node.tagName==='BR'){if(node.parentElement?.tagName==='LI'&&node.parentElement.childNodes.length===1)return;append('\n',format);return}
  const next={...format},style=node.style;
  if(style.fontWeight)next.bold=Number(style.fontWeight)>=600||style.fontWeight==='bold';
  if(style.fontStyle)next.italic=style.fontStyle==='italic';if(style.textDecoration)next.underline=style.textDecoration.includes('underline');
  if(style.fontSize)next.fontSize=parseFloat(style.fontSize);
  if(style.fontFamily){const family=style.fontFamily.replace(/["']/g,'');if(FAMILIES.includes(family))next.fontFamily=family}
  if(style.color){const rgb=style.color.match(/\d+/g);if(rgb?.length>=3)next.color='#'+rgb.slice(0,3).map(x=>Number(x).toString(16).padStart(2,'0')).join('');else if(/^#[a-f0-9]{6}$/i.test(style.color))next.color=style.color}
  if(node.tagName==='UL'){let i=0;for(const child of node.children){if(child.tagName==='LI'&&i++)append('\n',{});walk(child,next)}return}
  const isBlock=['DIV','P'].includes(node.tagName)&&node!==editor;
  if(isBlock&&result.length&&!result.at(-1).text.endsWith('\n'))append('\n',{});
  for(const child of node.childNodes)walk(child,next);
 }
 for(const node of editor.childNodes)walk(node);return result;
}
export function mountRichEditor(form,scene,{checkpoint,onEdit,onStructure,onSelectBlock}){
 const editors=[...form.querySelectorAll('.word-editor')],memories=new Map();let active=editors[0],lastRange=null,selectionBookmark=null,toolbarEditing=false,checkpointed=false;
 const getModel=id=>id==='title'?{runs:scene.titleRuns||[{text:scene.title}],format:scene.titleFormat||{}}:textBlocks(scene).find(b=>b.id===id);
 const current=()=>getModel(active?.dataset.wordId);
 function paint(editor){const model=getModel(editor.dataset.wordId);if(!model)return;formatElement(editor,model.format);renderRichContent(editor,model.runs,model.format);memories.set(editor,{current:JSON.stringify({runs:model.runs,format:model.format||{}}),undo:[],redo:[]})}
 editors.forEach(paint);
 function commit(editor,{remember=true,renderList=false}={}){
  const id=editor.dataset.wordId,old=getModel(id);if(!old)return;
  const limit=id==='title'?1000:Math.max(0,8000-(textBlocks(scene).length-1)-textBlocks(scene).filter(b=>b.id!==id).reduce((n,b)=>n+runsText(b.runs).length,0));
  let runs=readRuns(editor);if(runsText(runs).length>limit){runs=trimRuns(runs,limit);renderRuns(editor,runs)}
  if(!checkpointed){checkpoint();checkpointed=true}
  if(id==='title'){scene.titleRuns=runs;scene.title=runsText(runs);scene.titleFormat={...(old.format||{})}}
  else{const block=ensureTextBlocks(scene).find(b=>b.id===id);block.runs=runs;syncDescription(scene)}
  const model=getModel(id),snapshot=JSON.stringify({runs:model.runs,format:model.format||{}}),memory=memories.get(editor);
  if(remember&&memory.current!==snapshot){memory.undo.push(memory.current);if(memory.undo.length>80)memory.undo.shift();memory.redo=[]}memory.current=snapshot;
  if(renderList||(model.format?.list==='bullet'&&!editor.querySelector('.rich-bullet-list'))){const range=rangeForActive(),mark=range?offsets(range):null;renderRichContent(editor,model.runs,model.format);if(mark){selectionBookmark=mark;lastRange=rangeFromOffsets(mark);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(lastRange)}}
  onEdit();updateToolbar();
 }
 function setFormat(format){
  if(!active)return;if(!checkpointed){checkpoint();checkpointed=true}
  const id=active.dataset.wordId;let model;
  if(id==='title'){scene.titleFormat||={};model={format:scene.titleFormat,runs:scene.titleRuns||[{text:scene.title}]}}
  else model=ensureTextBlocks(scene).find(b=>b.id===id);
  Object.assign(model.format||=( {}),format);formatElement(active,model.format);commit(active,{renderList:Object.hasOwn(format,'list')});
 }
 function offsets(range){const before=document.createRange();before.selectNodeContents(active);before.setEnd(range.startContainer,range.startOffset);const prefix=document.createElement('div');prefix.append(before.cloneContents());const selected=document.createElement('div');selected.append(range.cloneContents());const start=runsText(readRuns(prefix)).length;return {start,end:start+runsText(readRuns(selected)).length}}
 function rangeFromOffsets(mark){const range=document.createRange(),walker=document.createTreeWalker(active,NodeFilter.SHOW_TEXT);let node,pos=0,start=false;while(node=walker.nextNode()){const end=pos+node.length;if(!start&&mark.start<=end){range.setStart(node,Math.max(0,mark.start-pos));start=true}if(start&&mark.end<=end){range.setEnd(node,Math.max(0,mark.end-pos));return range}pos=end}range.selectNodeContents(active);range.collapse(false);return range}
 function rememberSelection(){if(toolbarEditing)return;const selection=window.getSelection();if(selection?.rangeCount){const range=selection.getRangeAt(0),editor=(selection.anchorNode?.nodeType===1?selection.anchorNode:selection.anchorNode?.parentElement)?.closest?.('.word-editor');if(editor&&form.contains(editor)&&editor.contains(range.commonAncestorContainer)){active=editor;lastRange=range.cloneRange();selectionBookmark=offsets(range);updateToolbar()}}}
 function rangeForActive(){if(selectionBookmark)return rangeFromOffsets(selectionBookmark);if(!lastRange||!active.contains(lastRange.commonAncestorContainer))return null;return lastRange.cloneRange()}
 function selectionElement(){const range=rangeForActive();let node=range?.startContainer;if(node?.nodeType===1&&node.childNodes.length){node=node.childNodes[Math.min(range.startOffset,node.childNodes.length-1)];while(node.nodeType===1&&node.firstChild)node=node.firstChild}return node?.nodeType===1?node:node?.parentElement||active}
 function styleAtSelection(){return getComputedStyle(selectionElement())}
 function selectedStyle(property){let element=selectionElement();while(element&&element!==active){if(element.style?.[property])return element.style[property];element=element.parentElement}return ''}
 function colorHex(value){const rgb=value?.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);return rgb?'#'+rgb.slice(1,4).map(n=>Number(n).toString(16).padStart(2,'0')).join(''):value}
 function updateToolbar(){if(!active)return;const model=current(),style=styleAtSelection();form.querySelector('#word-active').textContent=active.dataset.wordId==='title'?'ویرایش عنوان':active.getAttribute('aria-label');
  const pressed={bold:Number(style.fontWeight)>=600,italic:style.fontStyle==='italic',underline:style.textDecorationLine.includes('underline')};
  form.querySelectorAll('button[data-format]').forEach(b=>b.setAttribute('aria-pressed',String(pressed[b.dataset.format])));
  form.querySelectorAll('[data-align]').forEach(b=>b.setAttribute('aria-pressed',String((model.format?.align||'right')===b.dataset.align)));
  form.querySelector('[data-list]').setAttribute('aria-pressed',String(model.format?.list==='bullet'));
  const size=form.querySelector('[data-format=fontSize]');if(document.activeElement!==size)size.value=String(parseFloat(selectedStyle('fontSize'))||model.format?.fontSize||(active.dataset.wordId==='title'?scene.fontSize:19));
  const family=form.querySelector('[data-format=fontFamily]');if(document.activeElement!==family)family.value=selectedStyle('fontFamily').replace(/["']/g,'')||model.format?.fontFamily||'YekanX';
  const color=form.querySelector('[data-format=color]');if(document.activeElement!==color)color.value=colorHex(selectedStyle('color')||model.format?.color||scene.textColor||'#222225');
  const mark=selectionBookmark;form.querySelector('#word-selection').textContent=mark&&mark.end>mark.start?'رنگ فقطِ متن انتخاب‌شده ('+(mark.end-mark.start)+' حرف)':'رنگ کل باکس';
  const height=form.querySelector('[data-format=lineHeight]');if(document.activeElement!==height)height.value=String(model.format?.lineHeight||2.1);
 }
 function formatSelection(key,value){
  if(!active)return;
  if(['align','lineHeight','list'].includes(key)){setFormat({[key]:value});return}
  const range=rangeForActive();
  if(range&&!range.collapsed){
   if(!checkpointed){checkpoint();checkpointed=true}
   const mark=offsets(range),runs=readRuns(active);
   renderRichContent(active,[...sliceRuns(runs,0,mark.start),...sliceRuns(runs,mark.start,mark.end).map(r=>({...r,[key]:value})),...sliceRuns(runs,mark.end,runsText(runs).length)],current().format);
   selectionBookmark=mark;lastRange=rangeFromOffsets(mark);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(lastRange);commit(active);

  }else{
   const model=current();renderRichContent(active,model.runs.map(r=>({...r,[key]:value})),model.format);setFormat({[key]:value});
  }
 }
 function undo(editor,redo=false){const memory=memories.get(editor),from=redo?memory.redo:memory.undo,to=redo?memory.undo:memory.redo;if(!from.length)return;to.push(memory.current);const snapshot=from.pop(),value=JSON.parse(snapshot),id=editor.dataset.wordId;
  if(id==='title'){scene.titleFormat=value.format;scene.titleRuns=value.runs;scene.title=runsText(value.runs)}else{const block=ensureTextBlocks(scene).find(b=>b.id===id);block.format=value.format;block.runs=value.runs;syncDescription(scene)}
  formatElement(editor,value.format);renderRichContent(editor,value.runs,value.format);memory.current=snapshot;lastRange=null;selectionBookmark=null;onEdit();updateToolbar();
 }
 for(const editor of editors){
  editor.addEventListener('focus',()=>{active=editor;toolbarEditing=false;checkpointed=false;onSelectBlock(editor.dataset.wordId==='title'?null:editor.dataset.wordId);updateToolbar()});
  editor.addEventListener('input',()=>commit(editor));
  editor.addEventListener('paste',e=>{e.preventDefault();const value=e.clipboardData.getData('text/plain'),selection=window.getSelection();if(!selection?.rangeCount)return;const range=selection.getRangeAt(0);range.deleteContents();const node=document.createTextNode(value);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);lastRange=range.cloneRange();commit(editor)});
  editor.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey))return;const key=e.key.toLowerCase();if(['b','i','u'].includes(key)){e.preventDefault();const format={b:'bold',i:'italic',u:'underline'}[key],style=styleAtSelection();formatSelection(format,format==='bold'?Number(style.fontWeight)<600:format==='italic'?style.fontStyle!=='italic':!style.textDecorationLine.includes('underline'))}else if(key==='z'||key==='y'){e.preventDefault();e.stopPropagation();undo(editor,e.shiftKey||key==='y')}});
 }
 const toolbar=form.querySelector('.word-toolbar');
 toolbar.addEventListener('pointerdown',()=>{rememberSelection();toolbarEditing=true});
 toolbar.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault()});
 toolbar.addEventListener('focusout',e=>{if(!toolbar.contains(e.relatedTarget))toolbarEditing=false});
 toolbar.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.dataset.list){formatSelection('list',current().format?.list==='bullet'?'none':'bullet');return}if(button.dataset.color){formatSelection('color',button.dataset.color);return}if(button.dataset.align)formatSelection('align',button.dataset.align);else if(button.dataset.format)formatSelection(button.dataset.format,button.getAttribute('aria-pressed')!=='true')});
 toolbar.querySelectorAll('input,select').forEach(control=>control.addEventListener(control.tagName==='INPUT'?'input':'change',()=>{let value=control.value;if(['fontSize','lineHeight'].includes(control.dataset.format)){value=Number(value);if(!Number.isFinite(value)||value<Number(control.min||1)||value>Number(control.max||96))return}formatSelection(control.dataset.format,value)}));
 const actionHandler=e=>{
  const button=e.target.closest('[data-block-action]');if(!button)return;
  const id=button.closest('[data-block-id]')?.dataset.blockId,action=button.dataset.blockAction;
  if(action==='select'){onSelectBlock(id);return}
  const blocks=textBlocks(scene);if(action==='add'&&blocks.length>=40)return;
  checkpoint();const list=ensureTextBlocks(scene),i=list.findIndex(b=>b.id===id);let focus=id;
  if(action==='add'){const block={id:'text-'+crypto.randomUUID(),runs:[],format:{}};list.push(block);focus=block.id}
  else if(action==='delete'){list.splice(i,1);focus=list[Math.min(i,list.length-1)]?.id}
  else if(action==='up'||action==='down'){const next=i+(action==='up'?-1:1);if(next>=0&&next<list.length)[list[i],list[next]]=[list[next],list[i]]}
  else if(action==='split'){
   const block=list[i],sentences=splitSentences(runsText(block.runs));if(sentences.length<2||list.length+sentences.length-1>40)return;
   let start=0;const replacements=sentences.map((text,j)=>{const b={id:j===0?block.id:'text-'+crypto.randomUUID(),runs:sliceRuns(block.runs,start,start+text.length),format:{...block.format},...(j===0&&block.placement?{placement:block.placement}:{})};start+=text.length;return b});list.splice(i,1,...replacements);
  }
  syncDescription(scene);onEdit();onStructure(focus);
 };
 form.addEventListener('click',actionHandler);document.addEventListener('selectionchange',rememberSelection);updateToolbar();
 return ()=>{document.removeEventListener('selectionchange',rememberSelection);form.removeEventListener('click',actionHandler)};
}
