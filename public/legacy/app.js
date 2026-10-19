import {renderTitle,renderDescription} from "../text.js";

if(location.hash.startsWith('#render')){(function(){
 document.documentElement.classList.add('render');
 let vnow=0,tid=1;const timers=[],rafs=[],meta=new WeakMap();
 window.setTimeout=(f,ms=0,...a)=>{const id=tid++;timers.push({id,t:vnow+(+ms||0),f,a});return id};
 window.clearTimeout=id=>{const i=timers.findIndex(x=>x.id===id);if(i>=0)timers.splice(i,1)};
 window.requestAnimationFrame=f=>{const id=tid++;rafs.push({id,f});return id};
 window.cancelAnimationFrame=id=>{const i=rafs.findIndex(x=>x.id===id);if(i>=0)rafs.splice(i,1)};
 performance.now=()=>vnow;
 function sync(){document.getAnimations().forEach(a=>{let m=meta.get(a);if(!m){m={s:vnow};meta.set(a,m)}
   const t=vnow-m.s;let end=Infinity;try{end=a.effect.getComputedTiming().endTime}catch(e){}
   try{if(t>=end&&end!==Infinity){if(a.playState!=='finished')a.finish()}else{a.pause();a.currentTime=Math.max(0,t)}}catch(e){}})}
 window.__advance=ms=>{const end=vnow+ms;for(;;){timers.sort((a,b)=>a.t-b.t||a.id-b.id);const n=timers[0];if(!n||n.t>end)break;timers.shift();vnow=n.t;sync();try{n.f(...n.a)}catch(e){console.error(e)}}
   vnow=end;sync();rafs.splice(0).forEach(x=>{try{x.f(vnow)}catch(e){}});sync();return vnow};
})()}


