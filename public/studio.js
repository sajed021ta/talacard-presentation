import {renderNavigation} from './navigation.js';
import {applyPlacement, readPlacement, adjustBox, placementMode} from './placement.js';
import { clone, validateProject, chapters, blankScene, timeLabel } from './model.js';

const $ = s => document.querySelector(s);
const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const icons = {
  play: '<path d="m9 5 11 7-11 7z"/>', pause: '<path d="M8 5v14M16 5v14"/>', next: '<path d="m15 5-7 7 7 7"/>', prev: '<path d="m9 5 7 7-7 7"/>', plus: '<path d="M12 5v14M5 12h14"/>', more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>', undo: '<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 7 7v3"/>', redo: '<path d="m16 4 5 5-5 5M21 9H11a7 7 0 0 0-7 7v3"/>', fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>', up: '<path d="m5 14 7-7 7 7"/>', down: '<path d="m5 10 7 7 7-7"/>', trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>', picture: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>', phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>', upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.picture}</svg>`;
for (const [id, name] of Object.entries({ undo:'undo', redo:'redo', more:'more', 'add-scene':'plus', prev:'prev', next:'next', play:'play', fullscreen:'fullscreen', 'move-up':'up', 'move-down':'down', delete:'trash', 'close-help':'close' })) $('#' + id).innerHTML = icon(name);

let project, savedJSON = '', revision = '', backend = true, deckId, index = 0, tab = 'content';
let playing = false, elapsed = 0, previousFrame = 0, frame, iframeReady = false, sceneSignature = '', stageAnimations = [], saving = false, toastTimer, draftTimer;
let autoSaveTimer, autoSaveBlocked=false, localSaveError=false, syncState={status:'pending'}, syncPoll;
const history = [], future = [];
let legacyRequest = 0;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const deck = () => project.decks.find(d => d.id === deckId);
const scene = () => deck().scenes[index];
const dirty = () => JSON.stringify(project) !== savedJSON;
const escapeText = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);

function toast(message, error = false) {
  const el = $('#toast'); el.textContent = message; el.classList.toggle('error', error); el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, error ? 10000 : 5500);
}
function updateStatus() {
  const status = $('#save-status');
  status.textContent = saving ? 'در حال ذخیره…' : autoSaveBlocked ? 'تداخل ذخیره؛ فایل پروژه را دریافت کن' : dirty() ? localSaveError ? 'ذخیره نشد؛ تلاش دوباره…' : 'در انتظار ذخیرهٔ خودکار…' : backend ? 'ذخیره شد روی دستگاه' : 'ذخیره شد در مرورگر';
  const cloud=$('#cloud-status');if(cloud){const current=syncState.status;cloud.textContent=!backend?'نسخهٔ آفلاین':current==='published'&&syncState.revision===revision&&!dirty()?'همگام با لینک عمومی':current==='syncing'?'در حال ارسال به سایت…':current==='conflict'?'تداخل نسخهٔ آنلاین':current==='retrying'?'ذخیره شد؛ تلاش دوباره برای سایت':current==='disabled'?'اتصال سایت فعال نیست':'در انتظار همگام‌سازی';cloud.title=syncState.error||'ذخیره و انتشار خودکار فعال است';cloud.dataset.state=current;}
  status.classList.toggle('unsaved', dirty()); $('#save').disabled = saving;
  $('#undo').disabled = !history.length; $('#redo').disabled = !future.length;
}
function checkpoint() { history.push(clone(project)); if (history.length > 60) history.shift(); future.length = 0; }
function draft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    try { if (dirty()) localStorage.setItem('talacard-draft-v1', JSON.stringify({ revision, project })); else localStorage.removeItem('talacard-draft-v1'); }
    catch { toast('فضای مرورگر برای نسخهٔ پشتیبان کافی نیست؛ پروژه را ذخیره کنید.', true); }
  }, 300);
}
function scheduleAutoSave(){clearTimeout(autoSaveTimer);if(project&&dirty()&&!autoSaveBlocked)autoSaveTimer=setTimeout(()=>save({automatic:true}),900)}
function changed() { updateStatus(); draft(); scheduleAutoSave(); }
async function readSyncStatus(){if(!backend)return;try{const r=await fetch('/api/sync',{cache:'no-store'});if(r.ok){syncState=await r.json();updateStatus()}}catch{}}

