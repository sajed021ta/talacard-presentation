import {validateProject,chapters,timeLabel} from './model.js';
const $=s=>document.querySelector(s);
const fa=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
let project,deckId,index=0,playing=false,elapsed=0,previousFrame=0,frame,iframeReady=false,sceneSignature='',stageAnimations=[],legacyRequest=0,toastTimer;
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
  $('#flow-description').textContent = deck().flowDescription;
  $('#flow-count').textContent = `${fa(deck().scenes.length)} صفحه · ${fa(timeLabel(deck().scenes.reduce((n, s) => n + s.duration, 0)))}`;
  $('#flow-grid').replaceChildren(); $('#chapter-progress').replaceChildren();
  for (const chapter of chapters(deck())) {
    const section = document.createElement('div'); section.className = 'flow-section'; const h = document.createElement('h3'); h.textContent = chapter; section.append(h);
    const segment = document.createElement('button'); segment.className = 'chapter-segment'; segment.title = chapter; segment.setAttribute('aria-label', `رفتن به ${chapter}`);
    const meter = document.createElement('span'); meter.append(document.createElement('i')); const label = document.createElement('strong'); label.textContent = chapter; segment.append(meter, label);
    const scenes = deck().scenes.map((s, i) => [s, i]).filter(([s]) => s.chapter === chapter);
    segment.style.flex = String(scenes.reduce((n, [s]) => n + s.duration, 0)); segment.onclick = () => choose(scenes[0][1]); segment.dataset.chapter = chapter;
    $('#chapter-progress').append(segment);
    for (const [s, i] of scenes) { const b = document.createElement('button'); b.classList.toggle('current', i === index); b.dataset.scene = i; const number = document.createElement('b'); number.textContent = fa(i + 1); b.append(number, document.createTextNode(s.label)); section.append(b); }
    $('#flow-grid').append(section);
  }
  updateProgress();
}
function titleInto(el, s) {
  el.textContent = s.title;
  if (!s.highlight) return;
  const at = s.title.indexOf(s.highlight); if (at < 0) return;
  const text = el.firstChild, range = document.createRange(); range.setStart(text, at); range.setEnd(text, at + s.highlight.length); const em = document.createElement('em'); range.surroundContents(em);
}
function sendLegacy(action, extra = {}) {
  if (iframeReady && frame?.contentWindow) frame.contentWindow.postMessage({ type:'talacard', action, ...extra }, location.origin);
}
function loadLegacy() {
  if(!frame)return;
  $('#stage').setAttribute('aria-busy','true');
  let cover=$('#scene-canvas .legacy-loading');
  if(!cover){cover=document.createElement('div');cover.className='legacy-loading';cover.setAttribute('role','status');cover.textContent='در حال آماده‌سازی صفحه…';$('#scene-canvas').append(cover)}
  sendLegacy('load', { index: scene().legacyScene, scene: scene(), number: index + 1, preview: !playing && elapsed === 0, request:++legacyRequest });
}
function renderStage(restart = false) {
  const s = scene(), canvas = $('#scene-canvas');
  const signature = `${s.id}|${s.layout}|${s.media}|${s.poster}`;
  canvas.style.setProperty('--scene-bg', s.background); canvas.style.setProperty('--scene-ink', s.textColor); canvas.style.setProperty('--scene-accent', s.accent); canvas.style.setProperty('--scene-size', s.fontSize + 'px'); canvas.style.setProperty('--media-fit', s.fit); canvas.style.setProperty('--media-position', s.position + '%');
  if (s.layout === 'legacy') {
    if (!frame || !frame.isConnected) {
      iframeReady = false; canvas.replaceChildren(); frame = document.createElement('iframe'); frame.title = 'نمایش فلو اصلی اپ طلاکارت'; frame.src = '/legacy/index.html#render'; canvas.append(frame);loadLegacy();
    } else loadLegacy();
    sceneSignature = signature; resizeStage(); return;
  }
  if (sceneSignature !== signature || frame) {
    canvas.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
    frame = null; iframeReady = false; stageAnimations.forEach(a => a.cancel()); stageAnimations = [];
    const content = document.createElement('div'); content.className = `scene-content ${s.layout}`;
    const copy = document.createElement('div'); copy.className = 'scene-copy'; const chapter = document.createElement('div'); chapter.className = 'scene-chapter'; chapter.append(document.createElement('b'), document.createElement('span')); copy.append(chapter, document.createElement('h2'), document.createElement('p')); content.append(copy);
    if (s.layout !== 'title') {
      const visual = document.createElement('div'); visual.className = 'scene-media';
      if (s.media) {
        const isVideo = /\.(mp4|webm)$/i.test(s.media); const media = document.createElement(isVideo ? 'video' : 'img');
        if (isVideo) { media.muted = true; media.playsInline = true; media.preload = 'metadata'; if (s.poster) media.poster = s.poster; media.addEventListener('loadeddata', () => { if (playing) playVideo(media); }); }
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
  titleInto(content.querySelector('h2'), s); content.querySelector('p').textContent = s.description; content.querySelector('.scene-chapter b').textContent = fa(index + 1); content.querySelector('.scene-chapter span').textContent = s.chapter;
  const v = content.querySelector('video'); if (v) { v.loop = s.loop; if (playing) playVideo(v); }
  if (restart) animateStage(); resizeStage();
}
function animateStage() {
  stageAnimations.forEach(a => a.cancel()); stageAnimations = [];
  const s = scene(), content = $('#scene-canvas .scene-content'); if (!content || reduce || s.transition === 'none') return;
  const distance = 20 + 35 * s.intensity;
  const first = s.transition === 'slide' ? { opacity:.4, transform:`translateX(${-distance}px)` } : s.transition === 'reveal' ? { opacity:.35, clipPath:'inset(12% 0 0 0)', filter:'blur(5px)', transform:`translateY(${distance}px)` } : { opacity:.35, transform:'translateY(15px)' };
  const a = content.animate([first, { opacity:1, transform:'none', filter:'blur(0px)', clipPath:'inset(0)' }], { duration:850 + s.intensity * 500, easing:'cubic-bezier(.22,1,.36,1)', fill:'both' }); a.pause(); a.currentTime = !playing && elapsed===0 ? a.effect.getComputedTiming().endTime : elapsed * 1000; stageAnimations.push(a);
  const media = content.querySelector('.scene-media'); if (media && s.intensity > 0) { const drift = media.animate([{ transform:'scale(1)' }, { transform:`scale(${1 + .025 * s.intensity})` }], { duration:s.duration * 1000, fill:'both' }); drift.pause(); drift.currentTime = elapsed * 1000; stageAnimations.push(drift); }
}
function resizeStage() {
  const stage = $('#stage'), canvas = $('#scene-canvas'); if (!stage || !project) return;
  const compact = document.documentElement.clientWidth <= 760; const w = compact ? 700 : 1240, h = compact ? 1000 : 820;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; canvas.classList.toggle('compact', compact);
  const fullscreen = document.fullscreenElement === stage;
  const scale = fullscreen ? Math.min(stage.clientWidth / w, stage.clientHeight / h) : stage.clientWidth / w;
  canvas.style.transform = `scale(${scale})`;
}
new ResizeObserver(resizeStage).observe($('#stage'));
window.addEventListener('resize', resizeStage);
window.addEventListener('message', e => {
  if (e.origin !== location.origin || e.source !== frame?.contentWindow) return;
  if (e.data?.type === 'talacard-ready') { iframeReady = true; loadLegacy(); if (elapsed) advanceLegacyTo(elapsed); }
  if(e.data?.type==='talacard-loaded'&&e.data.request===legacyRequest){$('#scene-canvas .legacy-loading')?.remove();$('#stage').setAttribute('aria-busy','false');$('#stage').dataset.renderedScene=e.data.sceneId}
});

function playVideo(v) { v.play().catch(() => { if (playing) { setPlaying(false); toast('مرورگر پخش خودکار را متوقف کرد؛ دوباره دکمهٔ پخش را بزن.'); } }); }
function setPlaying(value) {
  if(value && !playing && elapsed===0){if(frame){playing=true;loadLegacy()}else stageAnimations.forEach(a=>a.currentTime=0)}
  playing = value; previousFrame = performance.now(); $('#play').innerHTML = icon(value ? 'pause' : 'play'); $('#play').setAttribute('aria-label', value ? 'توقف' : 'پخش');
  $('#scene-canvas').querySelectorAll('video').forEach(v => value ? playVideo(v) : v.pause());
}
function choose(i, keepPlaying = playing) {
  if (!project) return;
  index = (i + deck().scenes.length) % deck().scenes.length; elapsed = 0;
  renderFlow(); renderStage(true); setPlaying(keepPlaying); updateProgress();
}
function advanceLegacyTo(seconds) { let remaining = seconds * 1000; while (remaining > 0) { const step = Math.min(100, remaining); sendLegacy('advance', { delta:step }); remaining -= step; } }
function seek(seconds) {
  const wasPlaying = playing; setPlaying(false); elapsed = Math.max(0, Math.min(scene().duration, seconds));
  if (frame) { loadLegacy(); advanceLegacyTo(elapsed); }
  for (const a of stageAnimations) a.currentTime = elapsed * 1000;
  const v = $('#scene-canvas video'); if (v) { const t = Number.isFinite(v.duration) && v.duration > 0 ? (v.loop ? elapsed % v.duration : Math.min(elapsed, v.duration)) : elapsed; try { v.currentTime = t; } catch {} }
  updateProgress(); setPlaying(wasPlaying);
}
function updateProgress() {
  if (!project) return;
  const list = deck().scenes, before = list.slice(0, index).reduce((n, s) => n + s.duration, 0), total = list.reduce((n, s) => n + s.duration, 0);
  $('#clock').textContent = fa(`${timeLabel(before + elapsed)} / ${timeLabel(total)}`); $('#scene-clock').textContent = fa(`${timeLabel(elapsed)} / ${timeLabel(scene().duration)}`); $('#seek').value = String(Math.min(1000, elapsed / scene().duration * 1000));
  for (const segment of $('#chapter-progress').children) {
    const ch = segment.dataset.chapter; let completed = 0, amount = 0;
    list.forEach((s, i) => { if (s.chapter === ch) { amount += s.duration; if (i < index) completed += s.duration; else if (i === index) completed += elapsed; } });
    segment.querySelector('i').style.width = (completed / amount * 100) + '%'; segment.classList.toggle('current', ch === scene().chapter);
  }
}
function tick(now) {
  const dt = Math.min(.1, Math.max(0, (now - previousFrame) / 1000)); previousFrame = now;
  if (project && playing && (!frame || iframeReady)) {
    elapsed += dt; sendLegacy('advance', { delta:dt * 1000 }); stageAnimations.forEach(a => { a.currentTime = elapsed * 1000; });
    if (elapsed >= scene().duration) {
      if (index === deck().scenes.length - 1) { elapsed = scene().duration; setPlaying(false); } else choose(index + 1, true);
    }
    updateProgress();
  }
  requestAnimationFrame(tick);
}


for(const [id,name] of Object.entries({prev:'prev',next:'next',play:'play',fullscreen:'fullscreen'}))$('#'+id).innerHTML=icon(name);
$('#prev').onclick=()=>choose(index-1);$('#next').onclick=()=>choose(index+1);
$('#restart').onclick=()=>seek(0);
$('#play').onclick=()=>{if(!playing&&elapsed>=scene().duration)seek(0);setPlaying(!playing)};
$('#seek').oninput=()=>seek(Number($('#seek').value)/1000*scene().duration);
$('#flow-grid').onclick=e=>{const b=e.target.closest('[data-scene]');if(b)choose(Number(b.dataset.scene),false)};
$('#deck-select').onchange=()=>{deckId=$('#deck-select').value;const url=new URL(location.href);url.searchParams.set('deck',deckId);history.replaceState(null,'',url);renderDecks();choose(0,false)};
$('#fullscreen').onclick=async()=>{try{await $('#stage').requestFullscreen();resizeStage();toast('فاصله: پخش/توقف · کلیدهای جهت: صفحهٔ بعد/قبل · Esc: خروج')}catch{toast('نمایش تمام‌صفحه در این مرورگر فعال نیست.')}};
document.addEventListener('fullscreenchange',resizeStage);
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false)});
document.addEventListener('keydown',e=>{if(!project||e.target.closest('input,select,button,a'))return;if(e.code==='Space'){e.preventDefault();$('#play').click()}else if(e.key==='ArrowLeft'){e.preventDefault();choose(index+1)}else if(e.key==='ArrowRight'){e.preventDefault();choose(index-1)}});
try{const r=await fetch('/default-content.json');if(!r.ok)throw new Error();project=validateProject(await r.json());const requested=new URL(location.href).searchParams.get('deck');deckId=project.decks.some(d=>d.id===requested)?requested:project.activeDeck;renderDecks();choose(0,false);previousFrame=performance.now();requestAnimationFrame(tick)}catch{$('#scene-canvas').textContent='بارگذاری ارائه انجام نشد؛ صفحه را دوباره باز کنید.'}
