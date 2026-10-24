import {HOME_CARD_DEFAULTS,homeEditorContent} from './editor-model.js';
import {formatElement,renderRichContent} from './text.js';

export const HOME_SECTIONS=HOME_CARD_DEFAULTS;
export function deckDisplayName(project,id){
 const cards=homeEditorContent(project).cards;
 const own=cards.find(card=>card.content.key===id),linked=cards.find(card=>card.content.target===id);
 return (own||linked)?.content.name||project.decks.find(deck=>deck.id===id)?.name||id;
}
const isVideo=src=>/\.(mp4|webm)$/i.test(src||'');

export function homeSections(project){
 const cards=new Map(homeEditorContent(project).cards.map(element=>[element.content.key,{...element.content,kind:element.style.kind,element}]));
 return HOME_SECTIONS.map(item=>({...item,...project.homeCards?.[item.id],...cards.get(item.id)})).filter(item=>project.decks.some(deck=>deck.id===(item.target||item.id)));
}

export function mountHomePicker(project,onSelect,{onElementSelect=()=>{}}={}){
 const section=document.createElement('section');section.className='home-menu';section.hidden=true;section.setAttribute('aria-labelledby','home-title');
 const content=document.createElement('div');content.className='home-content';const heading=document.createElement('header');heading.className='home-heading';
 const partnership=document.createElement('p');const title=document.createElement('h1');title.id='home-title';title.tabIndex=-1;heading.append(partnership,title);
 const links=document.createElement('nav');links.className='home-cards';links.setAttribute('aria-label','انتخاب بخش ارائه');
 let editing=false,selectedId=null;

 const applyElementStyle=(node,element)=>{
  const style=element?.style||{};node.style.zIndex=String(element?.zIndex||1);node.style.transform=`translate(${Number(style.offsetX)||0}px,${Number(style.offsetY)||0}px)`;
  node.style.width=Number(style.width)>0?`${style.width}px`:'';node.style.height=Number(style.height)>0?`${style.height}px`:'';
  if(style.color)node.style.color=style.color;if(style.background)node.style.background=style.background;
  if(style.borderColor)node.style.borderColor=style.borderColor;if(Number.isFinite(style.borderWidth))node.style.borderWidth=`${style.borderWidth}px`;
  if(Number.isFinite(style.borderRadius))node.style.borderRadius=`${style.borderRadius}px`;if(Number.isFinite(style.padding))node.style.padding=`${style.padding}px`;if(Number.isFinite(style.gap))node.style.gap=`${style.gap}px`;
 };
 const markEditable=(node,element,wordId)=>{
  node.dataset.editorElement=element.id;node.classList.toggle('home-editable',editing);node.classList.toggle('selected',editing&&element.id===selectedId);
  if(editing&&element.id===selectedId&&wordId){node.contentEditable='true';node.dataset.wordId=wordId;node.classList.add('direct-rich-editor');node.setAttribute('role','textbox');node.setAttribute('aria-multiline','true');node.spellcheck=false}
  else{node.removeAttribute('contenteditable');node.removeAttribute('data-word-id');node.classList.remove('direct-rich-editor');node.removeAttribute('role');node.removeAttribute('aria-multiline')}
 };
 const chooseElement=(event,element)=>{if(!editing)return false;event.preventDefault();event.stopPropagation();if(selectedId===element.id&&event.target.closest?.('[contenteditable=true]'))return true;selectedId=element.id;refresh();onElementSelect(element.id);return true};

 function refresh(){
  const value=typeof project==='function'?project():project,home=homeEditorContent(value);
  renderRichContent(partnership,home.kicker?.content.runs||[{text:'طلاکارت × دیجی‌کالا'}],home.kicker?.content.format);formatElement(partnership,home.kicker?.content.format||{});applyElementStyle(partnership,home.kicker);markEditable(partnership,home.kicker,'title');partnership.onclick=event=>chooseElement(event,home.kicker);
  renderRichContent(title,home.title?.content.runs||[{text:'طلاکارت ',color:'#222225'},{text:'جریان طلا',color:'#D7B34E'}],home.title?.content.format);formatElement(title,home.title?.content.format||{});applyElementStyle(title,home.title);markEditable(title,home.title,'title');title.onclick=event=>chooseElement(event,home.title);
  links.replaceChildren();for(const item of homeSections(value)){
   const element=item.element,link=document.createElement('a');link.className='home-card '+item.kind;link.href='?deck='+encodeURIComponent(item.target||item.id);link.dataset.deck=item.id;applyElementStyle(link,element);markEditable(link,element);
   const visual=document.createElement('div');visual.className='home-card-visual';const media=document.createElement(isVideo(item.image)?'video':'img');media.src=item.image;media.setAttribute('aria-hidden','true');
   const fit=element.content.fit||'cover';media.style.objectFit=fit;visual.dataset.fit=fit;
   const mediaWidth=Number(element.style?.mediaWidth),mediaHeight=Number(element.style?.mediaHeight),mediaAspect=element.style?.mediaAspect;
   if(mediaWidth>0)visual.style.width=`${Math.min(100,mediaWidth)}%`;if(mediaHeight>0)visual.style.height=`${mediaHeight}px`;if(['16 / 9','1 / 1','9 / 16'].includes(mediaAspect)){visual.style.aspectRatio=mediaAspect;visual.style.height='auto'}
   if(media.tagName==='VIDEO'){media.muted=true;media.loop=true;media.autoplay=true;media.playsInline=true;media.preload='metadata'}else{media.alt='';media.decoding='async'}visual.append(media);
   const name=document.createElement('strong');renderRichContent(name,element.content.nameRuns||[{text:item.name}],element.content.nameFormat);formatElement(name,element.content.nameFormat||{});link.append(visual,name);
   const description=document.createElement('span');description.className='home-card-description';renderRichContent(description,element.content.descriptionRuns||[{text:item.description}],element.content.descriptionFormat);formatElement(description,element.content.descriptionFormat||{});
   link.append(description);
   if(editing&&element.id===selectedId){name.contentEditable='true';name.dataset.wordId='title';name.classList.add('direct-rich-editor');name.setAttribute('role','textbox');name.spellcheck=false;description.contentEditable='true';description.dataset.wordId='description';description.classList.add('direct-rich-editor');description.setAttribute('role','textbox');description.spellcheck=false}
   link.onclick=event=>{if(chooseElement(event,element))return;if(event.target.closest('.rich-inline-link'))return;if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();onSelect(item.target||item.id)};links.append(link);
  }
 }
 refresh();content.append(heading,links);section.append(content);document.body.append(section);

 function size(){section.style.width=document.documentElement.clientWidth-(editing?document.querySelector('.inspector')?.offsetWidth||280:0)+'px';section.style.height=Math.max(innerHeight-(editing?document.querySelector('.toolbar')?.offsetHeight||76:0),content.offsetHeight+64)+'px'}
 addEventListener('resize',()=>{if(!section.hidden)size()});
 return {
  refresh,
  show(options={}){editing=Boolean(options.editing);selectedId=options.selectedId||selectedId||homeEditorContent(typeof project==='function'?project():project).title?.id;refresh();section.hidden=false;document.body.classList.add('home-open');document.body.classList.toggle('home-editing',editing);size();(editing?section.querySelector('[data-editor-element="'+selectedId+'"]'):title)?.focus?.({preventScroll:true});window.scrollTo(0,0)},
  hide(){section.hidden=true;editing=false;document.body.classList.remove('home-open','home-editing')},
  select(id){selectedId=id;refresh()},
  directEditors(id=selectedId){return [...section.querySelectorAll(`[data-editor-element="${CSS.escape(id)}"] .direct-rich-editor,[data-editor-element="${CSS.escape(id)}"].direct-rich-editor`)]},
  elementNode(id){return section.querySelector(`[data-editor-element="${CSS.escape(id)}"]`)},
  get selectedId(){return selectedId},get root(){return section},get editing(){return editing},get visible(){return !section.hidden}
 };
}
