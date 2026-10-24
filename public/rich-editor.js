import {
  FAMILIES, applyRunFormat, ensureTextBlocks, formatElement, normalizeRuns,
  renderRichContent, runsText, sliceRuns, splitSentences, syncDescription,
  textBlocks, trimRuns, safeTextLink
} from './text.js';

const escaped=value=>String(value).replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);
const alignmentIcons={
  right:'M4 5h16M10 10h10M4 15h16M10 20h10',
  center:'M4 5h16M7 10h10M4 15h16M7 20h10',
  left:'M4 5h16M4 10h10M4 15h16M4 20h10',
  justify:'M4 5h16M4 10h16M4 15h16M4 20h16'
};
const svg=d=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

export function richEditorMarkup(scene){
  const blocks=textBlocks(scene);
  const alignments=Object.entries(alignmentIcons).map(([key,path])=>
    `<button type="button" data-align="${key}" aria-pressed="false" aria-label="${{right:'راست‌چین',center:'وسط‌چین',left:'چپ‌چین',justify:'تراز دوطرفه'}[key]}">${svg(path)}</button>`
  ).join('');
  return `<section class="word-section">
    <div class="word-toolbar" role="toolbar" aria-label="قالب‌بندی متن" data-tools="font">
      <div class="word-toolbar-heading"><strong id="word-active">ویرایش عنوان</strong><div class="word-history"><button type="button" data-history="undo" aria-label="Undo · بازگردانی" disabled>↶</button><button type="button" data-history="redo" aria-label="Redo · انجام دوباره" disabled>↷</button></div></div>
      <div class="word-tool-tabs" role="tablist" aria-label="ابزارهای متن"><button type="button" role="tab" data-rich-tab="font" aria-selected="true">فونت و رنگ</button><button type="button" role="tab" data-rich-tab="paragraph" aria-selected="false">پاراگراف</button><button type="button" role="tab" data-rich-tab="link" aria-selected="false">لینک</button></div>
      <div class="word-font-row" data-rich-panel="font">
        <select data-format="fontFamily" aria-label="فونت متن">${FAMILIES.map(value=>`<option value="${value}">${value==='YekanX'?'یکان':value}</option>`).join('')}</select>
        <input type="number" data-format="fontSize" aria-label="اندازهٔ متن" min="12" max="96" value="19">
        <label class="word-color-input"><span>متن</span><input type="color" data-format="color" aria-label="رنگ متن انتخاب‌شده" value="#222225"></label>
        <label class="word-color-input"><span>زمینه</span><input type="color" data-format="highlight" aria-label="رنگ Highlight انتخاب‌شده" value="#f4df98"></label>
      </div>
      <span id="word-selection" class="word-selection-status" role="status">قالب کل باکس</span>
      <div class="word-color-tools" data-rich-panel="font">
        ${[['#222225','ذغالی'],['#A87816','طلایی'],['#b43838','قرمز'],['#285a9f','آبی'],['#23754d','سبز'],['#ffffff','سفید']].map(([color,label])=>`<button type="button" data-color="${color}" aria-label="رنگ ${label}" style="--swatch:${color}"><span></span></button>`).join('')}
        <button type="button" data-clear-highlight aria-label="حذف Highlight">بدون زمینه</button>
      </div>
      <div class="word-tools" data-rich-panel="font">
        <button type="button" data-format="bold" aria-label="Bold · ضخیم" aria-pressed="false"><b>B</b></button>
        <button type="button" data-format="italic" aria-label="Italic · مورب" aria-pressed="false"><i>I</i></button>
        <button type="button" data-format="underline" aria-label="Underline · زیرخط" aria-pressed="false"><u>U</u></button>
        <button type="button" data-format="strike" aria-label="Strikethrough · خط‌خورده" aria-pressed="false"><s>S</s></button>
      </div>
      <div class="word-tools" data-rich-panel="paragraph">${alignments}</div>
      <div class="word-list-actions" data-rich-panel="paragraph">
        <button type="button" class="word-list-button" data-list="bullet" aria-pressed="false" aria-label="فهرست بولت‌دار">• فهرست بولت</button>
        <button type="button" class="word-list-button" data-list="ordered" aria-pressed="false" aria-label="فهرست شماره‌دار">۱. فهرست شماره‌دار</button>
      </div>
      <div class="word-link-tools" data-rich-panel="link"><label class="field"><span>لینک متن انتخاب‌شده</span><input type="url" data-link-url dir="ltr" placeholder="https://example.com" aria-label="آدرس لینک متن"></label><div class="word-list-actions"><button type="button" data-link-action="apply">اعمال لینک</button><button type="button" data-link-action="remove">حذف لینک</button></div></div>
      <div class="word-spacing-row" data-rich-panel="paragraph">
        <label class="word-line-height">فاصلهٔ خطوط <select data-format="lineHeight" aria-label="فاصلهٔ خطوط">${[1,1.3,1.6,1.9,2.1,2.5,3].map(value=>`<option value="${value}">${value}</option>`).join('')}</select></label>
        <label class="word-line-height">فاصلهٔ پاراگراف <select data-format="paragraphSpacing" aria-label="فاصلهٔ پاراگراف‌ها">${[0,.25,.5,.75,1,1.5,2].map(value=>`<option value="${value}">${value}</option>`).join('')}</select></label>
      </div>
      <p class="hint">متن را در پیش‌نمایش یا این باکس انتخاب کن. قالب فقط روی همان انتخاب اعمال می‌شود؛ بدون انتخاب، کل باکس تغییر می‌کند.</p>
    </div>
    <label class="field word-label"><span>عنوان</span><div class="word-editor word-title" data-word-id="title" contenteditable="true" role="textbox" aria-label="عنوان با قالب‌بندی" aria-multiline="true" spellcheck="false" dir="auto"></div></label>
    <div class="text-block-heading"><h3>توضیحات · باکس‌های مستقل</h3><button type="button" class="button" data-block-action="add">افزودن باکس متن</button></div>
    <div class="text-block-editors">${blocks.map((block,index)=>`<section class="text-block-editor" data-block-id="${escaped(block.id)}">
      <div class="text-block-tools"><label for="edit-${escaped(block.id)}">باکس ${index+1}</label><button type="button" class="text-button" data-block-action="select">جابه‌جایی</button><button type="button" data-block-action="up" ${index===0?'disabled':''}>${svg('m5 14 7-7 7 7')}</button><button type="button" data-block-action="down" ${index===blocks.length-1?'disabled':''}>${svg('m5 10 7 7 7-7')}</button><button type="button" class="text-button danger" data-block-action="delete">حذف</button></div>
      <div id="edit-${escaped(block.id)}" class="word-editor" data-word-id="${escaped(block.id)}" contenteditable="true" role="textbox" aria-label="متن باکس ${index+1}" aria-multiline="true" spellcheck="false" dir="auto"></div>
      <button type="button" class="text-button split-text" data-block-action="split">جمله‌ها را به باکس‌های جدا تبدیل کن</button>
    </section>`).join('')}${blocks.length?'':'<p class="hint">هنوز باکس متنی نیست؛ یک باکس اضافه کن.</p>'}</div>
  </section>`;
}