function editMode(value) {
  document.body.classList.toggle('editing', value); $('#toggle-edit').textContent = value ? 'نمایش ارائه' : 'ویرایش صفحه‌ها';
  const hash = value ? '#edit' : ''; if (location.hash !== hash) window.history.replaceState(null, '', location.pathname + location.search + hash);
  animateStage(); resizeStage(); renderHandles();
}

function renderDecks() {
  $('#deck-select').replaceChildren(...project.decks.map(d => { const o = new Option(d.name, d.id); o.selected = d.id === deckId; return o; }));
  document.title = deck().name;
}
function renderList() {
  $('#page-count').textContent = fa(deck().scenes.length);
  $('#scene-heading').textContent = `${fa(index + 1)} از ${fa(deck().scenes.length)} · ${scene().label}`;
  $('#editing-number').textContent = `صفحهٔ ${fa(index + 1)}`;
  $('#move-up').disabled = index === 0; $('#move-down').disabled = index === deck().scenes.length - 1; $('#delete').disabled = deck().scenes.length === 1;
}
function renderFlow() {
  renderNavigation(deck(), index, choose);
  const toggle = $('#loop-video'), video = /\.(mp4|webm)$/i.test(scene().media);
  toggle.closest('label').hidden = !video;
  toggle.checked = scene().loop;
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
  sendLegacy('load', { index: scene().legacyScene, scene: scene(), number: index + 1, preview: !playing && elapsed === 0, compact:placementMode(canvasElement()) === 'compact', request:++legacyRequest });
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
  titleInto(content.querySelector('h2'), s); content.querySelector('p').textContent = s.description; content.querySelector('.scene-chapter b').textContent = fa(index + 1); content.querySelector('.scene-chapter span').textContent = s.chapter;
  const v = content.querySelector('video'); if (v) { v.loop = s.loop; if (playing) playVideo(v); }
  if (restart) animateStage(); resizeStage(); applyPlacement(canvas, s); renderHandles();
}
function animateStage() {
  stageAnimations.forEach(a => a.cancel()); stageAnimations = [];
  const s = scene(), content = $('#scene-canvas .scene-content'); if (!content || reduce || document.body.classList.contains('editing') || s.transition === 'none') return;
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
  canvas.style.setProperty('--handle-factor', String(1/scale));
  applyPlacement(canvas,scene());
  renderHandles();
}
new ResizeObserver(resizeStage).observe($('#stage'));
window.addEventListener('resize', resizeStage);
window.addEventListener('message', e => {
  if (e.origin !== location.origin || e.source !== frame?.contentWindow) return;
  if (e.data?.type === 'talacard-ready') { iframeReady = true; loadLegacy(); if (elapsed) advanceLegacyTo(elapsed); }
  if(e.data?.type==='talacard-layout' && e.data.sceneId===scene().id){legacyBoxes=e.data.boxes;renderHandles();}
  if(e.data?.type==='talacard-loaded'&&e.data.request===legacyRequest){$('#scene-canvas .legacy-loading')?.remove();$('#stage').setAttribute('aria-busy','false');$('#stage').dataset.renderedScene=e.data.sceneId}
});

