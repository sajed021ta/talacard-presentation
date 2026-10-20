import {mountHomePicker} from './home.js';
import {renderMediaItems,mediaItemBox,controlMediaItems,seekMediaItems} from './multimedia.js';
import {paintBackdrop} from './backdrop.js';
import {renderTitle,renderDescription,textBlocks,ensureTextBlocks,syncDescription} from './text.js';
import {applyMediaEffect,controlMediaEffect,seekMediaEffect,DEFAULT_EFFECT} from './effects.js';
import {renderNavigation} from './navigation.js';
import {applyPlacement, readPlacement, adjustBox, placementMode} from './placement.js';
import {validateProject,chapters,timeLabel} from './model.js';
const $=s=>document.querySelector(s);
const fa=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
let contentETag=null;
let project,deckId,index=0,playing=false,elapsed=0,previousFrame=0,frame,iframeReady=false,sceneSignature='',stageAnimations=[],legacyRequest=0,toastTimer;
let homePicker;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const deck=()=>project.decks.find(d=>d.id===deckId);
const scene=()=>deck().scenes[index];
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500)}
const icons = {
  play: '<path d="m9 5 11 7-11 7z"/>', pause: '<path d="M8 5v14M16 5v14"/>', next: '<path d="m15 5-7 7 7 7"/>', prev: '<path d="m9 5 7 7-7 7"/>', plus: '<path d="M12 5v14M5 12h14"/>', more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>', undo: '<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 7 7v3"/>', redo: '<path d="m16 4 5 5-5 5M21 9H11a7 7 0 0 0-7 7v3"/>', fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>', up: '<path d="m5 14 7-7 7 7"/>', down: '<path d="m5 10 7 7 7-7"/>', trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>', picture: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>', phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>', upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.picture}</svg>`;
function renderDecks() {
  $('#deck-select').replaceChildren(...project.decks.map(d => { const o = new Option(d.name, d.id); o.selected = d.id === deckId; return o; }));
  document.title = deck().name;
}
function renderFlow() {
  renderNavigation(deck(), index, choose);
  const toggle = $('#loop-video'), video = /\.(mp4|webm)$/i.test(scene().media);
  toggle.closest('label').hidden = !video;
  toggle.checked = scene().loop;
}
function titleInto(el,s){renderTitle(el,s)}
function sendLegacy(action, extra = {}) {
  if (iframeReady && frame?.contentWindow) frame.contentWindow.postMessage({ type:'talacard', action, ...extra }, location.origin);
}
function loadLegacy() {
  if(!frame)return;
  $('#stage').setAttribute('aria-busy','true');
  let cover=$('#scene-canvas .legacy-loading');
  if(!cover){cover=document.createElement('div');cover.className='legacy-loading';cover.setAttribute('role','status');cover.textContent='در حال آماده‌سازی صفحه…';$('#scene-canvas').append(cover)}
  sendLegacy('load', { index: scene().legacyScene, scene: scene(), number: index + 1, preview: !playing && elapsed === 0, compact:placementMode(canvasElement()) === 'compact', request:++legacyRequest });
}
function renderStage(restart = false) {
  const s = scene(), canvas = $('#scene-canvas');
  const signature = `${s.id}|${s.layout}|${s.media}|${s.poster}|${s.legacyDeck||"previous"}`;
  canvas.style.setProperty('--scene-bg', s.background); canvas.style.setProperty('--scene-ink', s.textColor); canvas.style.setProperty('--scene-accent', s.accent); canvas.style.setProperty('--scene-size', s.fontSize + 'px'); canvas.style.setProperty('--media-fit', s.fit); canvas.style.setProperty('--media-position', s.position + '%');
  if (s.layout === 'legacy') {
    const renderer=s.legacyDeck==='snapshot19'?'/legacy-2026-10-19/index.html#render':s.legacyDeck&&s.legacyDeck!=='previous'?'/legacy/index.html#render':'/legacy-previous/index.html#render';
    if (!frame || !frame.isConnected || frame.getAttribute('src')!==renderer) {
      iframeReady = false; canvas.replaceChildren(); frame = document.createElement('iframe'); frame.title = 'نمایش فلو اصلی اپ طلاکارت'; frame.src = renderer; canvas.append(frame);loadLegacy();
    } else loadLegacy();
    sceneSignature = signature; resizeStage(); return;
  }
  if (sceneSignature !== signature || frame) {
    canvas.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
    frame = null; iframeReady = false; stageAnimations.forEach(a => a.cancel()); stageAnimations = [];
    const content = document.createElement('div'); content.className = `scene-content ${s.layout}`;
    const copy = document.createElement('div'); copy.className = 'scene-copy'; const chapter = document.createElement('div'); chapter.className = 'scene-chapter'; chapter.append(document.createElement('b'), document.createElement('span')); const description=document.createElement('div');description.className='scene-description';copy.append(chapter, document.createElement('h2'), description); content.append(copy);
    if (s.layout !== 'title') {
      const visual = document.createElement('div'); visual.className = 'scene-media';
      if (s.media) {
        const isVideo = /\.(mp4|webm)$/i.test(s.media); const media = document.createElement(isVideo ? 'video' : 'img');
        if (isVideo) { media.autoplay = true; media.controls = false; media.muted = true; media.playsInline = true; media.preload = 'metadata'; if (s.poster) media.poster = s.poster; media.addEventListener('loadeddata', () => { if (playing) playVideo(media); }); }
        else media.alt = s.label;
        media.src = s.media;
        media.addEventListener('error', () => { const message = document.createElement('div'); message.className = 'media-error'; message.textContent = 'این رسانه باز نشد. در بخش رسانه، فایل را دوباره انتخاب کنید.'; visual.append(message); }, { once:true });
        visual.append(media);
      } else { const empty = document.createElement('div'); empty.className = 'empty-media'; empty.innerHTML = icon('picture'); empty.append(document.createTextNode('برای این صفحه، عکس یا فیلم انتخاب کن.')); visual.append(empty); }
      content.append(visual);
    }
    canvas.replaceChildren(content); sceneSignature = signature; restart = true;
  }
  $('#stage').setAttribute('aria-busy','false');$('#stage').dataset.renderedScene=s.id;
  const content = canvas.querySelector('.scene-content');
  titleInto(content.querySelector('h2'), s); renderDescription(content,content.querySelector('.scene-description'),s,placementMode(canvas)); content.querySelector('.scene-chapter b').textContent = fa(index + 1); content.querySelector('.scene-chapter span').textContent = s.chapter;
  const v = content.querySelector('video'); if (v) { v.loop = s.loop; if (playing) playVideo(v); }
  if (restart) animateStage(); resizeStage(); applyPlacement(canvas, s); applyMediaEffect(canvas,s,{playing,restart,reduce});
}
function animateStage() {
  stageAnimations.forEach(a => a.cancel()); stageAnimations = [];
  const s = scene(), content = $('#scene-canvas .scene-content'); if (!content || reduce || s.transition === 'none') return;
  const distance = 20 + 35 * s.intensity;
  const first = s.transition === 'slide' ? { opacity:.4, transform:`translateX(${-distance}px)` } : s.transition === 'reveal' ? { opacity:.35, clipPath:'inset(12% 0 0 0)', filter:'blur(5px)', transform:`translateY(${distance}px)` } : { opacity:.35, transform:'translateY(15px)' };
  const a = content.animate([first, { opacity:1, transform:'none', filter:'blur(0px)', clipPath:'inset(0)' }], { duration:850 + s.intensity * 500, easing:'cubic-bezier(.22,1,.36,1)', fill:'both' }); a.pause(); a.currentTime = !playing && elapsed===0 ? a.effect.getComputedTiming().endTime : elapsed * 1000; stageAnimations.push(a);
  const media = content.querySelector('.scene-media'); if (media && s.intensity > 0 && !s.mediaEffect) { const drift = media.animate([{ transform:'scale(1)' }, { transform:`scale(${1 + .025 * s.intensity})` }], { duration:s.duration * 1000, fill:'both' }); drift.pause(); drift.currentTime = elapsed * 1000; stageAnimations.push(drift); }
}
function resizeStage() {
  const stage = $('#stage'), canvas = $('#scene-canvas'); if (!stage || !project) return;
  const compact = document.documentElement.clientWidth <= 760; const w = compact ? 700 : 1240, h = compact ? 1000 : 820;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; canvas.classList.toggle('compact', compact);
  const fullscreen = document.fullscreenElement === stage;
  const scale = Math.min(stage.clientWidth / w, stage.clientHeight / h);
  canvas.style.left = (stage.clientWidth - w * scale) / 2 + 'px';
  canvas.style.top = (stage.clientHeight - h * scale) / 2 + 'px';
  canvas.style.translate = 'none'; canvas.style.transformOrigin = '0 0';
  canvas.style.transform = `scale(${scale})`;
  canvas.style.setProperty('--handle-factor', String(1/scale));
  applyPlacement(canvas,scene());paintBackdrop(canvas,scene(),elapsed,reduce);renderMediaItems(canvas,scene(),{playing,reduce});
  const content=canvas.querySelector('.scene-content');if(content)renderDescription(content,content.querySelector('.scene-description'),scene(),placementMode(canvas));
}
new ResizeObserver(resizeStage).observe($('#stage'));
window.addEventListener('resize', resizeStage);
window.addEventListener('message', e => {
  if (e.origin !== location.origin || e.source !== frame?.contentWindow) return;
  if (e.data?.type === 'talacard-ready') { iframeReady = true; loadLegacy(); if (elapsed) advanceLegacyTo(elapsed); }
  if(e.data?.type==='talacard-loaded'&&e.data.request===legacyRequest){$('#scene-canvas .legacy-loading')?.remove();$('#stage').setAttribute('aria-busy','false');$('#stage').dataset.renderedScene=e.data.sceneId}
});

function playVideo(v) { v.play().catch(error => { if (error.name !== 'AbortError' && v.isConnected && playing) { setPlaying(false); toast('مرورگر پخش خودکار را متوقف کرد؛ دوباره دکمهٔ پخش را بزن.'); } }); }
function setPlaying(value) {
  if(value && !playing && elapsed===0){if(frame){playing=true;loadLegacy()}else stageAnimations.forEach(a=>a.currentTime=0)}
  controlMediaEffect($('#scene-canvas'),value);controlMediaItems($('#scene-canvas'),value);
  playing = value; previousFrame = performance.now(); $('#play').innerHTML = icon(value ? 'pause' : 'play'); $('#play').setAttribute('aria-label', value ? 'توقف' : 'پخش');
  $('#scene-canvas').querySelectorAll('video').forEach(v => value ? playVideo(v) : v.pause());
}
function choose(i, keepPlaying = true) {
  if (!project) return;
  index = (i + deck().scenes.length) % deck().scenes.length; elapsed = 0;
  renderFlow(); renderStage(true); setPlaying(true); updateProgress();
}
function advanceLegacyTo(seconds) { let remaining = seconds * 1000; while (remaining > 0) { const step = Math.min(100, remaining); sendLegacy('advance', { delta:step }); remaining -= step; } }
function seek(seconds) {
  const wasPlaying = playing; setPlaying(false); elapsed = Math.max(0, Math.min(scene().duration, seconds));
  if (frame) { loadLegacy(); advanceLegacyTo(elapsed); }
  seekMediaEffect($('#scene-canvas'),elapsed);seekMediaItems($('#scene-canvas'),elapsed);
  for (const a of stageAnimations) a.currentTime = elapsed * 1000;
  for(const v of $('#scene-canvas').querySelectorAll('video')) { const t = Number.isFinite(v.duration) && v.duration > 0 ? (v.loop ? elapsed % v.duration : Math.min(elapsed, v.duration)) : elapsed; try { v.currentTime = t; } catch {} }
  updateProgress(); setPlaying(wasPlaying);
}
function updateProgress() {
  if (!project) return;
  $('#page-location').textContent = `صفحهٔ ${fa(index + 1)} از ${fa(deck().scenes.length)}`;
}
function tick(now) {
  const dt = Math.min(.1, Math.max(0, (now - previousFrame) / 1000)); previousFrame = now;
  if (project && playing && (!frame || iframeReady)) {
    const advance = dt;
    elapsed += dt; sendLegacy('advance', { delta:advance * 1000 }); stageAnimations.forEach(a => { a.currentTime = elapsed * 1000; });

    paintBackdrop($('#scene-canvas'),scene(),elapsed,reduce);updateProgress();
  }
  requestAnimationFrame(tick);
}


for(const [id,name] of Object.entries({prev:'prev',next:'next',play:'play',fullscreen:'fullscreen'}))$('#'+id).innerHTML=icon(name);
$('#prev').onclick=()=>choose(index-1);$('#next').onclick=()=>choose(index+1);
$('#restart').onclick=()=>{seek(0);setPlaying(true)};
$('#play').onclick=()=>{setPlaying(!playing)};
$('#deck-select').onchange=()=>{deckId=$('#deck-select').value;const url=new URL(location.href);url.searchParams.set('deck',deckId);history.replaceState(null,'',url);renderDecks();choose(0,false)};
$('#fullscreen').onclick=async()=>{try{await $('#stage').requestFullscreen();resizeStage();toast('فاصله: پخش/توقف · کلیدهای جهت: صفحهٔ بعد/قبل · Esc: خروج')}catch{toast('نمایش تمام‌صفحه در این مرورگر فعال نیست.')}};
document.addEventListener('fullscreenchange',resizeStage);
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false)});
document.addEventListener('keydown',e=>{if(!project||homePicker?.visible||e.target.closest('input,select,button,a'))return;if(e.code==='Space'){e.preventDefault();$('#play').click()}else if(e.key==='ArrowLeft'){e.preventDefault();choose(index+1)}else if(e.key==='ArrowRight'){e.preventDefault();choose(index-1)}});
try{const r=await fetch('/default-content.json',{cache:'no-store'});contentETag=r.headers.get('ETag');if(!r.ok)throw new Error();project=validateProject(await r.json());const requested=new URL(location.href).searchParams.get('deck');deckId=project.decks.some(d=>d.id===requested)?requested:project.activeDeck;renderDecks();choose(0,false);previousFrame=performance.now();requestAnimationFrame(tick);setupHome()}catch{$('#scene-canvas').textContent='بارگذاری ارائه انجام نشد؛ صفحه را دوباره باز کنید.'}