const colorHex=value=>{
  const rgb=String(value||'').match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return rgb?'#'+rgb.slice(1,4).map(number=>Number(number).toString(16).padStart(2,'0')).join(''):value;
};
const inlineFormat=node=>{
  const style=node.style||{},format={};
  if(['B','STRONG'].includes(node.tagName)||style.fontWeight==='bold'||Number(style.fontWeight)>=600)format.bold=true;
  if(['I','EM'].includes(node.tagName)||style.fontStyle==='italic')format.italic=true;
  const decoration=`${style.textDecoration||''} ${style.textDecorationLine||''}`;
  if(node.tagName==='U'||decoration.includes('underline'))format.underline=true;
  if(['S','STRIKE','DEL'].includes(node.tagName)||decoration.includes('line-through'))format.strike=true;
  if(style.fontSize)format.fontSize=parseFloat(style.fontSize);
  if(style.fontFamily){const family=style.fontFamily.replace(/["']/g,'').split(',')[0];if(FAMILIES.includes(family))format.fontFamily=family}
  if(style.color){const color=colorHex(style.color);if(/^#[a-f0-9]{6}$/i.test(color))format.color=color}
  if(style.backgroundColor&&style.backgroundColor!=='transparent'&&style.backgroundColor!=='rgba(0, 0, 0, 0)'){const highlight=colorHex(style.backgroundColor);if(/^#[a-f0-9]{6}$/i.test(highlight))format.highlight=highlight}
  if(node.tagName==='A'&&safeTextLink(node.getAttribute('href')))format.href=node.getAttribute('href');
  return format;
};

// Reads only text and the formatting authored by this editor. Arbitrary HTML is discarded.
export function readEditableRuns(editor){
  const result=[];
  const append=(text,format={})=>{
    if(!text)return;
    const next={text,...format},last=result.at(-1);
    const key=value=>JSON.stringify(Object.fromEntries(Object.entries(value).filter(([name])=>name!=='text')));
    if(last&&key(last)===key(next))last.text+=text;else result.push(next);
  };
  const newline=()=>{if(result.length&&!result.at(-1).text.endsWith('\n'))append('\n')};
  function walk(node,inherited={}){
    if(node.nodeType===3){append(node.textContent,inherited);return}
    if(node.nodeType!==1||node.classList?.contains('list-line-break'))return;
    if(node.tagName==='BR'){append('\n',inherited);return}
    const format={...inherited,...inlineFormat(node)};
    if(['UL','OL'].includes(node.tagName)){
      [...node.children].filter(child=>child.tagName==='LI').forEach((child,index)=>{if(index)newline();walk(child,format)});
      return;
    }
    const block=['DIV','P'].includes(node.tagName)&&node!==editor;
    if(block)newline();
    for(const child of node.childNodes)walk(child,format);
  }
  for(const child of editor.childNodes)walk(child);
  return normalizeRuns(result);
}

export function mountRichEditor(form,scene,{checkpoint,onEdit,onStructure,onSelectBlock,getExternalEditors=()=>[],externalRoots=[]}){
  const inspectorEditors=[...form.querySelectorAll('.word-editor')];
  const histories=new Map();let active=inspectorEditors[0]||null,bookmark=null,toolbarEditing=false,checkpointed=false;
  const editorId=editor=>editor?.dataset.wordId;
  const modelFor=id=>id==='title'?{runs:scene.titleRuns||[{text:scene.title}],format:scene.titleFormat||{}}:textBlocks(scene).find(block=>block.id===id);
  const allEditors=()=>[...inspectorEditors,...getExternalEditors()].filter((editor,index,list)=>editor&&list.indexOf(editor)===index);
  const isDirect=editor=>!inspectorEditors.includes(editor);
  const snapshot=id=>{const model=modelFor(id);return JSON.stringify({runs:model?.runs||[],format:model?.format||{}})};
  const historyFor=id=>{if(!histories.has(id))histories.set(id,{current:snapshot(id),undo:[],redo:[]});return histories.get(id)};
  const paint=editor=>{const model=modelFor(editorId(editor));if(!model)return;formatElement(editor,model.format);renderRichContent(editor,model.runs,model.format)};
  allEditors().forEach(editor=>{paint(editor);historyFor(editorId(editor))});
  const peers=id=>allEditors().filter(editor=>editorId(editor)===id);
  const writeModel=(id,runs,format)=>{
    if(id==='title'){scene.titleRuns=runs;scene.title=runsText(runs);scene.titleFormat={...format}}
    else{const block=ensureTextBlocks(scene).find(item=>item.id===id);block.runs=runs;block.format={...format};syncDescription(scene)}
  };
  const record=(id,previous)=>{const memory=historyFor(id),next=snapshot(id);if(next===previous)return;memory.undo.push(previous);if(memory.undo.length>80)memory.undo.shift();memory.redo=[];memory.current=next};
  const ensureCheckpoint=()=>{if(!checkpointed){checkpoint();checkpointed=true}};
  const syncPeers=(id,except)=>peers(id).forEach(editor=>{if(editor!==except)paint(editor)});
  const documentSelection=editor=>editor?.ownerDocument?.defaultView?.getSelection();
  const rangeOffsets=(editor,range)=>{
    const doc=editor.ownerDocument,before=doc.createRange();before.selectNodeContents(editor);before.setEnd(range.startContainer,range.startOffset);
    const prefix=doc.createElement('div'),selected=doc.createElement('div');prefix.append(before.cloneContents());selected.append(range.cloneContents());
    const start=runsText(readEditableRuns(prefix)).length;return {start,end:start+runsText(readEditableRuns(selected)).length};
  };
  const rangeFromOffsets=(editor,mark)=>{
    const doc=editor.ownerDocument,range=doc.createRange(),walker=doc.createTreeWalker(editor,doc.defaultView.NodeFilter.SHOW_TEXT);let node,position=0,started=false;
    while((node=walker.nextNode())){const end=position+node.length;if(!started&&mark.start<=end){range.setStart(node,Math.max(0,mark.start-position));started=true}if(started&&mark.end<=end){range.setEnd(node,Math.max(0,mark.end-position));return range}position=end}
    range.selectNodeContents(editor);range.collapse(false);return range;
  };
  const restoreSelection=(editor,mark)=>{if(!mark)return;const range=rangeFromOffsets(editor,mark),selection=documentSelection(editor);selection.removeAllRanges();selection.addRange(range);bookmark={editor,start:mark.start,end:mark.end}};
  const selectionRange=()=>bookmark?.editor===active?rangeFromOffsets(active,bookmark):null;
  const rememberSelection=doc=>{
    if(toolbarEditing)return;const selection=doc.defaultView?.getSelection();if(!selection?.rangeCount)return;
    const range=selection.getRangeAt(0),element=(selection.anchorNode?.nodeType===1?selection.anchorNode:selection.anchorNode?.parentElement)?.closest?.('[data-word-id]');
    if(!element||!allEditors().includes(element)||!element.contains(range.commonAncestorContainer))return;
    active=element;bookmark={editor:element,...rangeOffsets(element,range)};updateToolbar();
  };
  const selectionElement=()=>{
    const range=selectionRange();let node=range?.startContainer;if(!node)return active;
    if(node.nodeType===1&&node.childNodes.length)node=node.childNodes[Math.min(range.startOffset,node.childNodes.length-1)]||node;
    while(node.nodeType===1&&node.firstChild)node=node.firstChild;
    return node.nodeType===1?node:node.parentElement||active;
  };
  const selectedStyle=property=>{let element=selectionElement();while(element&&element!==active){if(element.style?.[property])return element.style[property];element=element.parentElement}return ''};
  const updateToolbar=()=>{
    if(!active)return;const id=editorId(active),model=modelFor(id),computed=active.ownerDocument.defaultView.getComputedStyle(selectionElement());
    form.querySelector('#word-active').textContent=id==='title'?'ویرایش عنوان':active.getAttribute('aria-label')||'ویرایش متن انتخاب‌شده';
    const pressed={bold:Number(computed.fontWeight)>=600,italic:computed.fontStyle==='italic',underline:computed.textDecorationLine.includes('underline'),strike:computed.textDecorationLine.includes('line-through')};
    form.querySelectorAll('button[data-format]').forEach(button=>button.setAttribute('aria-pressed',String(pressed[button.dataset.format])));
    form.querySelectorAll('[data-align]').forEach(button=>button.setAttribute('aria-pressed',String((model.format?.align||'right')===button.dataset.align)));
    form.querySelectorAll('[data-list]').forEach(button=>button.setAttribute('aria-pressed',String(model.format?.list===button.dataset.list)));
    const set=(selector,value)=>{const control=form.querySelector(selector);if(control&&form.ownerDocument.activeElement!==control)control.value=String(value)};
    set('[data-format=fontSize]',parseFloat(selectedStyle('fontSize'))||model.format?.fontSize||(id==='title'?scene.fontSize:19));
    set('[data-format=fontFamily]',selectedStyle('fontFamily').replace(/["']/g,'').split(',')[0]||model.format?.fontFamily||'YekanX');
    set('[data-format=color]',colorHex(selectedStyle('color')||model.format?.color||scene.textColor||'#222225'));
    set('[data-format=highlight]',colorHex(selectedStyle('backgroundColor')||'#f4df98'));
    set('[data-link-url]',selectionElement()?.closest?.('a.rich-inline-link')?.getAttribute('href')||'');
    set('[data-format=lineHeight]',model.format?.lineHeight||2.1);set('[data-format=paragraphSpacing]',model.format?.paragraphSpacing||0);
    form.querySelector('#word-selection').textContent=bookmark&&bookmark.editor===active&&bookmark.end>bookmark.start?`قالب فقطِ متن انتخاب‌شده (${bookmark.end-bookmark.start} حرف)`:'قالب کل باکس';
    const memory=historyFor(id);form.querySelector('[data-history=undo]').disabled=!memory.undo.length;form.querySelector('[data-history=redo]').disabled=!memory.redo.length;
  };
  const commitInput=editor=>{
    const id=editorId(editor),model=modelFor(id);if(!model)return;ensureCheckpoint();const previous=snapshot(id);
    const max=id==='title'?1000:Math.max(0,8000-(textBlocks(scene).length-1)-textBlocks(scene).filter(block=>block.id!==id).reduce((total,block)=>total+runsText(block.runs).length,0));
    let runs=readEditableRuns(editor);if(runsText(runs).length>max){runs=trimRuns(runs,max);renderRichContent(editor,runs,model.format)}
    writeModel(id,runs,model.format);record(id,previous);syncPeers(id,editor);onEdit({direct:isDirect(editor)});updateToolbar();
  };
  const applyBlockFormat=(key,value)=>{
    const id=editorId(active),model=modelFor(id),previous=snapshot(id);ensureCheckpoint();model.format={...(model.format||{}),[key]:value};writeModel(id,model.runs,model.format);record(id,previous);
    const mark=bookmark?.editor===active?{start:bookmark.start,end:bookmark.end}:null;peers(id).forEach(paint);if(mark)restoreSelection(active,mark);onEdit({direct:isDirect(active)});updateToolbar();
  };
  const applyInline=(key,value)=>{
    const id=editorId(active),model=modelFor(id),previous=snapshot(id),mark=bookmark?.editor===active?bookmark:null;ensureCheckpoint();
    const runs=mark&&mark.end>mark.start?applyRunFormat(model.runs,mark.start,mark.end,{[key]:value}):normalizeRuns(model.runs.map(run=>{const next={...run};if(value===undefined)delete next[key];else next[key]=value;return next}));
    writeModel(id,runs,model.format);record(id,previous);peers(id).forEach(paint);if(mark)restoreSelection(active,mark);onEdit({direct:isDirect(active)});updateToolbar();
  };
  const applyFormat=(key,value)=>['align','lineHeight','paragraphSpacing','list','direction'].includes(key)?applyBlockFormat(key,value):applyInline(key,value);
  const restoreHistory=(redo=false)=>{
    if(!active)return;const id=editorId(active),memory=historyFor(id),from=redo?memory.redo:memory.undo,to=redo?memory.undo:memory.redo;if(!from.length)return;
    ensureCheckpoint();to.push(snapshot(id));const value=JSON.parse(from.pop());writeModel(id,value.runs,value.format);memory.current=snapshot(id);peers(id).forEach(paint);bookmark=null;onEdit({direct:isDirect(active)});updateToolbar();
  };
  const activate=editor=>{active=editor;bookmark=null;toolbarEditing=false;checkpointed=false;onSelectBlock(editorId(active)==='title'?null:editorId(active));updateToolbar()};
  const focusHandler=event=>activate(event.currentTarget);
  const pasteInto=(event,editor)=>{event.preventDefault();const text=event.clipboardData.getData('text/plain'),selection=documentSelection(editor);if(!selection?.rangeCount)return;const range=selection.getRangeAt(0);range.deleteContents();const node=editor.ownerDocument.createTextNode(text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);commitInput(editor)};
  const pasteHandler=event=>pasteInto(event,event.currentTarget);
  const keyOn=(event,editor)=>{
    if(!(event.ctrlKey||event.metaKey))return;const key=event.key.toLowerCase();
    if(['b','i','u'].includes(key)){event.preventDefault();const format={b:'bold',i:'italic',u:'underline'}[key],computed=editor.ownerDocument.defaultView.getComputedStyle(selectionElement()),value=format==='bold'?Number(computed.fontWeight)<600:format==='italic'?computed.fontStyle!=='italic':!computed.textDecorationLine.includes('underline');applyInline(format,value)}
    else if(key==='z'||key==='y'){event.preventDefault();event.stopPropagation();restoreHistory(event.shiftKey||key==='y')}
  };
  const keyHandler=event=>keyOn(event,event.currentTarget);
  const bound=[];
  const bindEditor=editor=>{if(bound.some(entry=>entry[0]===editor))return;paint(editor);historyFor(editorId(editor));const inputHandler=()=>commitInput(editor);editor.addEventListener('focus',focusHandler);editor.addEventListener('input',inputHandler);editor.addEventListener('paste',pasteHandler);editor.addEventListener('keydown',keyHandler);bound.push([editor,inputHandler])};
  inspectorEditors.forEach(bindEditor);
  const delegated=[];
  for(const root of externalRoots){
    if(!root)continue;const find=event=>event.target?.closest?.('[data-word-id]');
    const focus=event=>{const editor=find(event);if(editor&&getExternalEditors().includes(editor))activate(editor)};
    const input=event=>{const editor=find(event);if(editor&&getExternalEditors().includes(editor))commitInput(editor)};
    const paste=event=>{const editor=find(event);if(editor&&getExternalEditors().includes(editor))pasteInto(event,editor)};
    const keydown=event=>{const editor=find(event);if(editor&&getExternalEditors().includes(editor))keyOn(event,editor)};
    root.addEventListener('focusin',focus);root.addEventListener('input',input);root.addEventListener('paste',paste);root.addEventListener('keydown',keydown);delegated.push([root,focus,input,paste,keydown]);
  }
  const documents=[...new Set([form.ownerDocument,...externalRoots.map(root=>root?.ownerDocument||root).filter(Boolean)])];
  const selectionHandlers=documents.map(doc=>{const handler=()=>rememberSelection(doc);doc.addEventListener('selectionchange',handler);return [doc,handler]});
  const toolbar=form.querySelector('.word-toolbar');
  toolbar.addEventListener('pointerdown',()=>{for(const doc of documents)rememberSelection(doc);toolbarEditing=true});
  toolbar.addEventListener('mousedown',event=>{if(event.target.closest('button'))event.preventDefault()});
  toolbar.addEventListener('focusout',event=>{if(!toolbar.contains(event.relatedTarget))toolbarEditing=false});
  toolbar.addEventListener('keydown',event=>{
    if(!event.target.matches('[data-rich-tab]')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();const tabs=[...toolbar.querySelectorAll('[data-rich-tab]')],index=tabs.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowLeft'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();
  });
  toolbar.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.richTab){toolbar.dataset.tools=button.dataset.richTab;toolbar.querySelectorAll('[data-rich-tab]').forEach(tab=>tab.setAttribute('aria-selected',String(tab===button)));return}
    if(button.dataset.history){restoreHistory(button.dataset.history==='redo');return}
    if(button.dataset.linkAction){
      const input=toolbar.querySelector('[data-link-url]');
      if(button.dataset.linkAction==='remove'){input.setCustomValidity('');applyInline('href',undefined);return}
      const href=input.value.trim();input.setCustomValidity(safeTextLink(href)?'':'یک آدرس معتبر با https:// وارد کن.');
      if(input.reportValidity())applyInline('href',href);return;
    }
    if(button.hasAttribute('data-clear-highlight')){applyInline('highlight',undefined);return}
    if(button.dataset.list){applyBlockFormat('list',modelFor(editorId(active)).format?.list===button.dataset.list?'none':button.dataset.list);return}
    if(button.dataset.color){applyInline('color',button.dataset.color);return}
    if(button.dataset.align){applyBlockFormat('align',button.dataset.align);return}
    if(button.dataset.format)applyInline(button.dataset.format,button.getAttribute('aria-pressed')!=='true');
  });
  toolbar.querySelector('[data-link-url]').addEventListener('input',event=>event.target.setCustomValidity(''));
  toolbar.querySelectorAll('input[data-format],select[data-format]').forEach(control=>control.addEventListener(control.tagName==='INPUT'?'input':'change',()=>{
    let value=control.value;if(['fontSize','lineHeight','paragraphSpacing'].includes(control.dataset.format)){value=Number(value);if(!Number.isFinite(value))return}applyFormat(control.dataset.format,value);
  }));
  const actionHandler=event=>{
    const button=event.target.closest('[data-block-action]');if(!button)return;const id=button.closest('[data-block-id]')?.dataset.blockId,action=button.dataset.blockAction;
    if(action==='select'){onSelectBlock(id);return}const blocks=textBlocks(scene);if(action==='add'&&blocks.length>=40)return;
    checkpoint();const list=ensureTextBlocks(scene),index=list.findIndex(block=>block.id===id);let focus=id;
    if(action==='add'){const block={id:'text-'+crypto.randomUUID(),runs:[],format:{}};list.push(block);focus=block.id}
    else if(action==='delete'){list.splice(index,1);focus=list[Math.min(index,list.length-1)]?.id}
    else if(action==='up'||action==='down'){const next=index+(action==='up'?-1:1);if(next>=0&&next<list.length)[list[index],list[next]]=[list[next],list[index]]}
    else if(action==='split'){
      const block=list[index],sentences=splitSentences(runsText(block.runs));if(sentences.length<2||list.length+sentences.length-1>40)return;let start=0;
      const replacements=sentences.map((text,position)=>{const next={id:position===0?block.id:'text-'+crypto.randomUUID(),runs:sliceRuns(block.runs,start,start+text.length),format:{...block.format},...(position===0&&block.placement?{placement:block.placement}:{})};start+=text.length;return next});list.splice(index,1,...replacements);
    }
    syncDescription(scene);onEdit({direct:false,structure:true});onStructure(focus);
  };
  form.addEventListener('click',actionHandler);updateToolbar();
  const cleanup=()=>{selectionHandlers.forEach(([doc,handler])=>doc.removeEventListener('selectionchange',handler));form.removeEventListener('click',actionHandler);for(const [editor,inputHandler] of bound){editor.removeEventListener('focus',focusHandler);editor.removeEventListener('input',inputHandler);editor.removeEventListener('paste',pasteHandler);editor.removeEventListener('keydown',keyHandler)}for(const [root,focus,input,paste,keydown] of delegated){root.removeEventListener('focusin',focus);root.removeEventListener('input',input);root.removeEventListener('paste',paste);root.removeEventListener('keydown',keydown)}};
  cleanup.holdSelection=value=>{if(value)for(const doc of documents)rememberSelection(doc);toolbarEditing=value};
  return cleanup;
}