function playVideo(v) { v.play().catch(error => { if (error.name !== 'AbortError' && v.isConnected && playing) { setPlaying(false); toast('مرورگر پخش خودکار را متوقف کرد؛ دوباره دکمهٔ پخش را بزن.'); } }); }
function setPlaying(value) {
  if(value && !playing && elapsed===0){if(frame){playing=true;loadLegacy()}else stageAnimations.forEach(a=>a.currentTime=0)}
  playing = value; previousFrame = performance.now(); $('#play').innerHTML = icon(value ? 'pause' : 'play'); $('#play').setAttribute('aria-label', value ? 'توقف' : 'پخش');
  $('#scene-canvas').querySelectorAll('video').forEach(v => value ? playVideo(v) : v.pause());
}
function choose(i, keepPlaying = true) {
  if (!project) return;
  index = (i + deck().scenes.length) % deck().scenes.length; elapsed = 0; legacyBoxes={};
  renderList(); renderFlow(); renderInspector(); renderStage(true); setPlaying(true); updateProgress();
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
  $('#page-location').textContent = `صفحهٔ ${fa(index + 1)} از ${fa(deck().scenes.length)}`;
}
function tick(now) {
  const dt = Math.min(.1, Math.max(0, (now - previousFrame) / 1000)); previousFrame = now;
  if (project && playing && (!frame || iframeReady)) {
    const advance = Math.max(0, Math.min(dt, scene().duration - elapsed));
    elapsed = Math.min(scene().duration, elapsed + dt); sendLegacy('advance', { delta:advance * 1000 }); stageAnimations.forEach(a => { a.currentTime = elapsed * 1000; });

    updateProgress();
  }
  requestAnimationFrame(tick);
}

