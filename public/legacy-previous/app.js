import {renderTitle,renderDescription} from '../text.js';

if(location.hash==='#render'){(function(){
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


const IMG0={"home": "/original/assets/8c811a5f2b621041.webp", "buyempty": "/original/assets/26e6f8b5bb62d3c0.webp", "buyfill": "/original/assets/a0210219bbcad161.webp", "receipt": "/original/assets/51c563562c995b3d.webp", "done": "/original/assets/98ea29b045cf577a.webp", "sellfill": "/original/assets/6d2303fa8b5ad253.webp", "sellrec": "/original/assets/db1b05602a4ba430.webp", "sellok": "/original/assets/ee71d3ecac421965.webp", "cardready": "/original/assets/53f9e7adccfcaf63.webp", "branches": "/original/assets/ea09fdef2cd8e6c8.webp", "detail": "/original/assets/476c21cc9c436877.webp", "ps_buyfill": "/original/assets/cfc0fce9445047db.webp", "ps_sellfill": "/original/assets/93d367c36be55526.webp", "rs_receipt": "/original/assets/5210d819a86651af.webp", "rs_sellrec": "/original/assets/5410795da58e46c6.webp"};
(()=>{
const IMG={},DECODED=[];
for(const k in IMG0){ IMG[k]=IMG0[k];const im=new Image();im.src=IMG[k];DECODED.push(im.decode().catch(()=>{}))}
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
const sBr=s812('branches');L(sBr._w,'branches',0,0,375,812);
/* sheet screens: backdrop + sheet */
function sheetScr(id,src,cut,h=812){const s=s812(id);s._top=L(s._w,src,0,0,375,cut);s._sheet=L(s._w,src,0,cut,375,h-cut);return s}
const sRec=sheetScr('receipt','receipt',293), sSrec=sheetScr('sellrec','sellrec',343), sDet=sheetScr('detail','detail',493);
[[sRec,'receipt'],[sSrec,'sellrec']].forEach(([s,k])=>{s._pc=box(s._sheet,`left:44px;top:${577-s._sheet.offsetTop||0}px;width:287px;height:164px;overflow:hidden;background:url(${IMG['rs_'+k]}) 0 0/287px 164px no-repeat`);s._paper=L(s._pc,k,52,577,271,160,8,0);});
/* result screens: panel pops */
function okScr(id,src,ledY){const s=s812(id);L(s._w,src,0,0,375,60);s._panel=L(s._w,src,40,280,295,260);s._btn=L(s._w,src,0,745,375,67);s._ledY=ledY;return s}
const sDone=okScr('done','done',497), sSok=okScr('sellok','sellok',509);

/* trade screen (buy & sell): top card, live amount, keypad, platform sheet */
const sT=screen('trade');
sT._topB=L(sT,'buyfill',0,0,375,340);sT._topS=L(sT,'sellfill',0,0,375,340);
const amt=box(sT,'','amt');amt.innerHTML='<span class="num" id="num"></span><span class="unit">گرم</span>';
function plat(src){const g=document.createElement('div');g.className='L';g.style.cssText='left:0;top:0;width:375px;height:866px;background:none';
  L(g,src,0,345,375,461);box(g,`left:16px;top:440px;width:343px;height:268px;background:url(${IMG['ps_'+src]}) 0 0/343px 268px no-repeat`);
  g._rows=[[444,76],[528,54],[590,54],[652,54]].map(([y,h])=>L(g,src,16,y,343,h));
  g._btn=L(g,src,30,738,316,54);sT.appendChild(g);return g}
sT._pB=plat('buyfill');sT._pS=plat('sellfill');
sT._nav=L(sT,'buyfill',0,806,375,60);
sT._kp=document.createElement('div');sT._kp.className='L';sT._kp.style.cssText='left:0;top:0;width:375px;height:866px;background:none';sT.appendChild(sT._kp);
L(sT._kp,'buyempty',0,488,375,378);sT._kt=box(sT._kp,'','kt');sT._kt.textContent='مقدار خرید';
sT._glow=box(sT,'','glow');

/* ---------- engine ---------- */
let T=[],tok=0;
const later=(f,ms)=>{const k=tok;T.push(setTimeout(()=>k===tok&&f(),ms))};
const clearT=()=>{T.forEach(clearTimeout);T=[];tok++;document.getAnimations().forEach(a=>{if(a.effect&&a.effect.target&&sw.contains(a.effect.target))a.cancel()});document.querySelectorAll('.ripple,.dot').forEach(e=>e.remove())};
const A=(el,kf,o={})=>el.animate(reduce?[kf[kf.length-1],kf[kf.length-1]]:kf,Object.assign({fill:'both',easing:EASE},o,reduce?{duration:1,delay:0}:{}));
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
  if(how==='sheet'){A(s._top,[{opacity:0},{opacity:1}],{duration:420,easing:'ease-out',fill:'none'});
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
function typeSeq(keys,mode,at,step){tapSeq([...keys.map(keyPt),{x:187,y:828,fn:()=>keypadDown(mode,0)}],at,step)}
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
const CH=[{n:'۰۰',t:'معرفی'},{n:'۰۱',t:'خانه'},{n:'۰۲',t:'خرید'},{n:'۰۳',t:'فروش'},{n:'۰۴',t:'تحویل فیزیکی'},{n:'۰۵',t:'جمع‌بندی'}];
const S=[
 {c:0,f:'طلاکارت × دیجی‌کالا',d:4200,run(){mode('open');finger(0);$('#tag').innerHTML='طلای دیجیتال، <span>در دست</span>';$('#sub').textContent='خرید، فروش و تحویل فیزیکی، همه در یک اپ';
   A($('#tTC'),[{transform:'translateX(140px) rotate(-6deg)',opacity:0},{transform:'none',opacity:1}],{duration:1000,fill:'none'});
   A($('#tDK'),[{transform:'translateX(-140px) rotate(6deg)',opacity:0},{transform:'none',opacity:1}],{duration:1000,fill:'none'});
   A($('#xm'),[{opacity:0,transform:'scale(.3)'},{opacity:1,transform:'none'}],{duration:500,delay:750,fill:'backwards'});
   ['#tag','#sub'].forEach((s,i)=>A($(s),[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:800,delay:1100+i*220,fill:'backwards'}));}},
 {c:1,f:'خانه',t:'همه‌ی طلای تو، روی <em>یک نمایشگر</em>',p:'موجودی طلا و نقد داخل همان دستگاهی دیده می‌شود که کاربر در ATM طلاکارت هم می‌بیند.',d:3600,run(){mode('app');finger(0);show(sHome,'cut');set(sHome._img,{});
   A(sHome,[{opacity:0,transform:'scale(1.03)'},{opacity:1,transform:'none'}],{duration:900,fill:'backwards',delay:300});}},

 {c:2,f:'وارد کردن مقدار',t:'یک گرم طلا؟ <em>چهار لمس</em>',p:'عدد با صفحه‌کلید خود اپ وارد می‌شود و هر رقم همان لحظه روی نمایشگر می‌نشیند.',d:6400,run(){mode('app');show(sHome,'cut');
   trade('buy','kp');set(sT._kp,{transform:'translateY(400px)'});
   pressRegion(sHome,'home',190,294,113,37,12,300,()=>{show(sT,'push');A(sT._kp,[{transform:'translateY(400px)'},{transform:'translateY(-6px)',offset:.8},{transform:'none'}],{duration:760,delay:260})});
   typeSeq(['1','.','0','0'],'buy',2000,700);}},
 {c:2,f:'پلتفرم‌ها بالا می‌آیند',t:'دیجی‌کالا، <em>اولِ صف</em>',p:'کیبورد کنار می‌رود و قیمت پلتفرم‌ها بالا می‌آید. دیجی‌کالا اول فهرست است و خرید داخل طلاکارت انجام می‌شود.',d:4600,run(){mode('app');show(sT,'cut');trade('buy','plat');
   glowRow(500);later(()=>tapAt(187,765,0,sT._pB._btn),3500);}},
 {c:2,f:'رسید خرید',t:'رسید، <em>تازه از دستگاه</em>',p:'برگه‌ی رسید از شیار بیرون می‌آید: قیمت لحظه‌ای، کارمزد و مبلغ پرداختی.',d:5200,run(){mode('app');show(sT,'cut');trade('buy','plat');finger(0);
   show(sRec,'sheet');printPaper(sRec,800);pressRegion(sRec,'receipt',16,756,343,48,14,3900);}},
 {c:2,f:'خرید موفق',t:'<em>چراغ سبز!</em>',p:'خرید ثبت شد و طلا در حساب کاربر نشست.',d:3800,run(){mode('app');finger(0);show(sDone,'fade',500);popPanel(sDone,150);}},

 {c:3,f:'فروش',t:'حالا <em>برعکس</em>',p:'از زبانه‌ی فروش، همان صفحه‌کلید و همان چهار لمس. این بار پلتفرم‌های فروش بالا می‌آیند.',d:8200,run(){mode('app');show(sDone,'cut');set(sDone._panel,{});set(sDone._btn,{});
   pressRegion(sDone,'done',16,760,343,40,12,300,()=>{show(sHome,'back')});
   later(()=>{trade('buy','kp');set(sT._kp,{transform:'translateY(400px)'})},1100);
   pressRegion(sHome,'home',190,294,113,37,12,1500,()=>{show(sT,'push');A(sT._kp,[{transform:'translateY(400px)'},{transform:'translateY(-6px)',offset:.8},{transform:'none'}],{duration:760,delay:260})});
   later(()=>tapAt(110,114,0,null,()=>{A(sT._topS,[{opacity:0},{opacity:1}],{duration:380});A(sT._topB,[{opacity:1},{opacity:0}],{duration:380});
     sT._kt.style.visibility='visible';A(sT._kt,[{opacity:0},{opacity:1}],{duration:380})}),3000);
   typeSeq(['1','.','0','0'],'sell',4100,620);}},
 {c:3,f:'پلتفرم‌های فروش',t:'باز هم <em>دیجی‌کالا اول</em>',p:'قیمت خرید هر پلتفرم کنار هم است. کاربر روی بهترین گزینه فروش را تمام می‌کند.',d:4400,run(){mode('app');show(sT,'cut');trade('sell','plat');
   glowRow(400);later(()=>tapAt(187,765,0,sT._pS._btn),3300);}},
 {c:3,f:'رسید فروش',t:'مبلغ دریافتی، <em>بدون حدس</em>',p:'رسید فروش با مبلغ دریافتی چاپ می‌شود و کاربر آن را تأیید می‌کند.',d:5000,run(){mode('app');show(sT,'cut');trade('sell','plat');finger(0);
   show(sSrec,'sheet');printPaper(sSrec,800);pressRegion(sSrec,'sellrec',16,756,343,48,14,3800);}},
 {c:3,f:'فروش موفق',t:'فروش <em>انجام شد</em>',p:'نتیجه روی نمایشگر تیره‌ی دستگاه می‌آید.',d:3600,run(){mode('app');finger(0);show(sSok,'fade',500);popPanel(sSok,150);}},

 {c:4,f:'کارت هدف',t:'طلای دیجیتال، <em>آماده‌ی دست گرفتن</em>',p:'از «کارت هدف» در خانه، کاربر مسیر طلایی‌اش را می‌بیند. کارت ۲ گرمی آماده‌ی دریافت است.',d:5600,run(){mode('app');show(sSok,'cut');set(sSok._panel,{});set(sSok._btn,{});set(sCard._img,{});
   pressRegion(sSok,'sellok',326,26,30,30,15,300,()=>show(sHome,'back'));
   pressRegion(sHome,'home',16,342,343,148,16,1700,()=>show(sCard,'push'));
   later(()=>A(sCard._img,[{transform:'none'},{transform:'translateY(-106px)'}],{duration:1300,easing:EIO}),3300);}},
 {c:4,f:'نزدیک‌ترین طلاپرداز',t:'نزدیک‌ترین <em>طلاپرداز</em> کجاست؟',p:'نقشه‌ی شعب باز می‌شود و اطلاعات کیوسک انتخاب‌شده بالای نقشه می‌آید.',d:4800,run(){mode('app');show(sCard,'cut');set(sCard._img,{transform:'translateY(-106px)'});
   later(()=>{const c=L(sCard,'cardready',48,834,280,36,48,728);c.style.borderRadius='14px';c.style.zIndex=5;tapAt(187,746,0,c,()=>{show(sBr,'push');later(()=>c.remove(),800)})},300);}},
 {c:4,f:'جزئیات شعبه',t:'همه‌چیز <em>پیش از رفتن</em>',p:'آدرس، تلفن، ساعت کاری و وزن‌های موجود کارت در یک نگاه.',d:4600,run(){mode('app');show(sBr,'cut');finger(0);
   pressRegion(sBr,'branches',192,296,110,30,10,300,()=>show(sDet,'sheet'));}},

 {c:5,f:'پایان',d:4600,run(){mode('close');finger(0);$('#tag').innerHTML='یک اتصال، <span>سه سرویس</span>';$('#sub').textContent='خرید، فروش و تحویل فیزیکی برای کاربران دیجی‌کالا';
   ['#tag','#sub'].forEach((s,i)=>A($(s),[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:800,delay:400+i*220,fill:'backwards'}));}},
];

/* ---------- player ---------- */
const prog=$('#prog');
prog.innerHTML=CH.map((c,i)=>{const d=S.filter(s=>s.c===i).reduce((a,s)=>a+s.d,0);return `<button class="seg" data-c="${i}" style="flex-grow:${d}" aria-label="${c.t}"><div class="tr"><i></i></div><span>${c.t}</span></button>`}).join('');
prog.querySelectorAll('.seg').forEach(b=>b.onclick=()=>go(S.findIndex(s=>s.c===+b.dataset.c)));
$('#fgrid').innerHTML=CH.map((c,i)=>`<div class="fcol"><h3>${c.t} <small>${c.n}</small></h3>${S.map((s,j)=>s.c===i?`<button class="fbtn" data-j="${j}"><b>${fa(j+1)}</b>${s.f}</button>`:'').join('')}</div>`).join('');
document.querySelectorAll('.fbtn').forEach(b=>b.onclick=()=>{go(+b.dataset.j);$('#stage').scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})});
const total=S.reduce((a,s)=>a+s.d,0);
let idx=0,playing=true,t0=0,elapsed=0,adv=null,lastCap='';
function setCap(s){const c=CH[s.c];$('#capN').textContent=c.n;$('#capC').textContent=c.t;
  if(location.hash==='#render'){lastCap=s.t||'';return;}
  if(s.t&&s.t!==lastCap){lastCap=s.t;const tx=$('#capTxt');
    const swap=()=>{$('#capT').innerHTML=s.t;$('#capD').textContent=s.p;A(tx,[{opacity:0,transform:'translateY(14px)',filter:'blur(4px)'},{opacity:1,transform:'none',filter:'blur(0)'}],{duration:700,fill:'none'})};
    if(reduce||!$('#capT').innerHTML)swap();else A(tx,[{opacity:1},{opacity:0,transform:'translateY(-10px)'}],{duration:260,easing:EIN,fill:'none'}).onfinish=swap}}
function go(i){clearT();clearTimeout(adv);idx=(i+S.length)%S.length;const s=S[idx];setCap(s);s.run();elapsed=0;t0=performance.now();
  document.querySelectorAll('.fbtn').forEach(b=>b.classList.toggle('cur',+b.dataset.j===idx));
  if(playing)adv=setTimeout(()=>go(idx+1),s.d)}
function setPlay(p){playing=p;$('#bPlay').setAttribute('aria-label',p?'توقف':'پخش');
  $('#playIc').innerHTML=p?'<path d="M8 5v14M16 5v14"/>':'<path d="M17 12 8 5.5v13z"/>';
  document.getAnimations().forEach(a=>p?a.play():a.pause());
  if(p){t0=performance.now()-elapsed;adv=setTimeout(()=>go(idx+1),Math.max(0,S[idx].d-elapsed))}else{elapsed=performance.now()-t0;clearTimeout(adv)}}
$('#bPlay').onclick=()=>setPlay(!playing);$('#cNext').onclick=()=>go(idx+1);$('#bPrev').onclick=()=>go(idx-1);
addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();setPlay(!playing)}else if(e.key==='ArrowLeft')go(idx+1);else if(e.key==='ArrowRight')go(idx-1)});
function tick(){const e=playing?performance.now()-t0:elapsed,frac=Math.min(1,e/S[idx].d);let before=0;const segs=prog.querySelectorAll('.seg');
  CH.forEach((c,i)=>{const st=S.map((s,j)=>[s,j]).filter(([s])=>s.c===i),tot=st.reduce((a,[s])=>a+s.d,0);let dn=0;
    st.forEach(([s,j])=>{if(j<idx){dn+=s.d;before+=s.d}else if(j===idx)dn+=s.d*frac});
    segs[i].querySelector('i').style.width=(dn/tot*100)+'%';segs[i].classList.toggle('cur',S[idx].c===i)});
  const sec=Math.floor((before+S[idx].d*frac)/1000),ts=Math.round(total/1000);
  $('#time').textContent=fa(`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')} / ${Math.floor(ts/60)}:${String(ts%60).padStart(2,'0')}`);requestAnimationFrame(tick)}

let placementScene=null,placementMode='desktop';
function layoutTargets(){return {copy:$('.m-open,.m-close')?$('.opener-copy'):$('#capTxt'),media:$('.m-open,.m-close')?null:$('.dev')}}
function placeLegacy(boxes={}){
 for(const [kind,el] of Object.entries(layoutTargets())){if(!el)continue;const box=boxes[kind];el.classList.toggle('studio-positioned',!!box);
  for(const key of ['x','y','w','h'])if(box)el.style.setProperty('--place-'+key,box[key]+'%');else el.style.removeProperty('--place-'+key);
 }
 fit();
}
function renderLegacyText(c){
 const isIntro=$('#stage').classList.contains('m-open')||$('#stage').classList.contains('m-close');
 renderTitle($('#capT'),{...c,titleFormat:{fontSize:c.fontSize,...c.titleFormat}});
 renderTitle($('#tag'),{...c,titleFormat:{fontSize:c.fontSize+14,...c.titleFormat}});
 renderDescription($('#stage'),isIntro?$('#sub'):$('#capD'),c,placementMode,true);
 // Only the active caption owns free text boxes. The hidden caption stays plain.
 if(isIntro)$('#capD').textContent=c.description;else $('#sub').textContent=c.description;
}
function reportLayout(){
 if(!placementScene)return;
 const boxes={};const c=$('#stage').getBoundingClientRect();
 for(const [kind,el] of Object.entries(layoutTargets())){if(!el)continue;const r=el.getBoundingClientRect();boxes[kind]={x:(r.left-c.left)/c.width*100,y:(r.top-c.top)/c.height*100,w:r.width/c.width*100,h:r.height/c.height*100}}
 $('#stage').querySelectorAll('[data-text-block]').forEach(el=>{const r=el.getBoundingClientRect();boxes['text:'+el.dataset.textBlock]={x:(r.left-c.left)/c.width*100,y:(r.top-c.top)/c.height*100,w:r.width/c.width*100,h:r.height/c.height*100}});
 parent.postMessage({type:'talacard-layout',sceneId:placementScene.id,boxes},location.origin);
}
// The studio owns time. In #render mode delayed actions and animations advance
// together, so pause freezes the full scene, including simulated taps.
window.addEventListener('message',e=>{
 if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='talacard')return;
 const m=e.data;
 if(m.action==='load'){
  playing=false;const target=Math.max(0,Math.min(S.length-1,Number(m.index)||0));
  const c=m.scene;placementScene=c;placementMode=m.compact?'compact':'desktop';
  document.querySelectorAll('.studio-positioned').forEach(el=>el.classList.remove('studio-positioned'));
  const escaped=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const at=c.highlight?c.title.indexOf(c.highlight):-1;
  S[target].t=at>=0?escaped(c.title.slice(0,at))+'<em>'+escaped(c.highlight)+'</em>'+escaped(c.title.slice(at+c.highlight.length)):escaped(c.title);
  S[target].p=c.description;
  document.getAnimations().forEach(a=>a.cancel());go(target);
  $('#capC').textContent=c.chapter;
  $('#stage').style.background=c.background;$('#bgcanvas').style.opacity=c.presentationStyle==='reference'?'1':'0';$('.cap').style.background=c.presentationStyle==='reference'?'':'linear-gradient(to left,'+c.background+' 40%,transparent)';$('#stage').style.setProperty('--studio-accent',c.accent);$('#stage').style.setProperty('--ink-d',c.textColor);$('#capT').style.fontSize=c.fontSize+'px';$('#tag').style.fontSize=(c.fontSize+14)+'px';$('#stage').style.setProperty('--gold-d',c.accent);$('#capD').style.color=c.textColor;
  $('#capN').textContent=fa(m.number||1);$('#capTxt').getAnimations().forEach(a=>a.cancel());$('#capTxt').style.opacity=1;
  renderLegacyText(c);
  if(m.preview){for(let pass=0;pass<3;pass++)document.getAnimations().forEach(a=>{try{a.finish()}catch{}})}
  placeLegacy(c.placement?.[placementMode]);reportLayout();
  parent.postMessage({type:'talacard-loaded',sceneId:c.id,request:m.request},location.origin);
 }else if(m.action==='text'){placementScene=m.scene;renderLegacyText(placementScene);reportLayout();}
 else if(m.action==='placement'){placementScene.placement||={};placementScene.placement[placementMode]=m.placement;placeLegacy(m.placement);reportLayout();}
 else if(m.action==='advance'&&typeof window.__advance==='function')window.__advance(Math.max(0,Math.min(250,m.delta||0)));
});