const IMG0={"home": "/reference/assets/9c1ba16210ef9ec8.webp", "buyempty": "/reference/assets/600cf6f2566ccd18.webp", "buyfill": "/reference/assets/918d09479af6a486.webp", "receipt": "/reference/assets/10b88f1441cc5343.webp", "recempty": "/reference/assets/d51ef3855118db3e.webp", "done": "/reference/assets/10ca06f8e829c018.webp", "sellfill": "/reference/assets/2371ec077b450f85.webp", "sellrec": "/reference/assets/dc9496941e47aa18.webp", "sellempty": "/reference/assets/9984096dce2af5d5.webp", "sellok": "/reference/assets/596add2043122234.webp", "cardready": "/reference/assets/c87c2d7b92113163.webp", "branches": "/reference/assets/fc114780bf036b60.webp", "detail": "/reference/assets/16cc62463128367d.webp", "platempty": "/reference/assets/5a53d3add7b746a3.webp", "sellplatempty": "/reference/assets/74d73479d707a888.webp", "atm": "/reference/assets/932b58fc924a03a1.webp", "homecrop": "/reference/assets/6decfa0cfaf12b02.webp", "cardnotyet": "/reference/assets/5cdc69e75b32df1a.webp", "k1": "/reference/assets/3ca50d7226ba51f8.webp", "k1e": "/reference/assets/82f6f4ff714ac6c5.webp", "k2": "/reference/assets/4f53d5c33ff56779.webp", "k3": "/reference/assets/0f71ce014de45f33.webp", "k4": "/reference/assets/fdd92d871a98f704.webp", "k5": "/reference/assets/8c3f5d4ea4a3af3f.webp", "k6": "/reference/assets/c456b129844328f3.webp", "k7": "/reference/assets/91912a46f93c47c4.webp", "k8": "/reference/assets/8482c5cf3a6159ef.webp", "k9": "/reference/assets/0b3f80c183d1fe79.webp", "k10": "/reference/assets/0d7112d0b9334fb8.webp", "kiosk": "/reference/assets/2e49a4d17ce39722.webp", "card": "/reference/assets/a2cc2bf20f679f82.webp", "kn": "/reference/assets/4f58e403d73b99c6.webp", "kd": "/reference/assets/e273507c8f44ca4f.webp", "brnotch": "/reference/assets/1f39260758ad8c79.webp", "brmap": "/reference/assets/38218e391a1234bd.webp", "dklogo": "/reference/assets/826a489ae54f8a91.webp", "goalbg": "/reference/assets/796ed2d40b37d3d6.webp", "notclean": "/reference/assets/b0debb2a40f5e484.webp", "bubble": "/reference/assets/3843cd030153db68.webp"};
(()=>{
document.getElementById('pkAppImg').src=IMG0.homecrop;document.getElementById('pkAtmImg').src=IMG0.atm;
const IMG={},DECODED=[];
for(const k in IMG0){IMG[k]=IMG0[k];const im=new Image();im.src=IMG[k];DECODED.push(im.decode().catch(()=>{}))}
const $=s=>document.querySelector(s);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fa=s=>String(s).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const EASE='cubic-bezier(.22,1,.36,1)',EIO='cubic-bezier(.65,0,.35,1)',EIN='cubic-bezier(.5,0,.75,0)';
const sw=$('#sw');
/* ---------- layer helpers ---------- */
function L(parent,src,x,y,w,h,ax=x,ay=y){const d=document.createElement('div');d.className='L';
  d.style.cssText=`left:${ax}px;top:${ay}px;width:${w}px;height:${h}px;background-image:url(${IMG[src]});background-position:${-x}px ${-y}px`;parent.appendChild(d);return d}
function box(parent,css,cls='mask'){const d=document.createElement('div');d.className=cls;d.style.cssText=css;parent.appendChild(d);return d}
function screen(id,bg){const s=document.createElement('div');s.className='scr';s.id='s-'+id;if(bg)s.style.setProperty('--sbg',bg);sw.insertBefore(s,$('#finger'));return s}
/* 812-tall frames fill the 866 screen by a uniform scale (sides trimmed 12px), never stretched */
const K812=866/812,OX812=(375*K812-375)/2;
function s812(id){const s=screen(id,'#F5F4F7');const w=document.createElement('div');w.style.cssText=`position:absolute;left:0;top:0;width:375px;height:812px;transform-origin:0 0;transform:translateX(${-OX812}px) scale(${K812})`;s.appendChild(w);s._w=w;return s}
const toSw=(s,x,y)=>s._w?[x*K812-OX812,y*K812]:[x,y];
const full=(id,src,h)=>{const s=screen(id);s._img=L(s,src,0,0,375,h);return s};

/* simple screens */
const sHome=full('home','home',956);
const sCard=full('card','cardready',972);
const sNot=screen('notyet');sNot._sc=box(sNot,'left:0;top:0;width:375px;height:971px');L(sNot._sc,'cardnotyet',0,0,375,967);sNot._ov=box(sNot._sc,'left:0;top:0;width:375px;height:971px');
/* goal path geometry (1x, from the Figma frame): knob at 1.3 g → x 196, the 2 g tile centre → x 142.5 */
const GX0=196,GX1=142.5;
function notBuild(){const o=sNot._ov;o.innerHTML='';
  const cl=document.createElement('img');cl.src=IMG.notclean;cl.alt='';cl.style.cssText='position:absolute;left:148px;top:131px;width:95px;height:69px';o.appendChild(cl);
  const bar=box(o,'top:187.5px;height:7px;border-radius:4px;background:#E7C569');
  const tile=L(o,'cardnotyet',127,171,32,39);const ring=box(o,'left:126px;top:170px;width:34px;height:41px;border-radius:7px;border:2px solid #E7C569;box-sizing:border-box;box-shadow:0 0 14px 2px #E7C56988;opacity:0');
  const knob=box(o,'top:182.5px;width:13px;height:13px;border-radius:50%;background:radial-gradient(circle at 50% 40%,#fff,#ECECEE);box-shadow:0 0 0 1.5px #C9C9CE,0 1px 3px #0006');
  const bub=box(o,'left:150px;top:133px;width:91px;height:46px;background:url('+IMG.bubble+') 0 0/100% 100%');const cov=box(bub,'left:10.5px;top:7px;width:43px;height:21px;background:#fff');
  const num=box(bub,'right:40px;top:7px;height:21px;display:flex;align-items:center;gap:3px;direction:rtl;white-space:nowrap');
  box(o,'left:127.5px;top:338px;width:6px;height:4px;background:#F8F7F5');box(o,'left:241.5px;top:338px;width:6px;height:4px;background:#F8F7F5');
  const card=L(o,'cardready',132,283,111,173,132,280.5);const line=box(o,'left:129px;width:117px;height:1.5px;background:#E7C569;box-shadow:0 0 8px #E7C569');
  const low=L(o,'cardready',0,490,375,481);low.style.opacity=0;
  return {bar,tile,ring,knob,bub,num,card,line,low}}
function notSet(e,t){const x=GX0+(GX1-GX0)*t,g=1.3+.7*t;e.bar.style.left=x+'px';e.bar.style.width=(200-x)+'px';e.knob.style.left=(x-6.5)+'px';e.bub.style.left=(150+x-GX0)+'px';
  e.num.innerHTML=`<b style="font-size:17px;font-weight:800;color:#2A2E32;direction:ltr;unicode-bidi:isolate">${fa(g.toFixed(1))}</b><span style="font-size:11px;color:#8A8F99">گرم</span>`}
function notCard(e,t){const T=58.5*(1-t);e.card.style.clipPath=`inset(${T.toFixed(2)}px 0 0 0)`;e.line.style.top=(339.5-58.5*t)+'px';e.line.style.opacity=t>=1?0:1}
function notDone(){const e=notBuild();notSet(e,1);notCard(e,1);e.ring.style.opacity=1;e.knob.style.opacity=0;e.low.style.opacity=1;return e}
function notFill(at){const e=notBuild();notSet(e,0);notCard(e,0);const n=48,ez=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  for(let i=1;i<=n;i++)later(()=>notSet(e,ez(i/n)),at+i*1700/n);
  later(()=>A(e.ring,[{opacity:0,transform:'scale(1.35)'},{opacity:1,transform:'none'}],{duration:600,easing:'cubic-bezier(.2,1.4,.4,1)',fill:'forwards'}),at+1650);
  later(()=>A(e.tile,[{transform:'none'},{transform:'scale(1.12)'},{transform:'none'}],{duration:600,easing:'ease-out'}),at+1650);
  later(()=>A(e.knob,[{opacity:1,transform:'none'},{opacity:0,transform:'scale(.4)'}],{duration:350,fill:'forwards'}),at+1600);
  for(let i=1;i<=n;i++)later(()=>notCard(e,ez(i/n)),at+1900+i*1400/n);
  later(()=>A(e.line,[{opacity:1},{opacity:0}],{duration:400,fill:'forwards'}),at+3300);
  later(()=>A(e.low,[{opacity:0},{opacity:1}],{duration:700,fill:'forwards'}),at+3500);return e}
const sBr=s812('branches');L(sBr._w,'branches',0,0,375,812);
/* sheet screens: backdrop + sheet */
function sheetScr(id,src,cut,h=812,sheetSrc=src){const s=s812(id);s._top=L(s._w,src,0,0,375,cut);s._sheet=L(s._w,sheetSrc,0,cut,375,h-cut);return s}
const sRec=sheetScr('receipt','receipt',293,812,'recempty'), sSrec=sheetScr('sellrec','sellrec',343,812,'sellempty'), sDet=sheetScr('detail','detail',493);
/* branches: the map can zoom under its fixed overlays */
sBr._mc=box(sBr._w,'left:0;top:340px;width:375px;height:410px;overflow:hidden;border-radius:16px 16px 0 0');
sBr._map=document.createElement('img');sBr._map.src=IMG.brmap;sBr._map.alt='';sBr._map.style.cssText='position:absolute;left:0;top:0;width:375px;height:412px;max-width:none;transform-origin:0 0;will-change:transform';sBr._mc.appendChild(sBr._map);
[[10,356,102,36,12],[318,350,47,48,12],[20,686,343,54,16],[19,676,27,27,8]].forEach(([x,y,w,h,r])=>{L(sBr._w,'branches',x,y,w,h).style.borderRadius=r+'px'});
{const n=document.createElement('img');n.src=IMG.brnotch;n.alt='';n.style.cssText='position:absolute;left:90px;top:330px;width:195px;height:44px';sBr._w.appendChild(n)}
const MAPZ='translate(-8px,-52px) scale(1.9)';
/* home balance, so delivery can be taken out of it */
const balC=[box(sHome,'left:136px;top:130px;width:67px;height:28px;background:#fff'),box(sHome,'left:138px;top:166px;width:96px;height:22px;background:#fff')];
const balG=box(sHome,'right:176px;top:129px;height:30px','bal'),balT=box(sHome,'right:145px;top:166px;height:22px;gap:3px','bal');
function setBal(g){const on=g!=null;[...balC,balG,balT].forEach(e=>e.style.display=on?'flex':'none');if(!on)return;
  balG.innerHTML=`<b style="font-size:22px;font-weight:900">${fa(g.toFixed(2))}</b><span style="font-size:13px;font-weight:500">گرم</span>`;
  balT.innerHTML=`<b style="font-size:14px;font-weight:600;color:#707A85">${fa(Math.round(g*19456803).toLocaleString('en-US'))}</b><span style="font-size:13px;font-weight:500">تومان</span>`}
function countBal(a,b,at,dur){const n=28;for(let i=0;i<=n;i++)later(()=>{const t=i/n,e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;setBal(a+(b-a)*e);if(typeof goalOn!=='undefined'&&goalOn)setGoal(a+(b-a)*e)},at+i*dur/n)}
setBal(null);window.__setBal=setBal;
[[sRec,'receipt'],[sSrec,'sellrec']].forEach(([s,k])=>{s._pc=box(s._sheet,`left:44px;top:${577-s._sheet.offsetTop||0}px;width:287px;height:164px;overflow:hidden`);s._paper=L(s._pc,k,52,577,271,160,8,0);});
/* result screens: panel pops */
function okScr(id,src,ledY){const s=s812(id);L(s._w,src,0,0,375,60);s._panel=L(s._w,src,40,280,295,260);s._btn=L(s._w,src,0,745,375,67);s._ledY=ledY;return s}
const sDone=okScr('done','done',497), sSok=okScr('sellok','sellok',509);

/* trade screen (buy & sell): top card, live amount, keypad, platform sheet */
const sT=screen('trade');
sT._topB=L(sT,'buyfill',0,0,375,340);sT._topS=L(sT,'sellfill',0,0,375,340);
const amt=box(sT,'','amt');amt.innerHTML='<span class="num" id="num"></span><span class="unit">گرم</span>';
function plat(src,emptySrc){const g=document.createElement('div');g.className='L';g.style.cssText='left:0;top:0;width:375px;height:866px;background:none';
  L(g,emptySrc,0,345,375,461);
  g._rows=[[444,76],[528,54],[590,54],[652,54]].map(([y,h])=>L(g,src,16,y,343,h));
  g._btn=L(g,src,30,738,316,54);sT.appendChild(g);return g}
sT._pB=plat('buyfill','platempty');sT._pS=plat('sellfill','sellplatempty');
sT._nav=L(sT,'buyfill',0,806,375,60);
sT._kp=document.createElement('div');sT._kp.className='L';sT._kp.style.cssText='left:0;top:0;width:375px;height:866px;background:none';sT.appendChild(sT._kp);
L(sT._kp,'buyempty',0,488,375,378);sT._kt=box(sT._kp,'','kt');sT._kt.textContent='مقدار خرید';
sT._glow=box(sT,'','glow');

/* ---------- engine ---------- */
let T=[],tok=0;
const later=(f,ms)=>{const e={f,k:tok,due:performance.now()+ms};const fire=()=>{const i=T.indexOf(e);if(i>=0)T.splice(i,1);if(e.k===tok)e.f()};e.fire=fire;e.id=setTimeout(fire,ms);T.push(e)};
function pauseT(){const n=performance.now();T.forEach(e=>{clearTimeout(e.id);e.rem=Math.max(0,e.due-n)})}
function resumeT(){const n=performance.now();T.forEach(e=>{e.due=n+(e.rem||0);e.id=setTimeout(e.fire,e.rem||0)})}
const clearT=()=>{T.forEach(e=>clearTimeout(e.id));T=[];tok++;document.getAnimations().forEach(a=>{if(a.effect&&a.effect.target&&(sw.contains(a.effect.target)||kv.contains(a.effect.target)))a.cancel()});document.querySelectorAll('.ripple,.dot,.kripple,.kkey,.kpr,.kf,.fdot').forEach(e=>e.remove())};
const kv=$('#kv');
const A=(el,kf,o={})=>reduce?(Object.assign(el.style,kf[kf.length-1]),null):el.animate(kf,Object.assign({fill:'both',easing:EASE},o));
const set=(el,st)=>{el.getAnimations().forEach(a=>a.cancel());Object.assign(el.style,{transform:'',opacity:''},st)};
let cur=null;
function show(s,how='push',dur=650){if(cur===s)return;const old=cur;cur=s;
  document.querySelectorAll('.scr').forEach(x=>{if(x!==s&&x!==old)x.classList.remove('on')});
  s.getAnimations().forEach(a=>a.cancel());s.style.zIndex=2;s.classList.add('on');if(old)old.style.zIndex=1;
  if(!old||reduce||how==='cut'){if(old)old.classList.remove('on');return}
  const done=()=>{if(old!==cur)old.classList.remove('on')};
  const D=dur*1.15;
  if(how==='push'){A(s,[{transform:'translateX(-22%)',opacity:0},{transform:'translateX(-11%)',opacity:0,offset:.3},{transform:'none',opacity:1}],{duration:D,fill:'none'});
    A(old,[{transform:'none',opacity:1},{transform:'translateX(10%) scale(.97)',opacity:0,offset:.42},{transform:'translateX(10%) scale(.97)',opacity:0}],{duration:D,easing:EIO,fill:'none'}).onfinish=done;return}
  if(how==='back'){A(s,[{transform:'translateX(10%) scale(.97)',opacity:0},{transform:'translateX(6%) scale(.98)',opacity:0,offset:.3},{transform:'none',opacity:1}],{duration:D,fill:'none'});
    A(old,[{transform:'none',opacity:1},{transform:'translateX(-14%)',opacity:0,offset:.42},{transform:'translateX(-14%)',opacity:0}],{duration:D,easing:EIO,fill:'none'}).onfinish=done;return}
  if(how==='fade'){A(s,[{opacity:0,transform:'scale(1.03)'},{opacity:0,transform:'scale(1.03)',offset:.25},{opacity:1,transform:'none'}],{duration:D,fill:'none'});
    A(old,[{opacity:1},{opacity:0,offset:.45},{opacity:0}],{duration:D,easing:'ease-out',fill:'none'}).onfinish=done;return}
  if(how==='sheet'){const bg0=s.style.getPropertyValue('--sbg');s.style.setProperty('--sbg','transparent');later(()=>s.style.setProperty('--sbg',bg0||'#F5F4F7'),820);
    A(s._top,[{opacity:0},{opacity:1}],{duration:420,easing:'ease-out',fill:'none'});
    A(s._sheet,[{transform:'translateY(600px)'},{transform:'translateY(-8px)',offset:.8},{transform:'none'}],{duration:780,fill:'none'});
    later(done,800);return}}
/* finger: move, press, ripple; pressing a layer shrinks it */
function finger(v){if(!v){const f=FG();f.getAnimations().forEach(a=>a.cancel());f.style.opacity=0}}
const FG=()=>$('#finger');
function fIn(x,y){const f=FG();f.getAnimations().forEach(a=>a.cancel());f.style.left=x+'px';f.style.top=y+'px';
  A(f,[{opacity:0,transform:'scale(1.25)'},{opacity:1,transform:'scale(1)'}],{duration:340,easing:'cubic-bezier(.2,.7,.3,1)'})}
function fOut(){const f=FG();A(f,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.12)'}],{duration:360,easing:'ease-out'})}
function fGlide(x,y,dur){const f=FG(),x0=parseFloat(f.style.left),y0=parseFloat(f.style.top);f.style.left=x+'px';f.style.top=y+'px';
  if(!reduce)f.animate([{left:x0+'px',top:y0+'px'},{left:x+'px',top:y+'px'}],{duration:dur,easing:EIO})}
function fPress(x,y,el){const f=FG();if(!reduce)f.animate([{transform:'scale(1)'},{transform:'scale(.82)',offset:.4},{transform:'scale(1)'}],{duration:300,easing:'ease-out',composite:'replace'});
  const r=box(sw,`left:${x}px;top:${y}px`,'ripple');A(r,[{transform:'scale(.6)',opacity:.9},{transform:'scale(3.2)',opacity:0}],{duration:640,easing:'ease-out'}).onfinish=()=>r.remove();
  if(el)A(el,[{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(.95)',filter:'brightness(.9)',offset:.4},{transform:'scale(1)',filter:'brightness(1)'}],{duration:380,easing:'ease-out',fill:'none'})}
function tapAt(x,y,at,el,after){later(()=>{fIn(x,y);
  later(()=>{fPress(x,y,el);after&&later(after,200)},reduce?0:420);later(fOut,reduce?0:820)},at)}
/* several taps in a row: appear once, glide to each target, fade at the end */
function tapSeq(pts,at,step){later(()=>{fIn(pts[0].x,pts[0].y);
  pts.forEach((p,i)=>{const t=380+i*step;
    later(()=>{const el=p.make?p.make():null;fPress(p.x,p.y,el);p.fn&&later(p.fn,200);if(el&&p.make)later(()=>el.remove(),600)},t);
    if(i<pts.length-1)later(()=>fGlide(pts[i+1].x,pts[i+1].y,step-330),t+260)});
  later(fOut,380+(pts.length-1)*step+520)},at)}
/* a pressable region of a full-image screen: lift a copy of it and squeeze */
function pressRegion(s,src,x,y,w,h,r,at,after){later(()=>{const c=L(s._w||s,src,x,y,w,h);c.style.borderRadius=r+'px';c.style.zIndex=5;c.style.boxShadow='0 0 0 0 #0000';
   const [cx,cy]=toSw(s,x+w/2,y+h/2);tapAt(cx,cy,0,c,()=>{after&&after();later(()=>c.remove(),700)})},at)}
/* live amount */
let amtStr='';
function setAmt(str,empty){amtStr=str;amt.classList.toggle('empty',!!empty);const n=$('#num');
  n.innerHTML=(empty?'<span>۰.۰۰</span><i class="caret"></i>':[...str].map(c=>`<span>${fa(c)}</span>`).join('')+'<i class="caret"></i>')}
const KEY={'1':[75,609],'2':[187,609],'3':[299,609],'4':[75,659],'5':[187,659],'6':[299,659],'7':[75,709],'8':[187,709],'9':[299,709],'.':[75,759],'0':[187,759]};
function keyPt(k){const [x,y]=KEY[k];return {x,y,make:()=>{const e=L(sT._kp,'buyempty',x-52,y-22,104,44);e.style.borderRadius='8px';return e},
  fn:()=>{setAmt(amtStr+k,false);const sp=[...$('#num').querySelectorAll('span')].pop();A(sp,[{transform:'translateY(6px)',opacity:0},{transform:'none',opacity:1}],{duration:280,fill:'none'})}}}
function typeSeq(keys,mode,at,step){tapSeq([...keys.map(keyPt),{x:187,y:828,make:()=>{const e=L(sT._kp,'buyempty',16,806,343,46);e.style.borderRadius='12px';return e}}],at,step)}
function trade(mode,stage){ // instant state
  set(sT._topB,{opacity:mode==='buy'?1:0});set(sT._topS,{opacity:mode==='sell'?1:0});
  sT._kt.textContent='مقدار فروش';sT._kt.style.visibility=mode==='buy'?'hidden':'visible';
  const kpUp=stage==='kp';set(sT._kp,{transform:kpUp?'none':'translateY(400px)'});
  [sT._pB,sT._pS].forEach(p=>{const on=!kpUp&&p===(mode==='buy'?sT._pB:sT._pS);set(p,{transform:on?'none':'translateY(520px)',opacity:on?1:0});p._rows.forEach(r=>set(r,{}))});
  set(sT._nav,{opacity:kpUp?0:1});set(sT._glow,{opacity:0});
  if(kpUp)setAmt('',true);else setAmt('1.00',false)}
function keypadDown(mode,at){later(()=>{const p=mode==='buy'?sT._pB:sT._pS;
  A(sT._kp,[{transform:'none'},{transform:'translateY(400px)'}],{duration:480,easing:EIN});
  set(p,{transform:'translateY(520px)',opacity:1});
  A(p,[{transform:'translateY(520px)'},{transform:'translateY(-10px)',offset:.82},{transform:'none'}],{duration:900,delay:220});
  p._rows.forEach((r,i)=>A(r,[{transform:'translateY(28px)',opacity:0},{transform:'none',opacity:1}],{duration:620,delay:560+i*90}));
  A(sT._nav,[{opacity:0},{opacity:1}],{duration:400,delay:600})},at)}
function glowRow(at){later(()=>{const g=sT._glow;g.style.cssText='left:22px;top:446px;width:331px;height:72px';
  A(g,[{opacity:0,transform:'scale(1.04)'},{opacity:1,transform:'none',offset:.25},{opacity:1,offset:.75},{opacity:0}],{duration:2200,easing:'ease-in-out'})},at)}
function printPaper(s,at){set(s._paper,{transform:'translateY(-165px)'});later(()=>{
  A(s._paper,[{transform:'translateY(-165px)'},{transform:'translateY(-40px)',offset:.45},{transform:'translateY(-30px)',offset:.55},{transform:'none'}],{duration:1700,easing:'cubic-bezier(.4,0,.2,1)'})},at)}
function popPanel(s,at){set(s._panel,{opacity:0});set(s._btn,{opacity:0});later(()=>{
  A(s._panel,[{transform:'scale(.82) translateY(30px)',opacity:0},{transform:'scale(1.03)',opacity:1,offset:.65},{transform:'none',opacity:1}],{duration:800});
  A(s._btn,[{transform:'translateY(40px)',opacity:0},{transform:'none',opacity:1}],{duration:600,delay:350});
  const led=box(s._w,`left:172px;top:${s._ledY}px;width:31px;height:4px;border-radius:4px;background:transparent;box-shadow:0 0 14px 3px #4ADE80b0;opacity:0`,'dot');
  A(led,[{opacity:0},{opacity:1},{opacity:.3},{opacity:1},{opacity:.6}],{duration:1600,delay:500});
  if(!reduce)for(let i=0;i<22;i++){const d=box(s._w,'left:184px;top:405px','dot');const a=Math.random()*Math.PI*2,r=90+Math.random()*120,sc=.6+Math.random()*1.2;
    d.animate([{transform:'translate(0,0) scale(0)',opacity:1},{transform:`translate(${Math.cos(a)*r}px,${Math.sin(a)*r-40}px) scale(${sc})`,opacity:1,offset:.6},{transform:`translate(${Math.cos(a)*r*1.1}px,${Math.sin(a)*r+60}px) scale(${sc*.6})`,opacity:0}],{duration:1500+Math.random()*500,delay:380,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'})}},at)}
const mode=m=>{$('#stage').className='m-'+m};

/* ---------- story ---------- */
const CH_APP=[{n:'۰۰',t:'معرفی'},{n:'۰۱',t:'خانه'},{n:'۰۲',t:'خرید'},{n:'۰۳',t:'فروش'},{n:'۰۴',t:'تحویل فیزیکی'},{n:'۰۵',t:'تحویل در طلاپرداز'},{n:'۰۶',t:'جمع‌بندی'}];
const S_APP=[
 {c:0,f:'طلاکارت × دیجی‌کالا',d:4200,run(){mode('open');finger(0);$('#tag').innerHTML='طلای دیجیتال، <span>در دست</span>';$('#sub').textContent='خرید، فروش و تحویل فیزیکی، همه در یک اپ';
   A($('#tTC'),[{transform:'translateX(140px) rotate(-6deg)',opacity:0},{transform:'none',opacity:1}],{duration:1000,fill:'none'});
   A($('#tDK'),[{transform:'translateX(-140px) rotate(6deg)',opacity:0},{transform:'none',opacity:1}],{duration:1000,fill:'none'});
   A($('#xm'),[{opacity:0,transform:'scale(.3)'},{opacity:1,transform:'none'}],{duration:500,delay:750,fill:'backwards'});
   ['#tag','#sub'].forEach((s,i)=>A($(s),[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:800,delay:1100+i*220,fill:'backwards'}));}},
 {c:1,f:'خانه',t:'همه‌ی طلای تو، روی <em>یک نمایشگر</em>',p:'موجودی طلا و نقد داخل همان دستگاهی دیده می‌شود که کاربر در ATM طلاکارت هم می‌بیند.',d:3600,run(){mode('app');finger(0);show(sHome,'cut');set(sHome._img,{});
   A(sHome,[{opacity:0,transform:'scale(1.03)'},{opacity:1,transform:'none'}],{duration:900,fill:'backwards',delay:300});}},

 {c:2,f:'وارد کردن مقدار',t:'یک گرم طلا؟ <em>چهار لمس</em>',p:'عدد با صفحه‌کلید خود اپ وارد می‌شود و هر رقم همان لحظه روی نمایشگر می‌نشیند.',d:5700,run(){mode('app');show(sHome,'cut');
   trade('buy','kp');set(sT._kp,{transform:'translateY(400px)'});
   pressRegion(sHome,'home',190,294,113,37,12,300,()=>{show(sT,'push');A(sT._kp,[{transform:'translateY(400px)'},{transform:'translateY(-6px)',offset:.8},{transform:'none'}],{duration:760,delay:260})});
   typeSeq(['1','.','0','0'],'buy',2000,700);}},
 {c:2,f:'پلتفرم‌ها بالا می‌آیند',t:'دیجی‌کالا، <em>اولِ صف</em>',p:'کیبورد کنار می‌رود و قیمت پلتفرم‌ها بالا می‌آید. دیجی‌کالا اول فهرست است و خرید داخل طلاکارت انجام می‌شود.',d:5000,run(){mode('app');show(sT,'cut');trade('buy','kp');setAmt('1.00',false);keypadDown('buy',120);
   later(()=>tapAt(187,765,0,sT._pB._btn),3700);}},
 {c:2,f:'رسید خرید',t:'رسید، <em>تازه از دستگاه</em>',p:'برگه‌ی رسید از شیار بیرون می‌آید: قیمت لحظه‌ای، کارمزد و مبلغ پرداختی.',d:5200,run(){mode('app');show(sT,'cut');trade('buy','plat');finger(0);
   show(sRec,'sheet');printPaper(sRec,800);pressRegion(sRec,'receipt',16,756,343,48,14,3900);}},
 {c:2,f:'خرید موفق',t:'<em>چراغ سبز!</em>',p:'خرید ثبت شد و طلا در حساب کاربر نشست.',d:3800,run(){mode('app');finger(0);show(sDone,'fade',500);popPanel(sDone,150);}},

 {c:3,f:'فروش',t:'حالا <em>برعکس</em>',p:'از زبانه‌ی فروش، همان صفحه‌کلید و همان چهار لمس. این بار پلتفرم‌های فروش بالا می‌آیند.',d:7500,run(){mode('app');show(sDone,'cut');set(sDone._panel,{});set(sDone._btn,{});
   pressRegion(sDone,'done',16,760,343,40,12,300,()=>{show(sHome,'back')});
   later(()=>{trade('buy','kp');set(sT._kp,{transform:'translateY(400px)'})},1100);
   pressRegion(sHome,'home',190,294,113,37,12,1500,()=>{show(sT,'push');A(sT._kp,[{transform:'translateY(400px)'},{transform:'translateY(-6px)',offset:.8},{transform:'none'}],{duration:760,delay:260})});
   later(()=>tapAt(110,114,0,null,()=>{A(sT._topS,[{opacity:0},{opacity:1}],{duration:380});A(sT._topB,[{opacity:1},{opacity:0}],{duration:380});
     sT._kt.style.visibility='visible';A(sT._kt,[{opacity:0},{opacity:1}],{duration:380})}),3000);
   typeSeq(['1','.','0','0'],'sell',4100,620);}},
 {c:3,f:'پلتفرم‌های فروش',t:'باز هم <em>دیجی‌کالا اول</em>',p:'قیمت خرید هر پلتفرم کنار هم است. کاربر روی بهترین گزینه فروش را تمام می‌کند.',d:5000,run(){mode('app');show(sT,'cut');trade('sell','kp');setAmt('1.00',false);keypadDown('sell',120);
   later(()=>tapAt(187,765,0,sT._pS._btn),3700);}},
 {c:3,f:'رسید فروش',t:'مبلغ دریافتی، <em>بدون حدس</em>',p:'رسید فروش با مبلغ دریافتی چاپ می‌شود و کاربر آن را تأیید می‌کند.',d:5000,run(){mode('app');show(sT,'cut');trade('sell','plat');finger(0);
   show(sSrec,'sheet');printPaper(sSrec,800);pressRegion(sSrec,'sellrec',16,756,343,48,14,3800);}},
 {c:3,f:'فروش موفق',t:'فروش <em>انجام شد</em>',p:'نتیجه روی نمایشگر تیره‌ی دستگاه می‌آید.',d:3600,run(){mode('app');finger(0);show(sSok,'fade',500);popPanel(sSok,150);}},

 {c:4,f:'کارت هدف',t:'هر گرم، <em>یک قدم تا کارت</em>',p:'نوار «کارت هدف» در خانه با موجودی طلا پر می‌شود؛ ۱.۳ گرم یعنی بیش از نیمه‌ی راه تا کارت ۲ گرمی.',d:5800,run(){mode('app');setBal(1.3);setGoal(0);show(sSok,'cut');set(sSok._panel,{});set(sSok._btn,{});
   pressRegion(sSok,'sellok',326,26,30,30,15,300,()=>show(sHome,'back'));
   animGoal(0,1.3,1500,1500);
   pressRegion(sHome,'home',16,342,343,148,16,3700,()=>show(sNot,'push'));}},
 {c:4,f:'مسیر طلایی',t:'یک بازی کوچک: <em>مسیر طلایی</em>',p:'هر خرید، کاربر را روی مسیر جلو می‌برد. تا کارت ۲ گرمی فقط ۰.۷ گرم مانده است.',d:3400,run(){mode('app');sNot._ov.innerHTML='';set(sNot._sc,{});show(sNot,'cut');finger(0);}},
 {c:4,f:'هدف کامل شد',t:'هدف کامل شد، <em>کارت آماده است</em>',p:'با خرید ۰.۷ گرم باقیمانده، نوار تا ۲ گرم پر می‌شود، کارت کامل می‌شود و تحویل فیزیکی باز می‌شود.',d:6400,run(){mode('app');sNot._ov.innerHTML='';set(sNot._sc,{});show(sNot,'cut');finger(0);
   later(()=>{const c=L(sNot._sc,'cardnotyet',48,566,280,36);c.style.borderRadius='14px';c.style.zIndex=5;tapAt(188,584,0,c,()=>later(()=>c.remove(),700))},300);
   notFill(1000);
   later(()=>A(sNot._sc,[{transform:'none'},{transform:'translateY(-106px)'}],{duration:1300,easing:EIO}),5000);}},
 {c:4,f:'نزدیک‌ترین طلاپرداز',t:'نزدیک‌ترین <em>طلاپرداز</em>',p:'نقشه باز می‌شود و روی نزدیک‌ترین طلاپرداز فعال زوم می‌کند.',d:5200,run(){mode('app');setBal(2);notDone();set(sNot._sc,{transform:'translateY(-106px)'});show(sNot,'cut');set(sBr._map,{});
   later(()=>{const c=L(sNot._sc,'cardready',48,834,280,36);c.style.borderRadius='14px';c.style.zIndex=5;tapAt(187,746,0,c,()=>{show(sBr,'push');later(()=>c.remove(),800)})},300);
   later(()=>A(sBr._map,[{transform:'none'},{transform:MAPZ}],{duration:1900,easing:EIO}),2300);}},
 {c:4,f:'مسیریابی',t:'از نقشه، <em>تا خود طلاپرداز</em>',p:'با لمس مسیریاب، کیوسک از همان نقطه‌ی نقشه بیرون می‌آید و کنار اپ می‌نشیند.',d:4600,run(){mode('app');setBal(2);setGoal(2);show(sBr,'cut');set(sBr._map,{transform:MAPZ});finger(0);
   pressRegion(sBr,'branches',123,291,38,38,10,500,()=>{later(emergeKiosk,200);later(()=>show(sHome,'back'),1700)});}},

 {c:6,f:'پایان',d:4600,run(){mode('close');finger(0);$('#tag').innerHTML='یک اتصال، <span>سه سرویس</span>';$('#sub').textContent='خرید، فروش و تحویل فیزیکی برای کاربران دیجی‌کالا';
   ['#tag','#sub'].forEach((s,i)=>A($(s),[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:800,delay:400+i*220,fill:'backwards'}));}},
];

/* ---------- Talapardaz kiosk ---------- */
const KS=.515137, KOY=547+44;              // screen scale and top inside the kiosk image
const kio=$('#kio'), kw=$('#kw'), kfg=$('#kfg');
const KL={};['k1','k1e','k2','k3','k4','k5','k6','k7','k8','k9','k10','kn','kd'].forEach(k=>{const d=document.createElement('div');d.className='kl';const im=document.createElement('img');im.src=IMG[k];im.alt='';d.appendChild(im);kw.appendChild(d);KL[k]=d});
$('#kimg').src=IMG.kiosk;$('#kcardImg').src=IMG.card;
const KV={head:{cx:720,cy:1280,h:2650},type:{cx:720,cy:1500,h:2600},base:{cx:720,cy:3050,h:2500},card:{cx:1019,cy:3440,h:900}};
let kNow=null;
const VW=580,VH=750,kfitEl=$('#kfit');
function fitK(){const w=kv.clientWidth,h=kv.clientHeight;if(!w||!h)return;const s=Math.min(w/VW,h/VH);kfitEl.style.transform=`translate(${((w-VW*s)/2).toFixed(1)}px,${((h-VH*s)/2).toFixed(1)}px) scale(${s.toFixed(4)})`}
new ResizeObserver(fitK).observe(kv);
function kT(v){const z=VH/v.h;return `translate(${(VW/2-v.cx*z).toFixed(2)}px,${(VH/2-v.cy*z).toFixed(2)}px) scale(${z.toFixed(5)})`}
function kcam(name,dur=0,easing=EIO){const v=typeof name==='string'?KV[name]:name;if(typeof name==='string')kNow=name;const to=kT(v);kio.getAnimations().forEach(a=>a.cancel());
  if(!dur||reduce){kio.style.transform=to;return}const from=kio.style.transform||to;kio.style.transform=to;kio.animate([{transform:from},{transform:to}],{duration:dur,easing})}
let kcur=null;
function kshow(k,how='fade'){const nx=KL[k];if(kcur===nx)return;const old=kcur;kcur=nx;Object.values(KL).forEach(l=>{if(l!==nx&&l!==old)l.classList.remove('on')});
  nx.getAnimations().forEach(a=>a.cancel());nx.style.zIndex=2;nx.classList.add('on');if(old)old.style.zIndex=1;
  if(!old||how==='cut'||reduce){if(old)old.classList.remove('on');return}
  old.getAnimations().forEach(a=>a.cancel());
  A(old,[{opacity:1,filter:'blur(0px)'},{opacity:0,filter:'blur(6px)'}],{duration:440,easing:'cubic-bezier(.45,0,.55,1)',fill:'none'}).onfinish=()=>{if(old!==kcur)old.classList.remove('on')};
  A(nx,[{opacity:0,transform:'translateY(18px)',filter:'blur(6px)'},{opacity:1,transform:'none',filter:'blur(0px)'}],{duration:760,delay:200,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'})}
const s2k=(x,y)=>[191+x*KS,KOY+y*KS];       // screen (2048 space) -> kiosk image space
function kfIn(x,y){kfg.getAnimations().forEach(a=>a.cancel());kfg.style.left=x+'px';kfg.style.top=y+'px';A(kfg,[{opacity:0,transform:'scale(1.25)'},{opacity:1,transform:'scale(1)'}],{duration:340,easing:'cubic-bezier(.2,.7,.3,1)'})}
function kfOut(){A(kfg,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.12)'}],{duration:360,easing:'ease-out'})}
function kfGlide(x,y,dur){const x0=parseFloat(kfg.style.left),y0=parseFloat(kfg.style.top);kfg.style.left=x+'px';kfg.style.top=y+'px';if(!reduce)kfg.animate([{left:x0+'px',top:y0+'px'},{left:x+'px',top:y+'px'}],{duration:dur,easing:EIO})}
function kfPress(x,y){if(!reduce)kfg.animate([{transform:'scale(1)'},{transform:'scale(.8)',offset:.4},{transform:'scale(1)'}],{duration:300,easing:'ease-out'});
  const r=document.createElement('div');r.className='kripple';r.style.left=x+'px';r.style.top=y+'px';kio.appendChild(r);
  A(r,[{transform:'scale(.6)',opacity:.95},{transform:'scale(3.2)',opacity:0}],{duration:640,easing:'ease-out'}).onfinish=()=>r.remove()}
/* tap a button drawn on the kiosk screen (rect in 2048x1536 screen space) */
function kbtn(k,x,y,w,h,at,after){later(()=>{const c=document.createElement('div');c.className='kpr';
  c.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px;background-image:url(${IMG[k]});background-position:${-x}px ${-y}px`;KL[k].appendChild(c);
  const [px,py]=s2k(x+w*.62,y+h/2),[bx,by]=s2k(x+w/2,y+h/2),back=kNow||'head';
  kcam({cx:718+(bx-718)*.55,cy:986+(by-986)*.55,h:1350},620);later(()=>kcam(back,600),1100);
  later(()=>kfIn(px,py),300);
  later(()=>{kfPress(px,py);A(c,[{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(.965)',filter:'brightness(1.35)',offset:.35},{transform:'scale(1)',filter:'brightness(1.12)'}],{duration:420,easing:'ease-out'});
    after&&later(after,260)},720);later(kfOut,1200)},at)}
/* typing on the physical PIN pad, digits appear in the screen field */
const PAD={1:[667,2125],2:[730,2125],3:[790,2125],4:[667,2160],5:[730,2160],6:[790,2160],7:[667,2196],8:[730,2196],9:[790,2196],0:[730,2232],ok:[850,2232]};
function kfield(k,y,h){const f=document.createElement('div');f.className='kf';f.style.cssText=`left:641px;top:${y}px;width:765px;height:${h}px`;KL[k].appendChild(f);return f}
function ktype(k,field,chars,mask,at,step,okAfter){const keys=[...chars].map(ch=>({k:ch,p:PAD[ch]}));keys.push({k:'ok',p:PAD.ok});
  later(()=>{kfIn(keys[0].p[0],keys[0].p[1]);
    keys.forEach((o,i)=>{const t=380+i*step;
      later(()=>{kfPress(o.p[0],o.p[1]);const g=document.createElement('div');g.className='kkey';g.style.left=o.p[0]+'px';g.style.top=o.p[1]+'px';kio.appendChild(g);
        A(g,[{opacity:0},{opacity:.55},{opacity:0}],{duration:360}).onfinish=()=>g.remove();
        if(o.k==='ok'){okAfter&&later(okAfter,250);return}
        const sp=document.createElement('span');sp.textContent=mask?'●':fa(o.k);field.appendChild(sp);A(sp,[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:260,fill:'none'})},t);
      if(i<keys.length-1)later(()=>kfGlide(keys[i+1].p[0],keys[i+1].p[1],Math.max(120,step-200)),t+200)});
    later(kfOut,380+(keys.length-1)*step+520)},at)}
function kcardReset(){const c=$('#kcard');c.getAnimations().forEach(a=>a.cancel());c.style.transform='translateY(-332px)';$('#kcard .sh').getAnimations().forEach(a=>a.cancel())}
const KFILL={k2:[852,138,'●●●●'],k4:[848,140,'09123456789'],k5:[860,140,'48291'],kn:[915,144,'0018273645']};
function kfillStatic(k){const d=KFILL[k];if(!d)return;const f=kfield(k,d[0],d[1]);if(k==='k5')f.style.letterSpacing='.35em';f.innerHTML=[...d[2]].map(c=>`<span>${fa(c)}</span>`).join('')}
function kprep(view,scr){mode('app');kcam(view,0);kcur=null;kshow(scr,'cut');kfillStatic(scr);kcardReset();kfg.getAnimations().forEach(a=>a.cancel());kfg.style.opacity=0}

const CH_K=[{n:'۰۰',t:'معرفی'},{n:'۰۱',t:'ورود'},{n:'۰۲',t:'تأیید شماره'},{n:'۰۳',t:'خرید'},{n:'۰۴',t:'تحویل'},{n:'۰۵',t:'جمع‌بندی'}];
const S_K=[
 {c:0,f:'طلاپرداز',d:3800,run(){mode('open');$('#tag').innerHTML='از حساب دیجی‌کالا، <span>تا کارت طلا</span>';$('#sub').textContent='خرید و تحویل طلاکارت در طلاپرداز، در چند لمس';
   kcam('head',0);kshow('k1','cut');kcardReset();
   A($('#tTC'),[{transform:'translateX(140px) rotate(-6deg)',opacity:0},{transform:'none',opacity:1}],{duration:1000,fill:'none'});
   A($('#tDK'),[{transform:'translateX(-140px) rotate(6deg)',opacity:0},{transform:'none',opacity:1}],{duration:1000,fill:'none'});
   A($('#xm'),[{opacity:0,transform:'scale(.3)'},{opacity:1,transform:'none'}],{duration:500,delay:750,fill:'backwards'});
   ['#tag','#sub'].forEach((x,i)=>A($(x),[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:800,delay:1000+i*220,fill:'backwards'}));}},
 {c:1,f:'کارت بانکی',t:'کارت بانکی، <em>در شیار</em>',p:'کاربر کارت بانکی‌اش را وارد طلاپرداز می‌کند تا هویتش تأیید شود.',d:3600,run(){kprep('head','k1');
   later(()=>{kshow('k1e','cut');const c=document.createElement('div');c.style.cssText='position:absolute;left:726px;top:803px;width:574px;height:470px;overflow:hidden';
     const im=document.createElement('div');im.style.cssText=`position:absolute;left:0;top:0;width:574px;height:470px;background:url(${IMG.k1}) -726px -803px/2048px 1536px no-repeat`;c.appendChild(im);KL.k1e.appendChild(c);
     A(im,[{transform:'none'},{transform:'translateY(-470px)'}],{duration:1300,easing:'cubic-bezier(.6,0,.35,1)'})},1300);}},
 {c:1,f:'رمز کارت',t:'چهار رقم، <em>روی دستگاه</em>',p:'رمز کارت با صفحه‌کلید فیزیکی خود طلاپرداز وارد می‌شود.',d:4400,run(){kprep('head','k1e');later(()=>kcam('type',1200),380);
   later(()=>kshow('k2'),150);later(()=>{const f=kfield('k2',852,138);ktype('k2',f,'4821',true,0,520)},1500);}},
 {c:1,f:'انتخاب خدمت',t:'خرید <em>طلاکارت</em>',p:'از منوی طلاپرداز، کاربر خرید طلاکارت را انتخاب می‌کند.',d:3400,run(){kprep('type','k2');later(()=>kcam('head',1200),380);
   later(()=>kshow('k3'),150);kbtn('k3',1324,728,724,190,1600);}},
 {c:2,f:'شماره همراه',t:'شماره همراه، <em>رقم به رقم</em>',p:'شماره‌ی همراه وارد می‌شود تا کد تأیید برایش پیامک شود.',d:5200,run(){kprep('head','k3');later(()=>kcam('type',1200),380);
   later(()=>kshow('k4'),150);later(()=>{const f=kfield('k4',848,140);ktype('k4',f,'09123456789',false,0,300)},1500);}},
 {c:2,f:'کد تأیید',t:'کد پیامک، <em>تأیید شد</em>',p:'کد یک‌بارمصرف روی همان صفحه‌کلید وارد می‌شود.',d:3800,run(){kprep('type','k4');
   later(()=>kshow('k5'),150);later(()=>{const f=kfield('k5',860,140);f.style.letterSpacing='.35em';ktype('k5',f,'48291',false,0,380)},700);}},
 {c:3,f:'انتخاب طلاکارت',t:'طلاکارت <em>۲ گرمی</em>',p:'کاربر وزن کارت را انتخاب می‌کند؛ قیمت هر کارت کنارش است.',d:3400,run(){kprep('type','k5');later(()=>kcam('head',1200),380);
   later(()=>kshow('k6'),150);kbtn('k6',1106,895,942,190,1600);}},
 {c:3,f:'انتخاب پلتفرم',t:'دیجی‌کالا، <em>اولِ فهرست</em>',p:'پلتفرمی که کاربر در آن حساب طلا دارد؛ دیجی‌کالا اولین گزینه است.',d:3600,run(){kprep('head','k6');
   later(()=>kshow('k7'),150);kbtn('k7',1106,686,942,192,1400);}},
 {c:3,f:'تأیید و پرداخت',t:'یک نگاه، <em>یک تأیید</em>',p:'وزن، کارمزد و هزینه‌ی نهایی پیش از پرداخت روی صفحه است.',d:3600,run(){kprep('head','k7');
   later(()=>kshow('k8'),150);kbtn('k8',1244,1296,804,190,1600);}},
 {c:3,f:'در حال بررسی',t:'لطفاً <em>منتظر بمانید…</em>',p:'طلاپرداز درخواست را با حساب دیجی‌کالای کاربر بررسی می‌کند.',d:2800,run(){kprep('head','k8');later(()=>kshow('k9'),150);
   later(()=>{const c=document.createElement('div');c.style.cssText=`position:absolute;left:820px;top:360px;width:360px;height:500px;background:url(${IMG.k9}) -820px -360px/2048px 1536px no-repeat`;KL.k9.appendChild(c);
     A(c,[{transform:'translateY(0) rotate(0)'},{transform:'translateY(-18px) rotate(-1.5deg)'},{transform:'translateY(0) rotate(0)'}],{duration:1600,iterations:2,easing:'ease-in-out',fill:'none'})},300);}},
 {c:4,f:'دریافت طلاکارت',t:'کارت طلا، <em>از دستگاه</em>',p:'طلاکارت ۲ گرمی از شیار طلاپرداز بیرون می‌آید.',d:5600,run(){kprep('head','k9');later(()=>kshow('k10'),150);
   later(()=>kcam('base',1700),1100);
   later(()=>{const c=$('#kcard');A(c,[{transform:'translateY(-332px)'},{transform:'translateY(6px)',offset:.85},{transform:'none'}],{duration:1500,easing:'cubic-bezier(.25,.8,.3,1)'})},2700);}},
 {c:4,f:'کارت در دست',t:'طلای واقعی، <em>در دست</em>',p:'کارت پلمب‌شده با قابلیت اصالت‌سنجی؛ همان طلایی که در دیجی‌کالا خریده شد.',d:4600,run(){mode('app');kshow('k10','cut');kfg.style.opacity=0;
   const c=$('#kcard');c.getAnimations().forEach(a=>a.cancel());c.style.transform='none';kcam('base',0);
   later(()=>kcam('card',1600),150);
   later(()=>{$('#kcard .sh').animate([{backgroundPosition:'120% 0'},{backgroundPosition:'-20% 0'}],{duration:1400,easing:'ease-in-out'})},1700);}},
 {c:5,f:'پایان',d:4200,run(){mode('close');$('#tag').innerHTML='حساب دیجی‌کالا، <span>کارت طلای واقعی</span>';$('#sub').textContent='خرید، تحویل و اصالت‌سنجی در شبکه‌ی طلاپردازهای طلاکارت';
   ['#tag','#sub'].forEach((x,i)=>A($(x),[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:800,delay:400+i*220,fill:'backwards'}));}},
];

const CH_D=[{n:'۰۰',t:'معرفی'},{n:'۰۱',t:'ورود'},{n:'۰۲',t:'انتخاب'},{n:'۰۳',t:'احراز هویت'},{n:'۰۴',t:'تحویل'},{n:'۰۵',t:'جمع‌بندی'}];
const S_D=[
 {c:0,f:'تحویل در طلاپرداز',d:3800,run(){mode('open');$('#tag').innerHTML='طلایی که در دیجی‌کالا داری، <span>در دست تو</span>';$('#sub').textContent='تحویل طلاکارت در طلاپرداز، بدون صف و فرم';
   kcam('head',0);kcur=null;kshow('k1','cut');kcardReset();
   A($('#tTC'),[{transform:'translateX(140px) rotate(-6deg)',opacity:0},{transform:'none',opacity:1}],{duration:1000,fill:'none'});
   A($('#tDK'),[{transform:'translateX(-140px) rotate(6deg)',opacity:0},{transform:'none',opacity:1}],{duration:1000,fill:'none'});
   A($('#xm'),[{opacity:0,transform:'scale(.3)'},{opacity:1,transform:'none'}],{duration:500,delay:750,fill:'backwards'});
   ['#tag','#sub'].forEach((x,i)=>A($(x),[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:800,delay:1000+i*220,fill:'backwards'}));}},
 {...S_K[1],c:1},
 {...S_K[2],c:1},
 {c:2,f:'تحویل طلاکارت',t:'تحویل <em>طلاکارت</em>',p:'از منوی طلاپرداز، کاربر تحویل طلاکارت را انتخاب می‌کند.',d:3600,run(){kprep('type','k2');later(()=>kcam('head',1200),380);
   later(()=>kshow('k3'),150);kbtn('k3',1324,952,724,192,1600);}},
 {c:2,f:'انتخاب پلتفرم',t:'طلا در <em>دیجی‌کالا</em>',p:'پلتفرمی که طلای کاربر در آن نگه‌داری می‌شود؛ دیجی‌کالا اول فهرست است.',d:3600,run(){kprep('head','k3');
   later(()=>kshow('k7'),150);kbtn('k7',1106,686,942,192,1400);}},
 {c:2,f:'انتخاب طلاکارت',t:'از موجودی، <em>۲ گرم</em>',p:'کاربر وزن کارتی را که می‌خواهد از موجودی‌اش تحویل بگیرد انتخاب می‌کند.',d:3400,run(){kprep('head','k7');
   later(()=>kshow('k6'),150);kbtn('k6',1106,895,942,190,1400);}},
 {c:3,f:'کد ملی',t:'کد ملی، <em>برای اطمینان</em>',p:'کد ملی صاحب حساب روی صفحه‌کلید دستگاه وارد می‌شود.',d:5600,run(){kprep('head','k6');later(()=>kcam('type',1200),380);
   later(()=>kshow('kn'),150);later(()=>{const f=kfield('kn',915,144);ktype('kn',f,'0018273645',false,0,300)},1500);}},
 {c:3,f:'تأیید تحویل',t:'یک نگاه، <em>یک تأیید</em>',p:'وزن، کارمزد و هزینه‌ی نهایی تحویل پیش از تأیید روی صفحه است.',d:3800,run(){kprep('type','kn');later(()=>kcam('head',1200),380);
   later(()=>kshow('kd'),150);kbtn('kd',1244,1296,804,190,1700);}},
 {c:3,f:'کد پیامک',t:'کد پیامک، <em>تأیید شد</em>',p:'کد یک‌بارمصرف به شماره‌ی ثبت‌شده در حساب ارسال و وارد می‌شود.',d:4400,run(){kprep('head','kd');later(()=>kcam('type',1200),380);
   later(()=>kshow('k5'),150);later(()=>{const f=kfield('k5',860,140);f.style.letterSpacing='.35em';ktype('k5',f,'73914',false,0,380)},1500);}},
 {c:4,f:'در حال بررسی',t:'لطفاً <em>منتظر بمانید…</em>',p:'طلاپرداز موجودی کاربر را از دیجی‌کالا کسر و کارت را آماده می‌کند.',d:3200,run(){kprep('type','k5');later(()=>kcam('head',1200),380);later(()=>kshow('k9'),150);
   later(()=>{const c=document.createElement('div');c.style.cssText=`position:absolute;left:820px;top:360px;width:360px;height:500px;background:url(${IMG.k9}) -820px -360px/2048px 1536px no-repeat`;KL.k9.appendChild(c);
     A(c,[{transform:'translateY(0) rotate(0)'},{transform:'translateY(-18px) rotate(-1.5deg)'},{transform:'translateY(0) rotate(0)'}],{duration:1600,iterations:2,easing:'ease-in-out',fill:'none'})},300);}},
 {...S_K[10],c:4,t:'طلاکارت، <em>از دستگاه</em>',p:'طلاکارت ۲ گرمی از شیار طلاپرداز تحویل داده می‌شود.'},
 {...S_K[11],c:4,p:'کارت پلمب‌شده با قابلیت اصالت‌سنجی؛ همان طلایی که در دیجی‌کالا داشت.'},
 {c:5,f:'پایان',d:4200,run(){mode('close');$('#tag').innerHTML='طلای دیجی‌کالا، <span>به شکل طلاکارت</span>';$('#sub').textContent='تحویل فیزیکی در شبکه‌ی طلاپردازهای طلاکارت';
   ['#tag','#sub'].forEach((x,i)=>A($(x),[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:800,delay:400+i*220,fill:'backwards'}));}},
];

/* phone <-> kiosk: a zoom-through. Leaving: the phone rushes past the viewer while the kiosk arrives from afar. Coming back: the reverse. */
const phH=$('#ph');
/* app + kiosk side by side: the focused device is larger, the other stays in view */
const devEl=$('.dev'),flowSvg=$('#flow');
function setDw(){devEl.style.setProperty('--dw',devEl.clientWidth+'px')}setDw();new ResizeObserver(setDw).observe(devEl);
function setDuo(m){devEl.classList.remove('duo-k','duo-p','duo-dk');if(m)devEl.classList.add('duo-'+m);if(m)document.body.classList.add('kvis');fitK()}
function rel(el){const d=devEl.getBoundingClientRect(),r=el.getBoundingClientRect();return [r.left+r.width/2-d.left,r.top+r.height/2-d.top]}
/* a gold thread from one device to the other, with a dot travelling along it */
function flowDot(fromEl,toEl,at,dur=1000){later(()=>{const [ax,ay]=rel(fromEl),[bx,by]=rel(toEl),mx=(ax+bx)/2,my=Math.min(ay,by)-90;
  const d=`M${ax.toFixed(1)} ${ay.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);p.setAttribute('fill','none');p.setAttribute('stroke','#D9B358');p.setAttribute('stroke-width','1.5');p.setAttribute('stroke-linecap','round');p.setAttribute('pathLength','1');p.setAttribute('stroke-dasharray','1 1');flowSvg.appendChild(p);
  A(p,[{strokeDashoffset:1,opacity:.9},{strokeDashoffset:0,opacity:.9,offset:.55},{strokeDashoffset:0,opacity:.9,offset:.8},{strokeDashoffset:0,opacity:0}],{duration:dur*2.1,easing:'ease-in-out',fill:'both'});
  const o=document.createElement('div');o.className='fdot';o.style.offsetPath=`path('${d}')`;devEl.appendChild(o);
  A(o,[{offsetDistance:'0%',opacity:0},{offsetDistance:'8%',opacity:1,offset:.1},{offsetDistance:'100%',opacity:1,offset:.92},{offsetDistance:'100%',opacity:0}],{duration:dur,delay:dur*.35,easing:EIO,fill:'both'}).onfinish=()=>o.remove()},at)}
/* home: the goal bar ("کارت هدف") follows the balance */
const goalC=document.createElement('div');goalC.className='goal';goalC.style.cssText+=`left:56px;top:384px;width:240px;height:32px;background:url(${IMG.goalbg}) 0 0/100% 100%`;sHome.appendChild(goalC);
const goalT=document.createElement('div');goalT.className='goal';goalT.style.cssText+='right:85px;top:388px;height:24px;align-items:center;gap:4px;direction:rtl;white-space:nowrap;font-size:15px;font-weight:500;color:#2A2E32';sHome.appendChild(goalT);
const goalB=document.createElement('div');goalB.className='goal';goalB.style.cssText+='left:31px;top:427px;width:259px;height:9px;border-radius:5px;background:#fff;overflow:hidden';sHome.appendChild(goalB);
const goalF=document.createElement('i');goalF.style.cssText='position:absolute;right:0;top:0;bottom:0;border-radius:5px;background:#E7C569';goalB.appendChild(goalF);
let goalOn=false;
function setGoal(g){goalOn=g!=null;[goalC,goalT,goalB].forEach(e=>e.style.display=goalOn?'flex':'none');if(!goalOn)return;
  const r=Math.max(0,2-g);goalT.innerHTML=r<.05?`<span>طلاکارت</span><b style="font-weight:800">${fa(2)}</b><span>گرمی آماده‌ی دریافت است</span>`:`<b style="font-weight:800;direction:ltr;unicode-bidi:isolate">${fa(r.toFixed(1))}</b><span>گرم تا تبدیل به طلای فیزیکی</span><b style="font-weight:800">${fa(2)}</b><span>گرمی</span>`;goalF.style.width=(Math.min(1,g/2)*100).toFixed(2)+'%'}
function animGoal(a,b,at,dur){const n=30;for(let i=0;i<=n;i++)later(()=>{const t=i/n,e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;setGoal(a+(b-a)*e)},at+i*dur/n)}
setGoal(null);

function kOn(){document.body.classList.add('kvis','kon')}
const dkb=$('#dkb');$('#dkbLogo').src=IMG.dklogo;
function setDk(g){$('#dkG').textContent=fa(Math.round(g*1000).toLocaleString('en-US'));$('#dkR').textContent=fa(Math.round(g*194568030).toLocaleString('en-US'))+' ریال'}
let wasDk=false;
function resetDeck(){wasDk=dkb.getAnimations().length>0;[dkb,$('#dkD')].forEach(e=>{e.getAnimations().forEach(a=>a.cancel())});document.body.classList.remove('kon','kvis');setDuo(null);flowSvg.innerHTML='';setGoal(null);[phH,kv].forEach(e=>e.getAnimations().forEach(a=>{if(!(a instanceof CSSTransition))a.cancel()}));setBal(null)}
const ZIN='cubic-bezier(.55,0,.8,.2)',ZOUT='cubic-bezier(.16,1,.3,1)';
function toKiosk(at,scr){later(()=>{document.body.classList.add('kvis');kcam('head',0);kcur=null;kshow(scr,'cut');kcardReset();kfg.style.opacity=0;document.body.classList.add('kon');
  A(phH,[{opacity:1,transform:'none',filter:'blur(0px)'},{opacity:0,transform:'scale(1.45)',filter:'blur(14px)'}],{duration:850,easing:ZIN,fill:'none'});
  A(kv,[{opacity:0,transform:'scale(.5)',filter:'blur(14px)'},{opacity:1,transform:'none',filter:'blur(0px)'}],{duration:1400,delay:420,easing:ZOUT,fill:'backwards'})},at)}
function toPhone(at){later(()=>{A(kv,[{opacity:1,transform:'none',filter:'blur(0px)'},{opacity:0,transform:'scale(.5)',filter:'blur(14px)'}],{duration:850,easing:ZIN,fill:'forwards'});
  document.body.classList.remove('kon');
  A(phH,[{opacity:0,transform:'scale(1.45)',filter:'blur(14px)'},{opacity:1,transform:'none',filter:'blur(0px)'}],{duration:1400,delay:420,easing:ZOUT,fill:'backwards'});
  later(()=>document.body.classList.remove('kvis'),900)},at)}
function emergeKiosk(){const m=document.createElement('div');m.style.cssText='position:absolute;left:167px;top:146px;width:2px;height:2px';sBr._mc.appendChild(m);const [px,py]=rel(m);m.remove();
  setDuo('k');kcam('head',0);kcur=null;kshow('k3','cut');kcardReset();kfg.style.opacity=0;
  const d=devEl.getBoundingClientRect(),k=kv.getBoundingClientRect(),em=$('#kemg');em.style.transformOrigin=`${(px-(k.left-d.left)).toFixed(1)}px ${(py-(k.top-d.top)).toFixed(1)}px`;
  A(em,[{opacity:0,transform:'scale(.04)',filter:'blur(3px)'},{opacity:1,transform:'scale(.25)',filter:'blur(1px)',offset:.18},{opacity:1,transform:'none',filter:'blur(0px)'}],{duration:1500,easing:ZOUT,fill:'backwards'})}
function appK(){setDuo('k');setBal(2);setGoal(2);show(sHome,'cut');finger(0)}
const S_APPK=[
 {c:5,f:'تحویل طلاکارت',t:'تحویل <em>طلاکارت</em>',p:'کاربر با ۲ گرم موجودی به طلاپرداز رسیده؛ اپ کنار دستگاه، تحویل را از منو انتخاب می‌کند.',d:3000,run(){appK();kprep('head','k3');
   kbtn('k3',1324,952,724,192,500);}},
 ...S_D.slice(4,10).map(st=>({...st,c:5,run(){appK();st.run()}})),
 {c:5,f:'دریافت و بازگشت',t:'کارت در دست، <em>موجودی به‌روز</em>',p:'طلاکارت ۲ گرمی از طلاپرداز بیرون می‌آید و همان لحظه از موجودی اپ کم می‌شود.',d:7400,run(){appK();kprep('head','k9');
   later(()=>kshow('k10'),150);later(()=>kcam('base',1500),700);
   later(()=>A($('#kcard'),[{transform:'translateY(-332px)'},{transform:'translateY(6px)',offset:.85},{transform:'none'}],{duration:1400,easing:'cubic-bezier(.25,.8,.3,1)'}),1900);
   later(()=>kcam({cx:1019,cy:3400,h:1250},1800),2300);
   later(()=>setDuo('p'),3300);flowDot($('#kcard'),balG,4300,1000);countBal(2,0,5100,1500);}},
];
S_APP.splice(S_APP.findIndex(x=>x.c===6),0,...S_APPK);
const CH_KM=[{n:'۰۰',t:'معرفی'},{n:'۰۱',t:'ورود'},{n:'۰۲',t:'تأیید شماره'},{n:'۰۳',t:'خرید'},{n:'۰۴',t:'دریافت کارت'},{n:'۰۵',t:'تحویل از موجودی'},{n:'۰۶',t:'جمع‌بندی'}];
const S_KM=[...S_K.slice(0,12),
 {c:5,f:'تحویل طلاکارت',t:'این بار، <em>تحویل از موجودی</em>',p:'کاربری که در دیجی‌کالا طلا دارد، از همین منو تحویل طلاکارت را انتخاب می‌کند.',d:5000,run(){kprep('card','k10');const c=$('#kcard');c.style.transform='none';
   later(()=>A(c,[{transform:'none',opacity:1},{transform:'translateY(60px)',opacity:0}],{duration:700,easing:EIN}),250);
   later(()=>kcam('head',1700),800);later(()=>kshow('k3'),1700);kbtn('k3',1324,952,724,192,3200);}},
 ...S_D.slice(4,11).map(st=>({...st,c:5})),
 {c:5,f:'موجودی دیجی‌کالا',t:'در دیجی‌کالا هم، <em>کسر شد</em>',p:'۲ گرم تحویل‌شده همان لحظه از دارایی طلای کاربر در دیجی‌کالا کم می‌شود.',d:5600,run(){kprep('base','k10');$('#kcard').style.transform='none';setDk(2.5);
   later(()=>{setDuo('dk');A(dkb,[{opacity:0,transform:'translateX(-30px) scale(.94)'},{opacity:1,transform:'none'}],{duration:900,delay:350,easing:ZOUT,fill:'both'})},150);
   flowDot($('#kcard'),$('#dkG'),1400,1000);
   later(()=>A($('#dkD'),[{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:500,easing:ZOUT,fill:'both'}),2300);
   const n=28;for(let i=0;i<=n;i++)later(()=>{const t=i/n,e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;setDk(2.5-2*e)},2500+i*1500/n);}},
 {...S_K[12],c:6,run(){if(wasDk){setDk(.5);setDuo('dk');A(kv,[{opacity:1},{opacity:0}],{duration:500,fill:'forwards'});A(dkb,[{opacity:1},{opacity:0,transform:'scale(.96)'}],{duration:450,fill:'forwards'});A($('#dkD'),[{opacity:1},{opacity:1}],{duration:450,fill:'forwards'})}mode('close');$('#tag').innerHTML='خرید یا تحویل، <span>یک طلاپرداز</span>';$('#sub').textContent='خرید، تحویل و اصالت‌سنجی در شبکه‌ی طلاپردازهای طلاکارت';
   ['#tag','#sub'].forEach((x,i)=>A($(x),[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:800,delay:400+i*220,fill:'backwards'}));}},
];

/* ---------- player ---------- */
let CH=CH_APP,S=S_APP,total=0;
const prog=$('#prog');
function buildUI(){prog.innerHTML=CH.map((c,i)=>{const d=S.filter(s=>s.c===i).reduce((a,s)=>a+s.d,0);return `<button class="seg" data-c="${i}" style="flex-grow:${d}" aria-label="${c.t}"><div class="tr"><i></i></div><span>${c.t}</span></button>`}).join('');
  prog.querySelectorAll('.seg').forEach(b=>b.onclick=()=>go(S.findIndex(s=>s.c===+b.dataset.c)));
  $('#fgrid').innerHTML=CH.map((c,i)=>`<div class="fcol"><h3>${c.t} <small>${c.n}</small></h3>${S.map((s,j)=>s.c===i?`<button class="fbtn" data-j="${j}"><b>${fa(j+1)}</b>${s.f}</button>`:'').join('')}</div>`).join('');
  document.querySelectorAll('.fbtn').forEach(b=>b.onclick=()=>{go(+b.dataset.j);$('#stage').scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})});
  total=S.reduce((a,s)=>a+s.d,0);window.__total=total}
const DECKS={app:[CH_APP,S_APP],kiosk:[CH_KM,S_KM],deliv:[CH_D,S_D]};
function useDeck(k){[CH,S]=DECKS[k];window.__S=S;document.body.dataset.deck=k;idx=0;buildUI()}
let idx=0,playing=true,t0=0,elapsed=0,adv=null,lastCap='';
function setCap(s){const c=CH[s.c];$('#capN').textContent=c.n;$('#capC').textContent=c.t;if(location.hash==="#render")return;
  if(s.t&&s.t!==lastCap){lastCap=s.t;const tx=$('#capTxt');
    const swap=()=>{$('#capT').innerHTML=s.t;$('#capD').textContent=s.p;A(tx,[{opacity:0,transform:'translateY(14px)',filter:'blur(4px)'},{opacity:1,transform:'none',filter:'blur(0)'}],{duration:700,fill:'none'})};
    if(reduce||!$('#capT').innerHTML)swap();else A(tx,[{opacity:1},{opacity:0,transform:'translateY(-10px)'}],{duration:260,easing:EIN,fill:'none'}).onfinish=swap}}
function go(i){if(!playing&&!document.documentElement.classList.contains('render')){document.getAnimations().forEach(a=>{if(a.playState==='paused')a.play()});playing=true;setPlayIcon(true)}clearT();clearTimeout(adv);idx=(i+S.length)%S.length;const s=S[idx];setCap(s);resetDeck();s.run();elapsed=0;t0=performance.now();
  document.querySelectorAll('.fbtn').forEach(b=>b.classList.toggle('cur',+b.dataset.j===idx));
  if(playing)adv=setTimeout(()=>go(idx+1),s.d)}
function setPlay(p){if(p===playing)return;playing=p;$('#bPlay').setAttribute('aria-label',p?'توقف':'پخش');
  $('#playIc').innerHTML=p?'<path d="M8 5v14M16 5v14"/>':'<path d="M17 12 8 5.5v13z"/>';
  document.getAnimations().forEach(a=>{if(p){if(a.playState==='paused')a.play()}else if(a.playState==='running')a.pause()});
  if(p){resumeT();t0=performance.now()-elapsed;adv=setTimeout(()=>go(idx+1),Math.max(0,S[idx].d-elapsed))}else{pauseT();elapsed=performance.now()-t0;clearTimeout(adv)}}
function setPlayIcon(p){$('#bPlay').setAttribute('aria-label',p?'توقف':'پخش');$('#playIc').innerHTML=p?'<path d="M8 5v14M16 5v14"/>':'<path d="M17 12 8 5.5v13z"/>'}
function openMenu(){clearT();clearTimeout(adv);playing=false;setPlayIcon(false);finger(0);document.body.classList.add('menu');$('#stage').className='m-menu';
  document.querySelectorAll('.pick').forEach((e,i)=>A(e,[{opacity:0,transform:'translateY(20px)'},{opacity:1,transform:'none'}],{duration:700,delay:150+i*120,fill:'backwards'}))}
function startApp(k='app'){useDeck(typeof k==='string'?k:'app');document.body.classList.remove('menu');playing=true;setPlayIcon(true);lastCap='';$('#capT').innerHTML='';go(0)}
$('#pkApp').onclick=()=>startApp('app');$('#bMenu').onclick=openMenu;
$('#pkAtm').onclick=()=>startApp('kiosk');
$('#bPlay').onclick=()=>setPlay(!playing);document.querySelectorAll('button').forEach(b=>b.addEventListener('mousedown',e=>e.preventDefault()));
addEventListener('keyup',e=>{if(e.code==='Space'&&e.target.tagName==='BUTTON')e.preventDefault()});$('#cNext').onclick=()=>go(idx+1);$('#bPrev').onclick=()=>go(idx-1);
addEventListener('keydown',e=>{if(document.body.classList.contains('menu')){if(e.key==='Enter'&&document.activeElement===document.body)startApp();return}
  if(e.key==='Escape'){openMenu();return}
  if(e.code==='Space'){e.preventDefault();setPlay(!playing)}else if(e.key==='ArrowLeft')go(idx+1);else if(e.key==='ArrowRight')go(idx-1)});
function tick(){const e=playing?performance.now()-t0:elapsed,frac=Math.min(1,e/S[idx].d);let before=0;const segs=prog.querySelectorAll('.seg');
  CH.forEach((c,i)=>{const st=S.map((s,j)=>[s,j]).filter(([s])=>s.c===i),tot=st.reduce((a,[s])=>a+s.d,0);let dn=0;
    st.forEach(([s,j])=>{if(j<idx){dn+=s.d;before+=s.d}else if(j===idx)dn+=s.d*frac});
    segs[i].querySelector('i').style.width=(dn/tot*100)+'%';segs[i].classList.toggle('cur',S[idx].c===i)});
  const sec=Math.floor((before+S[idx].d*frac)/1000),ts=Math.round(total/1000);
  $('#time').textContent=fa(`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')} / ${Math.floor(ts/60)}:${String(ts%60).padStart(2,'0')}`);requestAnimationFrame(tick)}
// Editor adapter: the parent is the single playback clock and owns all editable copy.
let placementScene=null,placementMode='desktop';
function layoutTargets(){return {copy:$('#stage').classList.contains('m-open')||$('#stage').classList.contains('m-close')?$('.opener-copy'):$('#capTxt'),media:$('#stage').classList.contains('m-open')||$('#stage').classList.contains('m-close')?null:$('.dev')}}
function placeLegacy(boxes={}){for(const [kind,el] of Object.entries(layoutTargets())){if(!el)continue;const box=boxes[kind];el.classList.toggle('studio-positioned',!!box);for(const key of ['x','y','w','h'])if(box)el.style.setProperty('--place-'+key,box[key]+'%');else el.style.removeProperty('--place-'+key)}fit();fitK()}
function renderLegacyText(c){const intro=$('#stage').classList.contains('m-open')||$('#stage').classList.contains('m-close');renderTitle($('#capT'),{...c,titleFormat:{fontSize:c.fontSize,...c.titleFormat}});renderTitle($('#tag'),{...c,titleFormat:{fontSize:c.fontSize+14,...c.titleFormat}});renderDescription($('#stage'),intro?$('#sub'):$('#capD'),c,placementMode,true);if(intro)$('#capD').textContent=c.description;else $('#sub').textContent=c.description}
function reportLayout(){if(!placementScene)return;const boxes={},r=$('#stage').getBoundingClientRect();const add=(key,el)=>{if(!el)return;const b=el.getBoundingClientRect();boxes[key]={x:(b.left-r.left)/r.width*100,y:(b.top-r.top)/r.height*100,w:b.width/r.width*100,h:b.height/r.height*100}};for(const [key,el] of Object.entries(layoutTargets()))add(key,el);$('#stage').querySelectorAll('[data-text-block]').forEach(el=>add('text:'+el.dataset.textBlock,el));parent.postMessage({type:'talacard-layout',sceneId:placementScene.id,boxes},location.origin)}
window.addEventListener('message',e=>{
 if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='talacard')return;const m=e.data;
 if(m.action==='load'){
  playing=false;clearT();clearTimeout(adv);useDeck(DECKS[m.scene.legacyDeck]?m.scene.legacyDeck:'app');document.body.classList.remove('menu');document.querySelectorAll('.studio-positioned').forEach(el=>el.classList.remove('studio-positioned'));
  placementScene=m.scene;placementMode=m.compact?'compact':'desktop';document.getAnimations().forEach(a=>a.cancel());go(Math.max(0,Math.min(S.length-1,Number(m.index)||0)));
  const c=m.scene,stage=$('#stage');stage.style.background=c.presentationStyle==='reference'?'':c.background;$('#bgcanvas').style.opacity=c.presentationStyle==='plain'?'0':'1';stage.style.setProperty('--studio-accent',c.accent);stage.style.setProperty('--ink-d',c.textColor);stage.style.setProperty('--gold-d',c.accent);$('#capD').style.color=c.textColor;$('#capC').textContent=c.chapter;$('#capN').textContent=fa(m.number||1);$('#capTxt').style.opacity=1;
  renderLegacyText(c);placeLegacy(c.placement?.[placementMode]);window.__advance?.(0);reportLayout();parent.postMessage({type:'talacard-loaded',sceneId:c.id,request:m.request},location.origin);
 }else if(m.action==='text'){placementScene=m.scene;renderLegacyText(placementScene);reportLayout()}
 else if(m.action==='placement'){placementScene.placement||={};placementScene.placement[placementMode]=m.placement;placeLegacy(m.placement);reportLayout()}
 else if(m.action==='advance'){window.__advance?.(Math.max(0,Math.min(250,m.delta||0)))}
});
addEventListener('resize',()=>{if(placementScene){placementMode=innerWidth<=760?'compact':'desktop';placeLegacy(placementScene.placement?.[placementMode]);reportLayout()}});

/* background: slow guilloche drift */
const cv=$('#bgcanvas'),cx=cv.getContext('2d');let ph=0;
function bg(){const r=cv.getBoundingClientRect();cv.width=Math.max(10,r.width);cv.height=Math.max(10,r.height)}
function drawBg(){const W=cv.width,H=cv.height;cx.clearRect(0,0,W,H);cx.lineWidth=1;
  for(let k=0;k<34;k++){cx.strokeStyle=`rgba(231,197,105,${.16+.16*Math.sin(k/34*Math.PI)})`;cx.beginPath();
    for(let x=0;x<=W;x+=8){const t=x/W;const y=H*(.55+.3*Math.sin(t*Math.PI*1.5+.6+ph))+(k-17)*H*.011;x?cx.lineTo(x,y):cx.moveTo(x,y)}cx.stroke()}
  if(!reduce&&(playing||location.hash==="#render")){ph+=.0032}setTimeout(()=>requestAnimationFrame(drawBg),33)}
function fit(){const d=$('.dev').getBoundingClientRect();const s=Math.max(.42,Math.min(1,(d.height-28)/886,(d.width-24)/430));
  $('#phone').style.transform=`scale(${s})`;$('#ph').style.width=395*s+'px';$('#ph').style.height=886*s+'px';bg()}
addEventListener('resize',fit);
useDeck('app');
const start=()=>{fit();drawBg();$('#pkAppImg').src=IMG.homecrop;$('#pkAtmImg').src=IMG.atm;if(location.hash==='#render'){document.body.classList.remove('menu');playing=false;window.__ready=true;parent.postMessage({type:'talacard-ready'},location.origin)}else if(location.hash==='#kiosk'||location.hash==='#render-kiosk')startApp('kiosk');else if(location.hash==='#deliv'||location.hash==='#render-deliv')startApp('deliv');else if(location.hash==='#app'||location.hash==='#render')startApp('app');else openMenu();addEventListener('resize',()=>{if(kNow)kcam(kNow,0)});requestAnimationFrame(tick);window.__ready=true};
Promise.all([...DECODED,document.fonts?document.fonts.ready:0]).then(start);
})();