function canvasElement(){return $('#scene-canvas');}
$('#loop-video').onchange=()=>{ scene().loop=$('#loop-video').checked;const v=$('#scene-canvas video');if(v){v.loop=scene().loop;if(playing && v.ended){v.currentTime=0;playVideo(v)}}};

// Content updates are independent of application deployment. Preserve the current page.
let refreshing=false;
setInterval(async()=>{
 if(document.hidden||refreshing||!project)return;refreshing=true;
 try{
  const response=await fetch('/default-content.json',{cache:'no-store',headers:contentETag?{'If-None-Match':contentETag}:{}});
  if(response.status===304||!response.ok)return;
  const etag=response.headers.get('ETag');if(etag&&etag===contentETag)return;
  const next=validateProject(await response.json());
  if(!etag&&JSON.stringify(next)===JSON.stringify(project))return;
  const id=scene().id,before=JSON.stringify(scene());project=next;contentETag=etag;
  if(!project.decks.some(d=>d.id===deckId))deckId=project.activeDeck;
  index=Math.max(0,deck().scenes.findIndex(s=>s.id===id));renderDecks();renderFlow();
  if(JSON.stringify(scene())!==before)choose(index);else updateProgress();if(homePicker?.visible)setPlaying(false);
 }catch{}finally{refreshing=false}
},5000);