/* background: slow guilloche drift */
const cv=$('#bgcanvas'),cx=cv.getContext('2d');let ph=0;
function bg(){const r=cv.getBoundingClientRect();cv.width=Math.max(10,r.width);cv.height=Math.max(10,r.height)}
function drawBg(){const W=cv.width,H=cv.height;cx.clearRect(0,0,W,H);cx.lineWidth=1;
 for(let k=0;k<34;k++){cx.strokeStyle=`rgba(231,197,105,${.16+.16*Math.sin(k/34*Math.PI)})`;cx.beginPath();for(let x=0;x<=W;x+=8){const y=H*(.55+.3*Math.sin(x/W*Math.PI*1.5+.6+ph))+(k-17)*H*.011;x?cx.lineTo(x,y):cx.moveTo(x,y)}cx.stroke()}
 if(!reduce&&(playing||location.hash==='#render'))ph+=.0032;setTimeout(()=>requestAnimationFrame(drawBg),40)}
function fit(){const d=$('.dev').getBoundingClientRect();const s=Math.max(.42,Math.min(1,(d.height-110)/886,(d.width-24)/450));
  $('#phone').style.transform=`scale(${s})`;$('#ph').style.width=395*s+'px';$('#ph').style.height=886*s+'px';$('#ph').style.marginBottom='70px';bg()}
addEventListener('resize',()=>{fit();if(placementScene){placementMode=innerWidth<=760?'compact':'desktop';placeLegacy(placementScene.placement?.[placementMode]);reportLayout()}});
window.__total=total;
const start=()=>{fit();drawBg();go(0);requestAnimationFrame(tick);window.__ready=true;parent.postMessage({type:"talacard-ready"},location.origin)};
Promise.all([...DECODED,document.fonts?document.fonts.ready:0]).then(start);
})();