const field = (label, key, value, type = 'text', extra = '', hint = '') => `<label class="field"><span>${label}</span><input type="${type}" data-key="${key}" value="${escapeText(value)}" ${extra}>${hint ? `<small class="hint">${hint}</small>` : ''}</label>`;
const select = (label, key, options, current) => `<label class="field"><span>${label}</span><select data-key="${key}">${options.map(([value, text]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`;
function renderInspector() {
  if (!project) return;
  const s = scene(), form = $('#scene-form'); $('#editing-number').textContent = `صفحهٔ ${fa(index + 1)}`;
  document.querySelectorAll('.editor-tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  if (tab === 'content') {
    form.innerHTML = field('نام در فهرست صفحه‌ها', 'label', s.label, 'text', 'maxlength="200"') + field('بخش', 'chapter', s.chapter, 'text', 'maxlength="100"', 'صفحه‌های هم‌نام در منوی سمت راست زیر یک بخش قرار می‌گیرند.') + `<label class="field"><span>عنوان</span><textarea class="title-field" data-key="title" maxlength="1000">${escapeText(s.title)}</textarea></label>` + field('عبارت طلایی در عنوان', 'highlight', s.highlight, 'text', 'maxlength="1000"', 'همین عبارت را دقیقاً از عنوان وارد کن.') + `<label class="field"><span>توضیحات</span><textarea data-key="description" rows="6" maxlength="8000">${escapeText(s.description)}</textarea></label>` + select('قالب صفحه', 'layout', [['legacy','فلو اصلی اپ'],['split','متن و رسانه کنار هم'],['full','رسانهٔ تمام‌صفحه با متن'],['title','تیتر معرفی']], s.layout) + (s.layout === 'legacy' ? select('صحنهٔ اصلی اپ', 'legacyScene', project.decks.find(d => d.id === 'app')?.scenes.filter(x => x.layout === 'legacy').map(x => [String(x.legacyScene), `${fa(x.legacyScene + 1)} · ${x.label}`]) || Array.from({length:14}, (_, i) => [String(i), `صحنهٔ ${fa(i+1)}`]), String(s.legacyScene)) + '<p class="hint">متن کنار نمایشگر قابل ویرایش است. نوشته‌های داخل تصاویر اصلی اپ بخشی از تصویرند؛ برای تغییرشان تصویر را جایگزین کن.</p>' : '');
  } else if (tab === 'media') {
    const selected = project.library.find(m => m.src === s.media);
    form.innerHTML = (s.layout === 'legacy' ? '<p class="hint">انتخاب عکس یا ویدیو، این صفحه را به قالب «متن و رسانه کنار هم» تغییر می‌دهد. برای برگشت، قالب «فلو اصلی اپ» را انتخاب کن.</p><hr class="editor-divider">' : '') + '<div class="media-preview" id="current-media"></div><button type="button" class="button upload-button" id="upload-media">' + icon('upload') + 'انتخاب عکس یا ویدیو از دستگاه</button><p class="hint">PNG، JPG، WebP، GIF، MP4 یا WebM · حداکثر ۹۵ مگابایت</p><hr class="editor-divider">' + select('نمایش رسانه', 'fit', [['contain','نمایش کامل · بدون برش'],['cover','پر کردن قاب · با برش']], s.fit) + field('جای رسانه در قاب', 'position', s.position, 'range', 'min="0" max="100" step="1"') + `<label class="field checkbox"><input type="checkbox" data-key="loop" ${s.loop ? 'checked' : ''}><span>لوپ ویدیو تا رفتن به صفحهٔ بعد</span></label>` + '<button type="button" id="choose-poster" class="text-button">انتخاب تصویر کاور ویدیو</button><button type="button" id="remove-media" class="text-button danger">حذف رسانه از این صفحه</button><hr class="editor-divider"><h3 class="field-title">کتابخانهٔ رسانه</h3><div class="media-choices" id="media-library"></div>';
    const preview = $('#current-media');
    if (s.poster || s.media) { const isVideo = !s.poster && /\.(mp4|webm)$/i.test(s.media); const el = document.createElement(isVideo ? 'video' : 'img'); el.src = s.poster || s.media; if (isVideo) { el.muted = true; el.preload = 'metadata'; } else el.alt = ''; preview.append(el); const name = document.createElement('span'); name.className = 'media-name'; name.textContent = selected?.name || 'رسانهٔ فعلی'; preview.append(name); }
    else preview.innerHTML = icon(s.layout === 'legacy' ? 'phone' : 'picture');
    for (const m of project.library) { const b = document.createElement('button'); b.type = 'button'; b.className = 'media-choice' + (m.src === s.media ? ' selected' : ''); b.dataset.media = m.id; const img = document.createElement(m.poster || m.type === 'image' ? 'img' : 'video'); img.src = m.poster || m.src; if (img.tagName === 'VIDEO') { img.muted = true; img.preload = 'metadata'; } else { img.alt = ''; img.loading = 'lazy'; } const caption = document.createElement('span'); caption.textContent = m.name; b.append(img, caption); $('#media-library').append(b); }
    $('#upload-media').onclick = () => uploadDialog(false); $('#choose-poster').onclick = () => uploadDialog(true);
    $('#remove-media').onclick = () => { checkpoint(); scene().media = ''; scene().poster = ''; setPlaying(false); renderStage(); renderInspector(); renderList(); changed(); };
  } else {
    form.innerHTML = field('مدت انیمیشن صفحه (ثانیه)', 'duration', s.duration, 'number', 'min="1" max="180" step="0.1"') + select('ورود به صفحه', 'transition', [['fade','محو آرام'],['reveal','آشکار شدن سینمایی'],['slide','حرکت افقی'],['none','بدون افکت']], s.transition) + field('شدت حرکت', 'intensity', s.intensity, 'range', 'min="0" max="1" step="0.05"', 'حرکت کم برای خواندن متن و نمایش محصول مناسب‌تر است.') + '<hr class="editor-divider">' + field('اندازهٔ عنوان', 'fontSize', s.fontSize, 'range', 'min="20" max="64" step="1"') + '<div class="field-row">' + field('رنگ متن', 'textColor', s.textColor, 'color') + field('رنگ تأکید', 'accent', s.accent, 'color') + '</div>' + field('رنگ زمینه', 'background', s.background, 'color') + (s.layout === 'legacy' ? '<p class="hint">انیمیشن داخلی فلو اپ همان نسخهٔ اصلی است؛ تنظیم افکت ورود برای قالب‌های رسانه‌ای اعمال می‌شود.</p>' : '') + '<p class="hint">در حالت کاهش حرکت سیستم، افکت‌های تزئینی حذف می‌شوند. ویدیوها خودکار و بی‌صدا شروع می‌شوند. تغییر صفحه فقط با انتخاب شماست.</p>';
  }
  form.insertAdjacentHTML('beforeend', '<hr class="editor-divider"><p class="hint">در پیش‌نمایش، دستگیرهٔ متن یا رسانه را بکش. برای اندازه، گوشهٔ قاب را بکش. کلیدهای جهت روی دستگیره جابه‌جا می‌کنند؛ Shift + جهت اندازه را عوض می‌کند. چیدمان موبایل و دسکتاپ مستقل است.</p><button type="button" id="reset-placement" class="text-button">بازنشانی چیدمان این صفحه</button>');
  $('#reset-placement').onclick=()=>{checkpoint();delete scene().placement;legacyBoxes={};renderStage();changed();};
  form.querySelectorAll('[data-key]').forEach(input => {
    let hasCheckpoint = false;
    input.addEventListener('focus', () => { hasCheckpoint = false; });
    input.addEventListener('input', () => {
      const key = input.dataset.key; let value = input.type === 'checkbox' ? input.checked : ['number','range'].includes(input.type) || key === 'legacyScene' ? Number(input.value) : input.value;
      if (input.type === 'number' && (!input.value || !Number.isFinite(value) || value < Number(input.min) || value > Number(input.max))) return;
      if (scene()[key] === value) return;
      if (!hasCheckpoint) { checkpoint(); hasCheckpoint = true; }
      scene()[key] = value; if(key !== 'loop') { elapsed = 0; } renderStage(['transition','intensity'].includes(key)); renderList(); renderFlow(); changed();
      if (key === 'layout') renderInspector();
      if (key === 'loop') $('#loop-video').checked=value;
    });
  });
}

