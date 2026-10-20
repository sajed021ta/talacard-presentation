import {paintBackdrop} from './backdrop.js';
export const HOME_SECTIONS=[
 {id:'kiosk',name:'طلاپرداز',description:'خرید و تحویل طلاکارت با حساب دیجی‌کالا',image:'/reference/assets/932b58fc924a03a1.webp',kind:'kiosk'},
 {id:'app',name:'اپ طلاکارت',description:'خرید، فروش و تحویل فیزیکی',image:'/reference/assets/8fd8ff7f04043f06.webp',kind:'app'},
 {id:'deliv',name:'کارت طلا',description:'',image:'/reference/assets/a2cc2bf20f679f82.webp',kind:'card'},
 {id:'proposal',name:'طلاکارت',description:'',image:'/reference/assets/03fa24a263eed294.webp',kind:'brand'}
];
export function homeSections(project){return HOME_SECTIONS.filter(item=>project.decks.some(deck=>deck.id===item.id))}
export function mountHomePicker(project,onSelect){
 const section=document.createElement('section');section.className='home-menu';section.hidden=true;section.setAttribute('aria-labelledby','home-title');
 const content=document.createElement('div');content.className='home-content';const heading=document.createElement('header');heading.className='home-heading';
 const partnership=document.createElement('p');partnership.textContent='طلاکارت × دیجی‌کالا';const title=document.createElement('h1');title.id='home-title';title.tabIndex=-1;title.append('کدام را ',Object.assign(document.createElement('span'),{textContent:'ببینیم؟'}));heading.append(partnership,title);
 const links=document.createElement('nav');links.className='home-cards';links.setAttribute('aria-label','انتخاب بخش ارائه');
 for(const item of homeSections(project)){
  const link=document.createElement('a');link.className='home-card '+item.kind;link.href='?deck='+encodeURIComponent(item.id);link.dataset.deck=item.id;
  const visual=document.createElement('div');visual.className='home-card-visual';const img=document.createElement('img');img.src=item.image;img.alt='';img.decoding='async';visual.append(img);
  const name=document.createElement('strong');name.textContent=item.name;link.append(visual,name);
  if(item.description){const description=document.createElement('span');description.className='home-card-description';description.textContent=item.description;link.append(description)}
  link.onclick=event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();onSelect(item.id)};links.append(link);
 }
 content.append(heading,links);section.append(content);document.body.append(section);
 let animation,lastTime=0;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function size(){section.style.width=document.documentElement.clientWidth+'px';section.style.height=Math.max(innerHeight,content.offsetHeight+64)+'px';paintBackdrop(section,{layout:'title',presentationStyle:'reference'},lastTime,reduce)}
 function tick(now){if(section.hidden)return;lastTime=now/1000;paintBackdrop(section,{layout:'title',presentationStyle:'reference'},lastTime,reduce);if(!reduce)animation=requestAnimationFrame(tick)}
 addEventListener('resize',()=>{if(!section.hidden)size()});
 return {
  show(){section.hidden=false;document.body.classList.add('home-open');size();cancelAnimationFrame(animation);animation=requestAnimationFrame(tick);title.focus({preventScroll:true});window.scrollTo(0,0)},
  hide(){section.hidden=true;document.body.classList.remove('home-open');cancelAnimationFrame(animation)},
  get visible(){return !section.hidden}
 };
}