function setupHome(){
 homePicker=mountHomePicker(project,id=>{
  const url=new URL(location.href);url.searchParams.set('deck',id);if(url.hash==='#home')url.hash='';window.history.pushState(null,'',url);enterDeck(id);
 });
 function enterDeck(id){homePicker.hide();deckId=id;index=0;renderDecks();choose(0);resizeStage();requestAnimationFrame(()=>{$('#stage').tabIndex=-1;$('#stage').focus({preventScroll:true})})}
 function showHome(){setPlaying(false);homePicker.show();document.title='طلاکارت · انتخاب بخش ارائه'}
 $('#home-button').onclick=()=>{const url=new URL(location.href);url.searchParams.delete('deck');url.hash='home';window.history.pushState(null,'',url);showHome()};
 $('.brand').onclick=event=>{event.preventDefault();$('#home-button').click()};
 function routeFromLocation(){const requested=new URL(location.href).searchParams.get('deck');if(project.decks.some(d=>d.id===requested))enterDeck(requested);else if(location.hash==='#edit')enterDeck(project.activeDeck);else showHome()}
 addEventListener('popstate',routeFromLocation);addEventListener('hashchange',routeFromLocation);
 const requested=new URL(location.href).searchParams.get('deck');if(!project.decks.some(d=>d.id===requested)&&location.hash!=='#edit')showHome();
}