$('#scene-form').addEventListener('submit', e => e.preventDefault());
$('#scene-form').addEventListener('click', e => {
  const b = e.target.closest('[data-media]'); if (!b) return; const m = project.library.find(x => x.id === b.dataset.media); if (!m) return;
  checkpoint(); Object.assign(scene(), { media:m.src, poster:m.poster }); if (['legacy','title'].includes(scene().layout)) scene().layout = 'split'; setPlaying(true); elapsed = 0; renderStage(true); renderInspector(); renderList(); changed();
});
$('.editor-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; renderInspector(); } });

$('#deck-select').onchange = () => { checkpoint(); deckId = $('#deck-select').value; project.activeDeck = deckId; index = 0; sceneSignature = ''; renderDecks(); choose(0, false); changed(); };
$('#toggle-edit').onclick = () => { editMode(!document.body.classList.contains('editing')); };
$('#play').onclick = () => { setPlaying(!playing); };
$('#prev').onclick = () => choose(index - 1); $('#next').onclick = () => choose(index + 1); $('#restart').onclick = () => {seek(0);setPlaying(true)};
$('#add-scene').onclick = () => { if (deck().scenes.length >= 200) return toast('هر پروژه حداکثر ۲۰۰ صفحه دارد.', true); checkpoint(); deck().scenes.splice(index + 1, 0, blankScene()); choose(index + 1, false); tab = 'content'; renderInspector(); changed(); };
$('#duplicate').onclick = () => { if (deck().scenes.length >= 200) return toast('هر پروژه حداکثر ۲۰۰ صفحه دارد.', true); checkpoint(); const copy = clone(scene()); copy.id = `page-${crypto.randomUUID()}`; copy.label = `${copy.label} · کپی`.slice(0,200); deck().scenes.splice(index + 1, 0, copy); choose(index + 1, false); changed(); };
$('#delete').onclick = () => { if (deck().scenes.length <= 1) return; checkpoint(); deck().scenes.splice(index, 1); choose(Math.min(index, deck().scenes.length - 1), false); changed(); toast('صفحه حذف شد؛ با «برگرداندن تغییر» قابل بازیابی است.'); };
for (const [id, delta] of [['move-up',-1],['move-down',1]]) $('#' + id).onclick = () => { const target = index + delta; if (target < 0 || target >= deck().scenes.length) return; checkpoint(); const [s] = deck().scenes.splice(index, 1); deck().scenes.splice(target, 0, s); choose(target, false); changed(); };
function restore(value) { project = value; deckId = project.activeDeck; index = Math.min(index, deck().scenes.length - 1); renderDecks(); choose(index, false); changed(); }
$('#undo').onclick = () => { if (history.length) { future.push(clone(project)); restore(history.pop()); } };
$('#redo').onclick = () => { if (future.length) { history.push(clone(project)); restore(future.pop()); } };

async function save({automatic=false}={}) {
  clearTimeout(autoSaveTimer); autoSaveTimer=null;
  if (saving) return;
  try {
    validateProject(project);
    if (!backend) { localStorage.setItem('talacard-static-project-v1', JSON.stringify(project)); savedJSON = JSON.stringify(project); changed(); if(!automatic)toast('در این مرورگر ذخیره شد. اتصال انتشار آنلاین در این نسخه فعال نیست.'); return; }
    saving = true; updateStatus(); const snapshot = clone(project);
    const response = await fetch('/api/project', { method:'PUT', headers:{ 'Content-Type':'application/json', 'X-TalaCard-Studio':'1' }, body:JSON.stringify({ project:snapshot, revision }) });
    const result = await response.json(); if (!response.ok) {if(response.status===409)autoSaveBlocked=true;throw new Error(result.error || 'ذخیره انجام نشد.');}
    revision = result.revision; savedJSON = JSON.stringify(snapshot); autoSaveBlocked=false; localSaveError=false; draft(); readSyncStatus(); if(!automatic)toast('روی دستگاه ذخیره شد؛ لینک عمومی خودکار به‌روز می‌شود.');
  } catch (e) { localSaveError=true; if(!automatic||autoSaveBlocked)toast(e.message || 'ذخیره انجام نشد؛ دوباره تلاش می‌شود.', true); if(!autoSaveBlocked)autoSaveTimer=setTimeout(()=>save({automatic:true}),5000); }
  finally { saving = false; updateStatus(); if(dirty()&&!autoSaveBlocked&&!autoSaveTimer)scheduleAutoSave(); }
}
$('#save').onclick = () => {save();if(backend)fetch('/api/sync/retry',{method:'POST',headers:{'X-TalaCard-Studio':'1'}}).catch(()=>{});};
function downloadJSON() { const blob = new Blob([JSON.stringify(project, null, 2) + '\n'], { type:'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'talacard-project.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); }
$('#export-json').onclick = () => { downloadJSON(); closeMenu(); };
$('#import-json').onclick = () => { $('#json-file').value = ''; $('#json-file').click(); closeMenu(); };
$('#json-file').onchange = async () => {
  const file = $('#json-file').files[0]; if (!file) return;
  try { if (file.size > 2 * 1024 * 1024) throw new Error('فایل پروژه باید کوچک‌تر از ۲ مگابایت باشد.'); const incoming = validateProject(JSON.parse(await file.text())); checkpoint(); project = incoming; deckId = project.activeDeck; renderDecks(); choose(0, false); changed(); toast('پروژه بارگذاری شد. مسیر رسانه‌ها باید در پوشهٔ پروژه موجود باشد؛ برای ثبت، ذخیره را بزن.'); }
  catch (e) { toast(e instanceof SyntaxError ? 'فایل JSON قابل خواندن نیست.' : e.message, true); }
};
let uploadTarget;
function uploadDialog(poster) {
  if (!backend) return toast('برای افزودن فایل، نسخهٔ محلی را با node server.mjs اجرا کن.', true);
  uploadTarget = { deckId, sceneId:scene().id, poster }; $('#media-file').accept = poster ? 'image/png,image/jpeg,image/webp,image/gif' : 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm'; $('#media-file').value = ''; $('#media-file').click();
}
$('#media-file').onchange = async () => {
  const file = $('#media-file').files[0]; if (!file || !uploadTarget) return; const target = { ...uploadTarget };
  try {
    if (file.size > 95 * 1024 * 1024) throw new Error('حجم رسانه باید کمتر از ۹۵ مگابایت باشد.');
    toast('در حال کپی رسانه به پوشهٔ پروژه…');
    const r = await fetch('/api/media', { method:'POST', headers:{ 'Content-Type':file.type, 'X-TalaCard-Studio':'1' }, body:file }); const value = await r.json(); if (!r.ok) throw new Error(value.error || 'رسانه ذخیره نشد.');
    const targetScene = project.decks.find(d => d.id === target.deckId)?.scenes.find(s => s.id === target.sceneId);
    checkpoint(); project.library.push({ ...value, name:file.name.slice(0,200), originalName:file.name.slice(0,500) });
    if (targetScene) { if (target.poster) targetScene.poster = value.src; else { targetScene.media = value.src; targetScene.poster = value.poster; if (['legacy','title'].includes(targetScene.layout)) targetScene.layout = 'split'; } }
    setPlaying(true); renderStage(true); renderInspector(); renderList(); changed(); toast('رسانه اضافه شد؛ برای ثبت انتخاب، پروژه را ذخیره کن.');
  } catch (e) { toast(e.message || 'افزودن فایل انجام نشد.', true); }
};

function closeMenu() { $('#project-menu').hidden = true; $('#more').setAttribute('aria-expanded','false'); }
$('#more').onclick = () => { $('#project-menu').hidden = !$('#project-menu').hidden; $('#more').setAttribute('aria-expanded', String(!$('#project-menu').hidden)); };
document.addEventListener('click', e => { if (!e.target.closest('#more') && !e.target.closest('#project-menu')) closeMenu(); });
$('#show-help').onclick = () => { $('#help').showModal(); closeMenu(); }; $('#close-help').onclick = () => $('#help').close();
async function fullscreen() { closeMenu(); try { await $('#stage').requestFullscreen(); document.body.classList.add('presenting'); resizeStage(); toast('فاصله: پخش/توقف · کلیدهای جهت: صفحهٔ بعد/قبل · Esc: خروج'); } catch { toast('نمایش تمام‌صفحه در این مرورگر فعال نیست؛ از «نمایش ارائه» استفاده کن.', true); } }
$('#fullscreen').onclick = fullscreen; $('#present').onclick = fullscreen;
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.body.classList.remove('presenting'); resizeStage(); });
document.addEventListener('keydown', e => {
  if (!project) return;
  const editing = e.target.closest('input,textarea,select,[contenteditable=true]');
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
  if ($('#help').open) return;
  if (editing) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? $('#redo') : $('#undo')).click(); }
  else if (e.code === 'Space' && !e.target.closest('button,a')) { e.preventDefault(); $('#play').click(); }
  else if (!e.target.closest('.placement-handle') && e.key === 'ArrowLeft') { e.preventDefault(); choose(index + 1); }
  else if (!e.target.closest('.placement-handle') && e.key === 'ArrowRight') { e.preventDefault(); choose(index - 1); }
  else if (e.key === 'Escape') closeMenu();
});
window.addEventListener('beforeunload', e => { if (project && dirty()) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (document.hidden && playing) setPlaying(false); });
window.addEventListener('hashchange', () => editMode(location.hash === '#edit'));

async function init() {
  try {
    let result;
    try { const r = await fetch('/api/project'); if (!r.ok) throw new Error(); result = await r.json(); if (!result.project) throw new Error(); }
    catch { backend = false; const r = await fetch('/default-content.json'); if (!r.ok) throw new Error('فایل محتوای پروژه پیدا نشد.'); const baseline = validateProject(await r.json()); result = { project:baseline, revision:'static' }; try { const stored = localStorage.getItem('talacard-static-project-v1'); if (stored) result.project = validateProject(JSON.parse(stored)); } catch {} }
    project = validateProject(result.project); revision = result.revision; savedJSON = JSON.stringify(project);
    try { const recovered = JSON.parse(localStorage.getItem('talacard-draft-v1') || 'null'); if (recovered && recovered.revision === revision) { project = validateProject(recovered.project); toast('تغییرات ذخیره‌نشدهٔ قبلی از مرورگر بازیابی شد.'); } } catch {}
    deckId = project.activeDeck; renderDecks(); editMode(location.hash === '#edit'); choose(0, false); updateStatus();
    readSyncStatus(); syncPoll=setInterval(readSyncStatus,2500);scheduleAutoSave();
    previousFrame = performance.now(); requestAnimationFrame(tick);
  } catch (e) { $('#save-status').textContent = 'خطا در بارگذاری'; $('#scene-canvas').textContent = 'پروژه بارگذاری نشد. فایل content.json و اجرای سرور را بررسی کنید.'; toast(e.message, true); }
}
init();

function canvasElement(){return $('#scene-canvas');}
$('#loop-video').onchange=()=>{checkpoint(); scene().loop=$('#loop-video').checked;const v=$('#scene-canvas video');if(v){v.loop=scene().loop;if(playing && v.ended){v.currentTime=0;playVideo(v)}}renderInspector();changed();};

// Handles live in the scaled design canvas, so pointer deltas remain accurate
// at editor zoom, on touch screens, and in fullscreen. One gesture = one undo.
let legacyBoxes = {}, activeGesture;
function currentBox(kind) {
  const canvas=canvasElement();
  const el=canvas.querySelector('.scene-'+kind);
  return scene().placement?.[placementMode(canvas)]?.[kind] || (frame ? legacyBoxes[kind] : el ? readPlacement(canvas,el) : null);
}
function writeBox(kind,box) {
  const canvas=canvasElement(), mode=placementMode(canvas);
  scene().placement ||= {}; scene().placement[mode] ||= {};
  scene().placement[mode][kind]=box;
  if(frame) sendLegacy('placement',{placement:scene().placement[mode]});
  else applyPlacement(canvas,scene());
  positionHandle(kind,box);
}
function positionHandle(kind,box) {
  const el=canvasElement().querySelector(`.placement-handle[data-kind="${kind}"]`); if(!el)return;
  Object.assign(el.style,{left:box.x+'%',top:box.y+'%',width:box.w+'%',height:box.h+'%'});
}
function renderHandles() {
  const canvas=canvasElement(); if(!project || activeGesture)return;
  canvas.querySelectorAll('.placement-handle').forEach(el=>el.remove());
  if(!document.body.classList.contains('editing'))return;
  for(const kind of ['copy','media']) {
    const raw=currentBox(kind); if(!raw)continue; const box=adjustBox(raw,0,0);
    const handle=document.createElement('div');handle.className='placement-handle';handle.dataset.kind=kind;
    const label=kind==='copy'?'متن':'رسانه';
    const move=document.createElement('button');move.type='button';move.className='move-handle';move.textContent='جابه‌جایی '+label;move.setAttribute('aria-label','جابه‌جایی '+label);move.dataset.action='move';
    const size=document.createElement('button');size.type='button';size.className='resize-handle';size.setAttribute('aria-label','تغییر اندازهٔ '+label);size.dataset.action='resize';
    handle.append(move,size);canvas.append(handle);positionHandle(kind,box);
  }
}
canvasElement().addEventListener('pointerdown',e=>{
  const button=e.target.closest('.placement-handle button');if(!button||e.button!==0)return;
  e.preventDefault();const kind=button.parentElement.dataset.kind, box=currentBox(kind);if(!box)return;
  checkpoint();stageAnimations.forEach(a=>{try{a.finish()}catch{}});
  activeGesture={kind,start:adjustBox(box,0,0),x:e.clientX,y:e.clientY,resize:button.dataset.action==='resize',button,pointer:e.pointerId,sceneId:scene().id};
  button.setPointerCapture(e.pointerId);document.body.classList.add('placing');
});
canvasElement().addEventListener('pointermove',e=>{
  const g=activeGesture;if(!g||g.pointer!==e.pointerId||scene().id!==g.sceneId)return;
  const rect=canvasElement().getBoundingClientRect();
  writeBox(g.kind,adjustBox(g.start,(e.clientX-g.x)/rect.width*100,(e.clientY-g.y)/rect.height*100,g.resize));
});
function finishGesture(e) {
  if(!activeGesture||activeGesture.pointer!==e.pointerId)return;
  const g=activeGesture;activeGesture=null;document.body.classList.remove('placing');
  if(g.button.hasPointerCapture(e.pointerId))g.button.releasePointerCapture(e.pointerId);
  changed();renderHandles();
}
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvasElement().addEventListener(event,finishGesture);
canvasElement().addEventListener('keydown',e=>{
  const button=e.target.closest('.placement-handle button');if(!button||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();e.stopPropagation();const kind=button.parentElement.dataset.kind,box=currentBox(kind);if(!box)return;
  checkpoint();const dx=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,dy=e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0;
  writeBox(kind,adjustBox(box,dx,dy,e.shiftKey||button.dataset.action==='resize'));changed();
});
