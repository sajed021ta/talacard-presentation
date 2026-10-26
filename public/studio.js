import {accessFetch,mountAccess} from './access.js';
import {mountHomePicker,deckDisplayName} from './home.js';
import {playPageTransition,DEFAULT_PAGE_TRANSITION} from './page-transition.js';
import {pagePlaybackFinished} from './playback.js';
import {reconcileProjects,applyProjectInPlace} from './reconcile.js';
import {renderMediaItems,mediaItemBox,controlMediaItems,seekMediaItems} from './multimedia.js';
import {paintBackdrop} from './backdrop.js';
import {richEditorMarkup,mountRichEditor} from './rich-editor.js';
import {renderTitle,renderDescription,textBlocks,ensureTextBlocks,syncDescription} from './text.js';
import {applyMediaEffect,controlMediaEffect,seekMediaEffect,DEFAULT_EFFECT} from './effects.js';
import {renderNavigation} from './navigation.js';
import {applyPlacement,readPlacement,adjustBox,resizeBox,snapTextMove,resolvePlacementSettings,placementMode} from './placement.js';
import { clone, validateProject, chapters, blankScene, renameChapter, timeLabel } from './model.js';
import {ensureEditableProject,syncProjectEditor,homeEditorContent,updateEditorElement,editorSurface,reorderEditorElement} from './editor-model.js';

const $ = s => document.querySelector(s);
const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const icons = {
  play: '<path d="m9 5 11 7-11 7z"/>', pause: '<path d="M8 5v14M16 5v14"/>', next: '<path d="m15 5-7 7 7 7"/>', prev: '<path d="m9 5 7 7-7 7"/>', plus: '<path d="M12 5v14M5 12h14"/>', more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>', undo: '<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 7 7v3"/>', redo: '<path d="m16 4 5 5-5 5M21 9H11a7 7 0 0 0-7 7v3"/>', fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>', up: '<path d="m5 14 7-7 7 7"/>', down: '<path d="m5 10 7 7 7-7"/>', trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>', picture: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>', phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>', upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.picture}</svg>`;
for (const [id, name] of Object.entries({ undo:'undo', redo:'redo', more:'more', 'add-scene':'plus', prev:'prev', next:'next', play:'play', fullscreen:'fullscreen', 'move-up':'up', 'move-down':'down', delete:'trash', 'close-help':'close' })) $('#' + id).innerHTML = icon(name);

let project, savedJSON = '', revision = '', backend = true, hostedStorage=false, deckId, index = 0, tab = 'content';
let playing = false, elapsed = 0, previousFrame = 0, frame, iframeReady = false, sceneSignature = '', stageAnimations = [], saving = false, toastTimer, draftTimer;
let autoSaveTimer, autoSaveBlocked=false, localSaveError=false, syncState={status:'pending'}, syncPoll;
const history = [], future = [];
let legacyRequest = 0, richCleanup=null, activeTextBlockId=null,activeMediaItemId=null,mediaInsertMode='replace';
let selectedElementId=null;
let homePicker;
let elementPanelTab='geometry';
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
  status.textContent = saving ? 'در حال ذخیره…' : autoSaveBlocked ? 'تداخل ذخیره؛ فایل پروژه را دریافت کن' : dirty() ? localSaveError ? 'ذخیره نشد؛ تلاش دوباره…' : 'در انتظار ذخیرهٔ خودکار…' : backend ? hostedStorage?'ذخیره شد روی سایت':'ذخیره شد روی دستگاه' : 'ذخیره شد در مرورگر';
  const cloud=$('#cloud-status');if(cloud){const current=syncState.status;cloud.textContent=!backend?'نسخهٔ آفلاین':current==='published'&&syncState.revision===revision&&!dirty()?'همگام با لینک عمومی':current==='syncing'?'در حال ارسال به سایت…':current==='conflict'?'تداخل نسخهٔ آنلاین':current==='retrying'?'ذخیره شد؛ تلاش دوباره برای سایت':current==='disabled'?'اتصال سایت فعال نیست':'در انتظار همگام‌سازی';cloud.title=syncState.error||'ذخیره و انتشار خودکار فعال است';cloud.dataset.state=current;}
  status.classList.toggle('unsaved', dirty()); $('#save').disabled = saving;
  const contextStatus=$('#element-save-status');if(contextStatus)contextStatus.textContent=status.textContent;
  $('#undo').disabled = !history.length; $('#redo').disabled = !future.length;
}
function checkpoint() { history.push(clone(project)); if (history.length > 60) history.shift(); future.length = 0; }
function draft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    try { if (dirty()) localStorage.setItem('talacard-draft-v1', JSON.stringify({ revision, project, baseProject:JSON.parse(savedJSON) })); else localStorage.removeItem('talacard-draft-v1'); }
    catch { toast('فضای مرورگر برای نسخهٔ پشتیبان کافی نیست؛ پروژه را ذخیره کنید.', true); }
  }, 300);
}
function scheduleAutoSave(){clearTimeout(autoSaveTimer);if(project&&dirty()&&!autoSaveBlocked)autoSaveTimer=setTimeout(()=>save({automatic:true}),900)}
function changed() { syncProjectEditor(project); updateStatus(); draft(); scheduleAutoSave(); }
async function readSyncStatus(){
 if(!backend)return;
 try{
  const r=await accessFetch('/api/sync',{cache:'no-store'});if(!r.ok)return;syncState=await r.json();
  // Another local editor can save while this tab is idle. Pull its saved state
  // only when this tab has no pending edit; never overwrite an active draft.
  if(syncState.revision && syncState.revision!==revision && !dirty() && !saving && !document.activeElement?.closest('#scene-form')){
   const response=await accessFetch('/api/project',{cache:'no-store'});const latest=await response.json();
   if(response.ok && latest.revision!==revision && !dirty() && !saving){
    const previousId=scene().id;project=validateProject(latest.project);revision=latest.revision;savedJSON=JSON.stringify(project);
    if(!project.decks.some(d=>d.id===deckId))deckId=project.activeDeck;
    index=Math.max(0,deck().scenes.findIndex(s=>s.id===previousId));renderDecks();choose(index);if(homePicker?.visible){homePicker.refresh();setPlaying(false);}draft();
   }
  }
  updateStatus();
 }catch{}
}

function editMode(value) {
  document.body.classList.toggle('editing', value); $('#toggle-edit').textContent = value ? 'نمایش ارائه' : 'ویرایش صفحه‌ها';
  const onHome=Boolean(homePicker?.visible),pendingHome=!homePicker&&location.hash==='#edit-home',hash=value?(onHome?'#edit-home':'#edit'):(onHome?'#home':'');if(!pendingHome&&location.hash!==hash)window.history.replaceState(null,'',location.pathname+location.search+hash);
  if(onHome){homePicker.show({editing:value,selectedId:selectedElementId});if(value)renderHomeInspector();else{$('#element-panel').replaceChildren();richCleanup?.();richCleanup=null}}
  animateStage(); resizeStage(); prepareCanvasTextEditing(); renderHandles();
}

function renderDecks() {
  $('#deck-select').replaceChildren(...project.decks.map(d => { const o = new Option(deckDisplayName(project,d.id), d.id); o.selected = d.id === deckId; return o; }));
  if(!homePicker?.visible)document.title = deckDisplayName(project,deckId);
}
function renderList() {
  $('#page-count').textContent = fa(deck().scenes.length);
  $('#scene-heading').textContent = `${fa(index + 1)} از ${fa(deck().scenes.length)} · ${scene().label}`;
  $('#editing-number').textContent = `صفحهٔ ${fa(index + 1)}`;
  $('#move-up').disabled = index === 0; $('#move-down').disabled = index === deck().scenes.length - 1; $('#delete').disabled = deck().scenes.length === 1;
}
function renderFlow() {
  renderNavigation(deck(), index, choose, {addPage:addSubpage,renamePage:()=>{editMode(true);tab='page';renderInspector();const input=$('#scene-form [data-key=label]');input?.focus();input?.select()}});
  const toggle = $('#loop-video'), video = /\.(mp4|webm)$/i.test(scene().media);
  toggle.closest('label').hidden = !video;
  toggle.checked = scene().loop;
  $('#autoplay').checked=Boolean(project.editor?.settings?.playback?.autoplay);
}
function setAutoplay(value){project.editor||={};project.editor.settings||={};project.editor.settings.playback={...(project.editor.settings.playback||{}),autoplay:Boolean(value)};changed();}
function titleInto(el,s){renderTitle(el,s)}
function directTextDocuments(){
  const documents=[document];try{if(frame?.contentDocument)documents.push(frame.contentDocument)}catch{}return documents;
}
function directTextEditors(){
  const editors=[...$('#scene-canvas').querySelectorAll('.direct-rich-editor[data-word-id]')];
  try{if(frame?.contentDocument)editors.push(...frame.contentDocument.querySelectorAll('.direct-rich-editor[data-word-id]'))}catch{}
  return editors;
}
function prepareCanvasTextEditing(){
  const enabled=document.body.classList.contains('editing')&&tab==='content',canvas=$('#scene-canvas');
  const mark=(element,id)=>{if(!element)return;element.classList.toggle('direct-rich-editor',enabled);if(enabled){element.dataset.wordId=id;element.contentEditable='true';element.setAttribute('role','textbox');element.setAttribute('aria-multiline','true');element.setAttribute('spellcheck','false');element.dir='auto'}else{element.removeAttribute('contenteditable');element.removeAttribute('data-word-id');element.removeAttribute('role');element.removeAttribute('aria-multiline')}};
  canvas.querySelectorAll('.direct-rich-editor').forEach(element=>mark(element,''));
  const content=canvas.querySelector('.scene-content');if(content){mark(content.querySelector('h2'),'title');content.querySelectorAll('[data-text-block]').forEach(element=>mark(element,element.dataset.textBlock))}
  try{
    const doc=frame?.contentDocument;if(!doc)return;
    doc.querySelectorAll('.direct-rich-editor').forEach(element=>mark(element,''));
    const titles=[...doc.querySelectorAll('#capT,#tag')].filter(element=>getComputedStyle(element).display!=='none');for(const title of titles)mark(title,'title');
    doc.querySelectorAll('[data-text-block]').forEach(element=>mark(element,element.dataset.textBlock));
  }catch{}
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
  if (restart) animateStage(); resizeStage(); applyPlacement(canvas, s); applyMediaEffect(canvas,s,{playing,restart,reduce}); prepareCanvasTextEditing();applyElementLayers();renderHandles();
}
function animateStage() {
  stageAnimations.forEach(a => a.cancel()); stageAnimations = [];
  const s = scene(), content = $('#scene-canvas .scene-content'); if (!content || reduce || document.body.classList.contains('editing') || s.transition === 'none') return;
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
  const scale = fullscreen ? Math.min(stage.clientWidth / w, stage.clientHeight / h) : stage.clientWidth / w;
  canvas.style.transform = `scale(${scale})`;
  canvas.style.setProperty('--handle-factor', String(1/scale));
  applyPlacement(canvas,scene());paintBackdrop(canvas,scene(),elapsed,reduce);renderMediaItems(canvas,scene(),{playing,reduce});
  const content=canvas.querySelector('.scene-content');if(content)renderDescription(content,content.querySelector('.scene-description'),scene(),placementMode(canvas));
  prepareCanvasTextEditing();applyElementLayers();renderHandles();
}
new ResizeObserver(resizeStage).observe($('#stage'));
window.addEventListener('resize', resizeStage);
window.addEventListener('message', e => {
  if (e.origin !== location.origin || e.source !== frame?.contentWindow) return;
  if (e.data?.type === 'talacard-ready') { iframeReady = true; loadLegacy(); if (elapsed) advanceLegacyTo(elapsed); }
  if(e.data?.type==='talacard-layout' && e.data.sceneId===scene().id){legacyBoxes=e.data.boxes;renderHandles();}
  if(e.data?.type==='talacard-loaded'&&e.data.request===legacyRequest){$('#scene-canvas .legacy-loading')?.remove();$('#stage').setAttribute('aria-busy','false');$('#stage').dataset.renderedScene=e.data.sceneId;prepareCanvasTextEditing();applyElementLayers();if(tab==='content'&&document.body.classList.contains('editing'))renderInspector()}
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
  const previousIndex=index,hadScene=Boolean(sceneSignature);
  index = (i + deck().scenes.length) % deck().scenes.length; elapsed = 0; legacyBoxes={};selectedElementId=null;activeTextBlockId=null;activeMediaItemId=null;
  renderList(); renderFlow(); renderStage(true); renderInspector(); setPlaying(true); updateProgress();
  if(hadScene)playPageTransition($('#scene-canvas'),project.editor?.settings?.playback?.transition||DEFAULT_PAGE_TRANSITION,{reduce,reverse:i<previousIndex});
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
      if (project && playing) {
        const advance = dt;
        elapsed += advance;
        // Keep the presentation clock independent from legacy iframe readiness.
        // The iframe command is still guarded by sendLegacy(), so late-loading
        // legacy decks catch up without blocking Auto Play navigation.
        if (!frame || iframeReady) {
          sendLegacy('advance', { delta:advance * 1000 });
          stageAnimations.forEach(a => { a.currentTime = elapsed * 1000; });
        }
    const autoplay=Boolean(project.editor?.settings?.playback?.autoplay);
    if(pagePlaybackFinished($('#scene-canvas'),scene(),elapsed,autoplay)){choose(index+1);}
    paintBackdrop($('#scene-canvas'),scene(),elapsed,reduce);updateProgress();
  }
  requestAnimationFrame(tick);
}

const field = (label, key, value, type = 'text', extra = '', hint = '') => `<label class="field"><span>${label}</span><input type="${type}" data-key="${key}" value="${escapeText(value)}" ${extra}>${hint ? `<small class="hint">${hint}</small>` : ''}</label>`;
const select = (label, key, options, current) => `<label class="field"><span>${label}</span><select data-key="${key}">${options.map(([value, text]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`;
const allSceneElements=()=>editorSurface(project,scene().id)?.elements.filter(element=>['richText','image','video'].includes(element.type))||[];
const sceneElements=()=>allSceneElements().filter(element=>!element.style?.hidden);
const selectedElement=()=>sceneElements().find(element=>element.id===selectedElementId);
function elementLabel(element){
  if(!element)return 'بدون انتخاب';if(element.binding.field==='title')return 'عنوان';if(element.binding.field==='textBlock')return runsLabel(element.content.text,'باکس متن');if(element.binding.field==='primaryMedia')return element.type==='video'?'ویدیوی اصلی':'تصویر اصلی';return runsLabel(element.content.name,element.type==='video'?'ویدیو':'تصویر');
}
function runsLabel(value,fallback){const text=String(value||'').trim();return text?(text.length>34?text.slice(0,34)+'…':text):fallback}
function kindForElement(element){if(!element)return null;const field=element.binding?.field;if(field==='title')return 'copy';if(field==='textBlock')return 'text:'+element.binding.itemId;if(field==='primaryMedia')return 'media';if(field==='mediaItem')return 'extra:'+element.binding.itemId;return null}
function elementForKind(kind){return sceneElements().find(element=>kindForElement(element)===kind)}
function ensureElementSelection(){const elements=sceneElements();if(!elements.some(element=>element.id===selectedElementId))selectedElementId=elements.find(element=>element.binding.field==='title')?.id||elements[0]?.id||null;return selectedElement()}
function selectElement(id,{switchTab=true}={}){
  const element=sceneElements().find(value=>value.id===id);if(!element)return;selectedElementId=id;
  if(element.binding.field==='textBlock')activeTextBlockId=element.binding.itemId;else if(element.type==='richText')activeTextBlockId=null;
  if(element.binding.field==='mediaItem')activeMediaItemId=element.binding.itemId;else if(['image','video'].includes(element.type))activeMediaItemId=null;
  const nextTab=element.type==='richText'?'content':'media';if(switchTab&&tab!==nextTab){tab=nextTab;renderInspector();return}
  applyElementLayers();renderHandles();renderElementPanel();
}
function elementTarget(element){
  const canvas=canvasElement(),field=element.binding?.field;
  if(field==='title'){if(frame){try{return frame.contentDocument.querySelector('#tag:not([hidden]),#capT')}catch{return null}}return canvas.querySelector('.scene-content h2')}
  if(field==='textBlock'){if(frame){try{return frame.contentDocument.querySelector('[data-text-block="'+element.binding.itemId+'"]')}catch{return null}}return canvas.querySelector('[data-text-block="'+element.binding.itemId+'"]')}
  if(field==='primaryMedia')return canvas.querySelector('.scene-content > .scene-media');
  if(field==='mediaItem')return canvas.querySelector('[data-media-item="'+element.binding.itemId+'"]');return null;
}
function applyElementLayers(){
  if(!project)return;const copy=canvasElement().querySelector('.scene-copy');if(copy){copy.style.zIndex='auto';const chapter=copy.querySelector('.scene-chapter');if(chapter){chapter.style.position='relative';chapter.style.zIndex='2'}}for(const element of allSceneElements()){const target=elementTarget(element);if(!target)continue;target.dataset.editorElement=element.id;target.style.zIndex=String(element.zIndex);target.style.display=element.style?.hidden?'none':'';if(element.type==='richText'&&!['absolute','fixed'].includes(getComputedStyle(target).position))target.style.position='relative'}
}
function moveSelectedLayer(delta){
  const element=selectedElement(),ordered=sceneElements().slice().sort((a,b)=>a.zIndex-b.zIndex);if(!element)return;const index=ordered.findIndex(value=>value.id===element.id),next=index+Math.sign(delta);if(next<0||next>=ordered.length)return;checkpoint();reorderEditorElement(project,scene().id,element.id,delta);applyElementLayers();changed();renderElementPanel();renderHandles();
}
function duplicateSelectedElement(){
  const element=selectedElement();if(!element)return;checkpoint();const s=scene(),mode=placementMode(canvasElement()),kind=kindForElement(element),box=currentBox(kind),offset=box?adjustBox(box,2,2):null;let itemId=null;
  if(element.binding.field==='title'){const block={id:'text-'+crypto.randomUUID(),runs:clone(s.titleRuns||[{text:s.title}]),format:clone(s.titleFormat||{})};if(offset)block.placement={[mode]:offset};ensureTextBlocks(s).push(block);syncDescription(s);itemId=block.id}
  else if(element.binding.field==='textBlock'){const source=ensureTextBlocks(s).find(block=>block.id===element.binding.itemId),block=clone(source);block.id='text-'+crypto.randomUUID();if(block.placement)for(const viewport of Object.keys(block.placement))block.placement[viewport]=adjustBox(block.placement[viewport],2,2);ensureTextBlocks(s).push(block);syncDescription(s);itemId=block.id}
  else{const source=element.binding.field==='primaryMedia'?{name:'کپی رسانهٔ اصلی',media:s.media,poster:s.poster,fit:s.fit,loop:s.loop,mediaEffect:s.mediaEffect}:s.mediaItems.find(item=>item.id===element.binding.itemId),copy=clone(source);copy.id='media-'+crypto.randomUUID();copy.name=(copy.name||'رسانه')+' · کپی';if(element.binding.field==='primaryMedia'&&offset)copy.placement={[mode]:offset};else if(copy.placement)for(const viewport of Object.keys(copy.placement))copy.placement[viewport]=adjustBox(copy.placement[viewport],2,2);s.mediaItems||=[];s.mediaItems.push(copy);itemId=copy.id}
  syncProjectEditor(project);const selected=sceneElements().find(value=>value.binding.itemId===itemId);selectedElementId=selected?.id||null;activeTextBlockId=selected?.binding.field==='textBlock'?itemId:null;activeMediaItemId=selected?.binding.field==='mediaItem'?itemId:null;renderStage();renderInspector();changed();
}
function deleteSelectedElement(){
  const element=selectedElement();if(!element)return;checkpoint();const s=scene(),field=element.binding.field;
  if(field==='title')element.style.hidden=true;else if(field==='textBlock'){s.textBlocks=ensureTextBlocks(s).filter(block=>block.id!==element.binding.itemId);syncDescription(s)}else if(field==='primaryMedia'){s.media='';s.poster=''}else if(field==='mediaItem')s.mediaItems=s.mediaItems.filter(item=>item.id!==element.binding.itemId);
  syncProjectEditor(project);selectedElementId=null;renderStage();renderInspector();changed();
}
function setContextGeometry(key,value){const element=selectedElement(),kind=kindForElement(element),box=currentBox(kind);if(!box||!Number.isFinite(value))return;checkpoint();writeBox(kind,adjustBox({...box,[key]:value},0,0));applyElementLayers();changed();renderElementPanel()}
function setTextBlockFormat(key,value){const element=selectedElement();if(!element||element.type!=='richText')return;checkpoint();if(element.binding.field==='title'){scene().titleFormat||={};scene().titleFormat[key]=value}else{const block=ensureTextBlocks(scene()).find(item=>item.id===element.binding.itemId);block.format||={};block.format[key]=value}refreshText();changed();renderElementPanel()}
function setMediaContext(key,value){
  const element=selectedElement();if(!element||!['image','video'].includes(element.type))return;checkpoint();if(key==='preserveAspect'){element.style.preserveAspect=value;changed();renderElementPanel();return}
  if(element.binding.field==='primaryMedia')scene()[key]=value;else{const item=scene().mediaItems.find(value=>value.id===element.binding.itemId);item[key]=value}renderStage();changed();renderElementPanel();
}
function mediaPresetBox(preset){
  const canvas=canvasElement(),mode=placementMode(canvas),ratio=mode==='compact'?700/1000:1240/820;
  if(preset==='full')return {x:0,y:0,w:100,h:100};
  if(preset==='half-right')return {x:50,y:0,w:50,h:100};
  if(preset==='half-left')return {x:0,y:0,w:50,h:100};
  const aspect=preset==='square'?1:preset==='portrait'?9/16:16/9;
  let w=preset==='portrait'?60:90,h=w*ratio/aspect;if(h>90){h=90;w=h*aspect/ratio}
  return {x:(100-w)/2,y:(100-h)/2,w,h};
}
function applyMediaPreset(preset){
  if(!preset)return;const element=selectedElement();if(!element||!['image','video'].includes(element.type))return;const kind=kindForElement(element);if(!kind)return;
  checkpoint();writeBox(kind,mediaPresetBox(preset));
  if(preset==='full'){if(element.binding.field==='primaryMedia')scene().fit='cover';else{const item=scene().mediaItems.find(value=>value.id===element.binding.itemId);if(item)item.fit='cover'}renderStage()}
  changed();renderElementPanel();
}
function setGridContext(section,key,value){project.editor.settings||={};project.editor.settings.placement=resolvePlacementSettings(project.editor.settings.placement);project.editor.settings.placement[section][key]=value;changed();renderHandles();renderElementPanel()}
const textInspectorTab=value=>['content','format','page'].includes(value);
function applyInspectorView(){
 const home=Boolean(homePicker?.editing),element=home?selectedHomeElement():selectedElement();
 const allowed=value=>value!=='grid'||(!home&&element?.type==='richText');
 const available=value=>allowed(value)&&(!home||!['motion','grid'].includes(value))&&(!home||!['media','page'].includes(value)||element?.type==='card');
 if(!available(tab))tab='content';
 $('#inspector').dataset.view=tab;
 document.querySelectorAll('.editor-tabs [data-tab]').forEach(button=>{button.hidden=!available(button.dataset.tab);button.setAttribute('aria-selected',String(button.dataset.tab===tab));button.tabIndex=button.dataset.tab===tab?0:-1});
 $('#element-panel').hidden=!['geometry','layers','grid'].includes(tab)&&!(tab==='media'&&['card','image','video'].includes(element?.type))&&!(home&&tab==='appearance');
 $('#scene-form').hidden=['geometry','layers','grid'].includes(tab)||(home&&tab==='appearance');
 $('#scene-form').dataset.view=tab;
}
function setInspectorTab(value){
 const keepText=textInspectorTab(tab)&&textInspectorTab(value)&&$('#scene-form').dataset.family==='text';
 if(keepText)richCleanup?.holdSelection?.(value==='format');
 tab=value;
 if(keepText){renderElementPanel();applyInspectorView()}else renderInspector();
 $('.inspector-body').scrollTop=0;
}
function contextTabs(tabs){
 if(['geometry','text','media','layers','grid','appearance'].includes(tab))elementPanelTab=tab;
 const available=tabs.filter(Boolean);if(!available.some(item=>item.id===elementPanelTab))elementPanelTab=available[0]?.id||'geometry';
 return `<div class="context-tabs" role="tablist" aria-label="تنظیمات المان">${available.map(item=>`<button type="button" role="tab" data-context-tab="${item.id}" aria-selected="${item.id===elementPanelTab}">${item.label}</button>`).join('')}</div>${available.map(item=>`<section class="context-tab-panel" role="tabpanel" ${item.id===elementPanelTab?'':'hidden'}>${item.content}</section>`).join('')}`;
}
function renderElementPanel(){
  if(homePicker?.editing){renderHomeElementPanel();return}
  const panel=$('#element-panel');if(!panel||!project)return;const element=ensureElementSelection();if(!element){panel.replaceChildren();return}const kind=kindForElement(element),box=currentBox(kind),layers=sceneElements().slice().sort((a,b)=>b.zIndex-a.zIndex),settings=placementSettings(),isText=element.type==='richText',isMedia=['image','video'].includes(element.type),format=element.binding.field==='title'?scene().titleFormat||{}:ensureTextBlocks(scene()).find(block=>block.id===element.binding.itemId)?.format||{},position=layers.findIndex(value=>value.id===element.id);
  const tabs=[
   box&&{id:'geometry',label:'ابعاد',content:`<div class="geometry-grid">${[['x','X',box.x],['y','Y',box.y],['w','عرض',box.w],['h','ارتفاع',box.h]].map(([key,label,value])=>`<label>${label}<input type="number" data-geometry="${key}" min="0" max="100" step="0.1" value="${Number(value.toFixed(3))}"></label>`).join('')}</div>${isMedia?`<label class="context-row"><span>حفظ نسبت تصویر</span><input type="checkbox" data-media-context="preserveAspect" ${element.style?.preserveAspect?'checked':''}></label>`:''}`},
   isText&&{id:'text',label:'متن',content:`<label class="context-row"><span>تراز</span><select data-text-context="align">${[['right','راست'],['center','وسط'],['left','چپ'],['justify','دوطرفه']].map(([value,label])=>`<option value="${value}" ${(format.align||'right')===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="context-row"><span>فاصله خطوط</span><input type="number" data-text-context="lineHeight" min="1" max="3" step="0.1" value="${format.lineHeight||2.1}"></label><label class="context-row"><span>فاصله پاراگراف</span><input type="number" data-text-context="paragraphSpacing" min="0" max="4" step="0.1" value="${format.paragraphSpacing||0}"></label><button type="button" class="button context-tool-link" data-context-action="text-tools">ابزارهای کامل Rich Text</button>`},
   isMedia&&{id:'media',label:'رسانه',content:`<label class="context-row"><span>اندازهٔ آماده</span><select data-media-preset><option value="">انتخاب اندازه…</option><option value="full">تمام صفحه</option><option value="wide">افقی 16:9</option><option value="square">مربع 1:1</option><option value="portrait">عمودی 9:16</option><option value="half-right">نیمهٔ راست</option><option value="half-left">نیمهٔ چپ</option></select></label><p class="hint">برای اندازهٔ دلخواه، X، Y، عرض و ارتفاع را در تب «ابعاد» وارد کن.</p><label class="context-row"><span>نحوه نمایش</span><select data-media-context="fit"><option value="contain" ${element.content.fit==='contain'?'selected':''}>کامل · بدون برش</option><option value="cover" ${element.content.fit==='cover'?'selected':''}>پر کردن قاب · با برش</option><option value="fill" ${element.content.fit==='fill'?'selected':''}>کشیده‌شدن تا لبه‌ها</option></select></label>${element.type==='video'?`<label class="context-row"><span>پخش Loop</span><input type="checkbox" data-media-context="loop" ${element.content.loop?'checked':''}></label>`:''}<button type="button" class="button context-tool-link" data-context-action="media-tools">افکت و رسانه</button>`},
   {id:'layers',label:'لایه‌ها',content:`<div class="layer-actions"><button type="button" data-context-action="forward" ${position===0?'disabled':''}>Bring Forward</button><button type="button" data-context-action="backward" ${position===layers.length-1?'disabled':''}>Send Backward</button></div><div class="layer-list">${layers.map(layer=>`<button type="button" class="layer-item ${layer.id===element.id?'selected':''}" data-layer-id="${escapeText(layer.id)}"><span>${escapeText(elementLabel(layer))}</span><b>${layer.zIndex}</b></button>`).join('')}</div>`},
   isText&&{id:'grid',label:'Grid',content:`<label class="context-row"><span>نمایش Grid متن</span><input type="checkbox" data-grid-section="grid" data-grid-key="visible" ${settings.grid.visible?'checked':''}></label><label class="context-row"><span>Snap متن به Grid</span><input type="checkbox" data-grid-section="grid" data-grid-key="enabled" ${settings.grid.enabled?'checked':''}></label><label class="context-row"><span>اندازه Grid</span><input type="number" data-grid-section="grid" data-grid-key="size" min="1" max="128" step="1" value="${settings.grid.size}"></label><label class="context-row"><span>Smart Guides</span><input type="checkbox" data-grid-section="guides" data-grid-key="enabled" ${settings.guides.enabled?'checked':''}></label><label class="context-row"><span>آستانه Snap</span><input type="number" data-grid-section="guides" data-grid-key="threshold" min="0" max="40" step="1" value="${settings.guides.threshold}"></label>`}
  ];
  panel.innerHTML=`<div class="element-panel-head"><span class="element-kind">${isText?'متن':element.type==='video'?'ویدیو':'تصویر'}</span><div><strong>${escapeText(elementLabel(element))}</strong><small id="element-save-status" class="context-save">${escapeText($('#save-status').textContent)}</small></div></div>
  <div class="element-actions"><button type="button" data-context-action="duplicate">Duplicate</button><button type="button" data-context-action="delete" class="danger">حذف</button><button type="button" data-context-action="undo" ${history.length?'':'disabled'}>Undo</button><button type="button" data-context-action="redo" ${future.length?'':'disabled'}>Redo</button></div>
  ${contextTabs(tabs)}`;
  panel.querySelectorAll('[data-geometry]').forEach(input=>input.onchange=()=>setContextGeometry(input.dataset.geometry,Number(input.value)));
  panel.querySelectorAll('[data-text-context]').forEach(input=>input.onchange=()=>setTextBlockFormat(input.dataset.textContext,input.type==='number'?Number(input.value):input.value));
  panel.querySelectorAll('[data-media-context]').forEach(input=>input.onchange=()=>setMediaContext(input.dataset.mediaContext,input.type==='checkbox'?input.checked:input.value));
  panel.querySelector('[data-media-preset]')?.addEventListener('change',event=>applyMediaPreset(event.target.value));
  panel.querySelectorAll('[data-grid-key]').forEach(input=>input.onchange=()=>{checkpoint();setGridContext(input.dataset.gridSection,input.dataset.gridKey,input.type==='checkbox'?input.checked:Number(input.value))});
  panel.onclick=event=>{const contextTab=event.target.closest('[data-context-tab]');if(contextTab){setInspectorTab(contextTab.dataset.contextTab);return}const layer=event.target.closest('[data-layer-id]');if(layer){selectElement(layer.dataset.layerId,{switchTab:false});return}const action=event.target.closest('[data-context-action]')?.dataset.contextAction;if(!action)return;if(action==='duplicate')duplicateSelectedElement();else if(action==='delete')deleteSelectedElement();else if(action==='undo')$('#undo').click();else if(action==='redo')$('#redo').click();else if(action==='forward')moveSelectedLayer(1);else if(action==='backward')moveSelectedLayer(-1);else if(action==='text-tools')setInspectorTab('format');else if(action==='media-tools')setInspectorTab('media')};
  applyInspectorView();
}

const homeElements=()=>editorSurface(project,'home')?.elements||[];
const selectedHomeElement=()=>homeElements().find(element=>element.id===selectedElementId)||homeElements().find(element=>element.role==='title')||homeElements()[0];
function homeElementLabel(element){if(!element)return 'صفحهٔ اصلی';if(element.role==='kicker')return 'نوشتهٔ بالای عنوان';if(element.role==='title')return 'عنوان صفحهٔ اصلی';return `کارت «${element.content.name}»`}
function selectHomeElement(id){if(!homeElements().some(element=>element.id===id))return;selectedElementId=id;homePicker?.select(id);renderHomeInspector()}
function setHomeStyle(key,value){const element=selectedHomeElement();if(!element)return;checkpoint();updateEditorElement(project,'home',element.id,{style:{[key]:value}});homePicker.refresh();changed();renderHomeElementPanel()}
function setHomeContent(key,value){const element=selectedHomeElement();if(!element||element.type!=='card')return;checkpoint();updateEditorElement(project,'home',element.id,{content:{[key]:value}});homePicker.refresh();changed();renderHomeElementPanel()}
function setHomeMediaPreset(preset){
 const element=selectedHomeElement();if(!element||element.type!=='card')return;const presets={default:{mediaPreset:'default',mediaWidth:100,mediaHeight:0,mediaAspect:''},full:{mediaPreset:'full',mediaWidth:100,mediaHeight:320,mediaAspect:''},wide:{mediaPreset:'wide',mediaWidth:100,mediaHeight:0,mediaAspect:'16 / 9'},square:{mediaPreset:'square',mediaWidth:100,mediaHeight:0,mediaAspect:'1 / 1'},portrait:{mediaPreset:'portrait',mediaWidth:100,mediaHeight:0,mediaAspect:'9 / 16'},custom:{mediaPreset:'custom',mediaAspect:''}},style=presets[preset];if(!style)return;
 checkpoint();updateEditorElement(project,'home',element.id,{style,...(preset==='full'?{content:{fit:'cover'}}:{})});homePicker.refresh();changed();renderHomeElementPanel();
}
function moveHomeLayer(delta){const element=selectedHomeElement();if(!element)return;checkpoint();if(reorderEditorElement(project,'home',element.id,delta)){homePicker.refresh();changed();renderHomeElementPanel()}else history.pop()}
function renderHomeElementPanel(){
 const panel=$('#element-panel'),element=selectedHomeElement();if(!panel||!element){panel?.replaceChildren();return}selectedElementId=element.id;
 const node=homePicker?.elementNode(element.id),rect=node?.getBoundingClientRect(),style=element.style||{},layers=homeElements().slice().sort((a,b)=>b.zIndex-a.zIndex),position=layers.findIndex(item=>item.id===element.id),isCard=element.type==='card';
 const number=(key,fallback=0)=>Number.isFinite(Number(style[key]))?Number(style[key]):fallback,color=(key,fallback)=>/^#[0-9a-f]{6}$/i.test(style[key]||'')?style[key]:fallback;
 const tabs=[
  {id:'geometry',label:'ابعاد',content:`<div class="geometry-grid">${[['offsetX','X',number('offsetX')],['offsetY','Y',number('offsetY')],['width','عرض',number('width',Math.round(rect?.width||0))],['height','ارتفاع',number('height',Math.round(rect?.height||0))]].map(([key,label,value])=>`<label>${label}<input type="number" data-home-style="${key}" min="${key.startsWith('offset')?-800:40}" max="1600" step="1" value="${value}"></label>`).join('')}</div>`},
  {id:'appearance',label:'ظاهر',content:`<div class="field-row"><label class="field"><span>رنگ متن</span><input type="color" data-home-style="color" value="${color('color','#222225')}"></label><label class="field"><span>پس‌زمینه</span><input type="color" data-home-style="background" value="${color('background','#ffffff')}"></label></div>${isCard?`<div class="field-row"><label class="field"><span>رنگ Border</span><input type="color" data-home-style="borderColor" value="${color('borderColor','#e4e4e8')}"></label><label class="field"><span>ضخامت Border</span><input type="number" data-home-style="borderWidth" min="0" max="20" step="1" value="${number('borderWidth',1)}"></label></div><div class="geometry-grid">${[['borderRadius','Radius',number('borderRadius',24)],['padding','Padding',number('padding',18)],['gap','فاصله',number('gap',12)]].map(([key,label,value])=>`<label>${label}<input type="number" data-home-style="${key}" min="0" max="120" step="1" value="${value}"></label>`).join('')}</div>`:''}`},
  isCard&&{id:'media',label:'رسانه',content:`<label class="context-row"><span>اندازهٔ آماده</span><select data-home-media-preset>${[['default','پیش‌فرض'],['full','پر کردن قاب کارت'],['wide','افقی 16:9'],['square','مربع 1:1'],['portrait','عمودی 9:16'],['custom','دلخواه']].map(([value,label])=>`<option value="${value}" ${(style.mediaPreset||'default')===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="context-row"><span>نحوه نمایش</span><select data-home-content="fit"><option value="contain" ${(element.content.fit||'contain')==='contain'?'selected':''}>کامل · بدون برش</option><option value="cover" ${element.content.fit==='cover'?'selected':''}>پر کردن قاب · با برش</option><option value="fill" ${element.content.fit==='fill'?'selected':''}>کشیده‌شدن تا لبه‌ها</option></select></label><div class="geometry-grid"><label>عرض رسانه ٪<input type="number" data-home-style="mediaWidth" min="40" max="100" step="1" value="${number('mediaWidth',100)}"></label><label>ارتفاع رسانه px<input type="number" data-home-style="mediaHeight" min="0" max="700" step="1" value="${number('mediaHeight',0)}"></label></div><p class="hint">صفر برای ارتفاع یعنی اندازهٔ خودکار. با انتخاب «دلخواه» عرض و ارتفاع را مستقیم وارد کن.</p>`},
  {id:'layers',label:'لایه‌ها',content:`<div class="layer-actions"><button type="button" data-home-action="forward" ${position===0?'disabled':''}>Bring Forward</button><button type="button" data-home-action="backward" ${position===layers.length-1?'disabled':''}>Send Backward</button></div><div class="layer-list">${layers.map(layer=>`<button type="button" class="layer-item ${layer.id===element.id?'selected':''}" data-home-layer="${escapeText(layer.id)}"><span>${escapeText(homeElementLabel(layer))}</span><b>${layer.zIndex}</b></button>`).join('')}</div>`}
 ];
 panel.innerHTML=`<div class="element-panel-head"><span class="element-kind">${isCard?'کارت':'متن'}</span><div><strong>${escapeText(homeElementLabel(element))}</strong><small id="element-save-status" class="context-save">${escapeText($('#save-status').textContent)}</small></div></div>
 <div class="element-actions home-element-actions"><button type="button" data-home-action="undo" ${history.length?'':'disabled'}>Undo</button><button type="button" data-home-action="redo" ${future.length?'':'disabled'}>Redo</button></div>
 ${contextTabs(tabs)}`;
 panel.querySelectorAll('[data-home-style]').forEach(input=>input.onchange=()=>setHomeStyle(input.dataset.homeStyle,input.type==='color'?input.value:Number(input.value)));
 panel.querySelectorAll('[data-home-content]').forEach(input=>input.onchange=()=>setHomeContent(input.dataset.homeContent,input.value));
 panel.querySelector('[data-home-media-preset]')?.addEventListener('change',event=>setHomeMediaPreset(event.target.value));
 panel.onclick=event=>{const contextTab=event.target.closest('[data-context-tab]');if(contextTab){setInspectorTab(contextTab.dataset.contextTab);return}const layer=event.target.closest('[data-home-layer]');if(layer){selectHomeElement(layer.dataset.homeLayer);return}const action=event.target.closest('[data-home-action]')?.dataset.homeAction;if(action==='undo')$('#undo').click();else if(action==='redo')$('#redo').click();else if(action==='forward')moveHomeLayer(1);else if(action==='backward')moveHomeLayer(-1)};
 applyInspectorView();renderDecks();
}
function renderHomeInspector(){
 if(!project||!homePicker?.editing)return;richCleanup?.();richCleanup=null;const element=selectedHomeElement();if(!element)return;selectedElementId=element.id;homePicker.select(element.id);$('#editing-number').textContent='صفحهٔ اصلی';
 const form=$('#scene-form'),isCard=element.type==='card',adapter=isCard?{title:element.content.name,titleRuns:clone(element.content.nameRuns),titleFormat:clone(element.content.nameFormat||{}),description:element.content.description,textBlocks:[{id:'description',runs:clone(element.content.descriptionRuns),format:clone(element.content.descriptionFormat||{})}],textColor:element.style.color||'#222225',fontSize:20}:{title:element.content.text,titleRuns:clone(element.content.runs),titleFormat:clone(element.content.format||{}),description:'',textBlocks:[],textColor:element.style.color||'#222225',fontSize:element.role==='title'?52:13};
 form.innerHTML=`<p class="hint home-context-hint">${isCard?'عنوان و توضیح این کارت مستقل از سه کارت دیگر ذخیره می‌شود.':'این متن مستقل از کارت‌ها و سایر متن‌های صفحه ذخیره می‌شود.'}</p>${richEditorMarkup(adapter)}${isCard?`<hr class="editor-divider"><label class="field"><span>رسانهٔ کارت</span><select id="home-card-media">${project.library.map(media=>`<option value="${escapeText(media.src)}" ${media.src===element.content.image?'selected':''}>${escapeText(media.name)} · ${media.type==='video'?'ویدئو':'تصویر'}</option>`).join('')}${project.library.some(media=>media.src===element.content.image)?'':`<option value="${escapeText(element.content.image)}" selected>رسانهٔ فعلی</option>`}</select></label><button type="button" class="button upload-button" id="upload-home-media">${icon('upload')}انتخاب تصویر یا ویدئو از دستگاه</button><label class="field"><span>لینک مقصد کارت</span><select id="home-card-target">${project.decks.map(deck=>`<option value="${escapeText(deck.id)}" ${deck.id===element.content.target?'selected':''}>${escapeText(deck.name)}</option>`).join('')}</select><small class="hint">Navigation کارت پس از تغییر مقصد فعال می‌ماند.</small></label>`:''}`;
 form.dataset.family='text';
 if(isCard){const media=document.createElement('section');media.className='home-media-settings';media.append($('#home-card-media').closest('.field'),$('#upload-home-media'));const page=document.createElement('section');page.className='home-page-settings';page.append($('#home-card-target').closest('.field'));form.append(media,page);$('#home-card-target').querySelectorAll('option').forEach(option=>option.textContent=deckDisplayName(project,option.value))}
 form.querySelectorAll('[data-block-action="add"],[data-block-action="delete"],[data-block-action="split"],[data-block-action="up"],[data-block-action="down"],[data-block-action="select"]').forEach(button=>button.remove());
 if(!isCard)form.querySelectorAll('.text-block-heading,.text-block-editors').forEach(element=>element.remove());
 richCleanup=mountRichEditor(form,adapter,{checkpoint,onEdit:()=>{const patch=isCard?{name:adapter.title,nameRuns:clone(adapter.titleRuns),nameFormat:clone(adapter.titleFormat||{}),description:adapter.textBlocks[0]?.runs.map(run=>run.text).join('')||'',descriptionRuns:clone(adapter.textBlocks[0]?.runs||[]),descriptionFormat:clone(adapter.textBlocks[0]?.format||{})}:{text:adapter.title,runs:clone(adapter.titleRuns),format:clone(adapter.titleFormat||{})};updateEditorElement(project,'home',element.id,{content:patch});changed();renderHomeElementPanel()},onSelectBlock:()=>{},onStructure:()=>{},getExternalEditors:()=>homePicker.directEditors(element.id),externalRoots:[document]});
 if(isCard){$('#home-card-media').onchange=event=>{checkpoint();updateEditorElement(project,'home',element.id,{content:{image:event.target.value,fit:'cover'}});homePicker.refresh();changed();renderHomeElementPanel()};$('#home-card-target').onchange=event=>{checkpoint();updateEditorElement(project,'home',element.id,{content:{target:event.target.value}});homePicker.refresh();changed()};$('#upload-home-media').onclick=()=>uploadHomeMedia(element.id)}
 renderHomeElementPanel();
}
function renderInspector() {
  if (!project) return;
  if(homePicker?.editing){renderHomeInspector();return}
  richCleanup?.();richCleanup=null;
  const s = scene(), form = $('#scene-form'); $('#editing-number').textContent = `صفحهٔ ${fa(index + 1)}`;
  const textTab=textInspectorTab(tab);form.dataset.family=textTab?'text':tab;form.replaceChildren();
  prepareCanvasTextEditing();
  document.querySelectorAll('.editor-tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  if (textTab) {
    form.innerHTML = field('نام زیرصفحه در منوی بالا', 'label', s.label, 'text', 'maxlength="200"', 'نام همین زیرصفحه را تغییر بده؛ خودکار ذخیره می‌شود.') + `<div class="chapter-rename"><label class="field"><span>نام بخش برای همهٔ زیرصفحه‌ها</span><input id="chapter-name" maxlength="100" value="${escapeText(s.chapter)}"></label><button type="button" class="button" id="rename-chapter">تغییر نام بخش</button></div>` + field('انتقال این صفحه به بخش', 'chapter', s.chapter, 'text', 'maxlength="100"', 'صفحه‌های هم‌نام در منوی سمت راست زیر یک بخش قرار می‌گیرند.') + richEditorMarkup(s) + field('عبارت طلایی در عنوان', 'highlight', s.highlight, 'text', 'maxlength="1000"', 'همین عبارت را دقیقاً از عنوان وارد کن.') + select('قالب صفحه', 'layout', [['legacy','فلو اصلی اپ'],['split','متن و رسانه کنار هم'],['full','رسانهٔ تمام‌صفحه با متن'],['title','تیتر معرفی']], s.layout) + (s.layout === 'legacy' ? select('صحنهٔ اصلی اپ', 'legacyScene', project.decks.flatMap(d=>d.scenes).filter(x=>x.layout==='legacy'&&(x.legacyDeck||'previous')===(s.legacyDeck||'previous')).filter((x,i,list)=>list.findIndex(y=>y.legacyScene===x.legacyScene)===i).map(x => [String(x.legacyScene), `${fa(x.legacyScene + 1)} · ${x.label}`]) || Array.from({length:14}, (_, i) => [String(i), `صحنهٔ ${fa(i+1)}`]), String(s.legacyScene)) + '<p class="hint">متن کنار نمایشگر قابل ویرایش است. نوشته‌های داخل تصاویر اصلی اپ بخشی از تصویرند؛ برای تغییرشان تصویر را جایگزین کن.</p>' : '');
  } else if (tab === 'media') {
    const selected = project.library.find(m => m.src === s.media);
    form.innerHTML = (s.layout === 'legacy' ? '<p class="hint">انتخاب عکس یا ویدیو، این صفحه را به قالب «متن و رسانه کنار هم» تغییر می‌دهد. برای برگشت، قالب «فلو اصلی اپ» را انتخاب کن.</p><hr class="editor-divider">' : '') + '<div class="media-preview" id="current-media"></div><button type="button" class="button upload-button" id="upload-media">' + icon('upload') + 'انتخاب عکس یا ویدیو از دستگاه</button><p class="hint">PNG، JPG، WebP، GIF، MP4 یا WebM · حداکثر ۹۵ مگابایت</p><hr class="editor-divider">' + select('نمایش رسانهٔ اصلی', 'fit', [['contain','نمایش کامل · بدون برش'],['cover','پر کردن قاب · با برش'],['fill','کشیده‌شدن تا لبه‌ها']], s.fit) + field('جای رسانهٔ اصلی در قاب', 'position', s.position, 'range', 'min="0" max="100" step="1"') + `<label class="field checkbox"><input type="checkbox" data-key="loop" ${s.loop ? 'checked' : ''}><span>لوپ ویدیوی اصلی تا رفتن به صفحهٔ بعد</span></label>` + '<button type="button" id="choose-poster" class="text-button">انتخاب تصویر کاور ویدیو</button><button type="button" id="remove-media" class="text-button danger">حذف رسانهٔ اصلی از این صفحه</button><hr class="editor-divider"><h3 class="field-title">کتابخانهٔ رسانه</h3><div class="media-choices" id="media-library"></div>';
    const preview = $('#current-media');
    if (s.poster || s.media) { const isVideo = !s.poster && /\.(mp4|webm)$/i.test(s.media); const el = document.createElement(isVideo ? 'video' : 'img'); el.src = s.poster || s.media; if (isVideo) { el.muted = true; el.preload = 'metadata'; } else el.alt = ''; preview.append(el); const name = document.createElement('span'); name.className = 'media-name'; name.textContent = selected?.name || 'رسانهٔ فعلی'; preview.append(name); }
    else preview.innerHTML = icon(s.layout === 'legacy' ? 'phone' : 'picture');
    for (const m of project.library) { const b = document.createElement('button'); b.type = 'button'; b.className = 'media-choice' + (m.src === s.media ? ' selected' : ''); b.dataset.media = m.id; const img = document.createElement(m.poster || m.type === 'image' ? 'img' : 'video'); img.src = m.poster || m.src; if (img.tagName === 'VIDEO') { img.muted = true; img.preload = 'metadata'; } else { img.alt = ''; img.loading = 'lazy'; } const caption = document.createElement('span'); caption.textContent = m.name; b.append(img, caption); $('#media-library').append(b); }
    $('#upload-media').onclick = () => uploadDialog(false); $('#choose-poster').onclick = () => uploadDialog(true);
    $('#remove-media').onclick = () => { checkpoint(); scene().media = ''; scene().poster = ''; setPlaying(false); renderStage(); renderInspector(); renderList(); changed(); };
  } else if (['motion','appearance'].includes(tab)) {
    const pageTransition=project.editor?.settings?.playback?.transition||DEFAULT_PAGE_TRANSITION;
    form.innerHTML=`<h3 class="field-title">انتقال بین صفحه‌ها · همهٔ بخش‌ها</h3><label class="field"><span>مدل ترنزیشن</span><select data-page-transition="type">${[['none','بدون ترنزیشن'],['fade','محو آرام'],['slide','حرکت افقی'],['wipe','پرده‌ای']].map(([value,label])=>`<option value="${value}" ${value===pageTransition.type?'selected':''}>${label}</option>`).join('')}</select></label><label class="field"><span>مدت ترنزیشن (ثانیه)</span><input type="number" data-page-transition="duration" min="0.1" max="3" step="0.05" value="${pageTransition.duration}"></label><button type="button" class="button" id="preview-page-transition">پیش‌نمایش ترنزیشن</button><p class="hint">برای رفتن دستی و خودکار به صفحهٔ بعد اعمال می‌شود. صفحه‌های دارای ویدیو تا پایان ویدیو صبر می‌کنند.</p><hr class="editor-divider">`;
    form.querySelectorAll('[data-page-transition]').forEach(input=>input.onchange=()=>{
      if(!input.checkValidity())return;
      checkpoint();project.editor.settings||={};project.editor.settings.playback||={};
      project.editor.settings.playback.transition={...DEFAULT_PAGE_TRANSITION,...project.editor.settings.playback.transition,[input.dataset.pageTransition]:input.type==='number'?Number(input.value):input.value};
      changed();playPageTransition($('#scene-canvas'),project.editor.settings.playback.transition,{reduce});
    });
    form.querySelector('#preview-page-transition').onclick=()=>playPageTransition($('#scene-canvas'),project.editor?.settings?.playback?.transition||DEFAULT_PAGE_TRANSITION,{reduce});
    const sceneControls=document.createElement('div');sceneControls.className='scene-motion-settings';
    sceneControls.innerHTML = select('پس‌زمینه و نمایش رسانه','presentationStyle',[['reference','همراه با مرجع · خطوط طلایی متحرک'],['plain','ساده · رنگ انتخابی']],s.presentationStyle||'plain')+field('مدت انیمیشن صفحه (ثانیه)', 'duration', s.duration, 'number', 'min="1" max="180" step="0.1"') + select('ورود محتوای صفحه', 'transition', [['fade','محو آرام'],['reveal','آشکار شدن سینمایی'],['slide','حرکت افقی'],['none','بدون افکت']], s.transition) + field('شدت حرکت', 'intensity', s.intensity, 'range', 'min="0" max="1" step="0.05"', 'حرکت کم برای خواندن متن و نمایش محصول مناسب‌تر است.') + '<hr class="editor-divider">' + field('اندازهٔ عنوان', 'fontSize', s.fontSize, 'range', 'min="20" max="64" step="1"') + '<div class="field-row">' + field('رنگ متن', 'textColor', s.textColor, 'color') + field('رنگ تأکید', 'accent', s.accent, 'color') + '</div>' + field('رنگ زمینه', 'background', s.background, 'color') + (s.layout === 'legacy' ? '<p class="hint">انیمیشن داخلی فلو اپ همان نسخهٔ اصلی است؛ تنظیم افکت ورود محتوا برای قالب‌های رسانه‌ای اعمال می‌شود.</p>' : '') + '<p class="hint">در حالت کاهش حرکت سیستم، حرکت ترنزیشن کاهش می‌یابد. ویدیوها خودکار و بی‌صدا شروع می‌شوند.</p>';
    const appearance=document.createElement('section');appearance.className='scene-appearance-settings';
    for(const child of [...sceneControls.children])if(child.querySelector('[data-key="presentationStyle"],[data-key="fontSize"],[data-key="textColor"],[data-key="accent"],[data-key="background"]'))appearance.append(child);
    form.append(sceneControls,appearance);
  }
  if(textTab){const metadata=document.createElement('section');metadata.className='scene-page-settings';for(const child of [...form.children])if(!child.classList.contains('word-section'))metadata.append(child);form.append(metadata)}
  if(textTab)$('#rename-chapter').onclick=()=>{const value=$('#chapter-name').value;try{const copy=clone(deck());renameChapter(copy,s.chapter,value);if(value.trim()===s.chapter)return;checkpoint();renameChapter(deck(),s.chapter,value);renderStage();renderFlow();renderList();renderInspector();changed();toast('نام بخش و همهٔ زیرصفحه‌هایش تغییر کرد.')}catch(error){toast(error.message,true)}};
  if(textTab)richCleanup=mountRichEditor(form,s,{checkpoint,onEdit:({structure}={})=>{if(structure)refreshText();renderList();renderFlow();renderHandles();changed();renderElementPanel()},onSelectBlock:id=>{activeTextBlockId=id;const element=sceneElements().find(value=>id?value.binding.field==='textBlock'&&value.binding.itemId===id:value.binding.field==='title');if(element)selectElement(element.id,{switchTab:false})},onStructure:id=>{activeTextBlockId=id;renderInspector();requestAnimationFrame(()=>$('#scene-form [data-word-id="'+id+'"]')?.focus())},getExternalEditors:directTextEditors,externalRoots:directTextDocuments()});
  if(textTab){
   if(s.table){const heading=document.createElement('h3');heading.textContent='جدول مسئولیت‌ها · ویرایش هر سلول';form.append(heading);const grid=document.createElement('div');grid.className='table-editor';[s.table.columns,...s.table.rows].forEach((row,ri)=>row.forEach((value,ci)=>{const input=document.createElement('input');input.value=value;input.maxLength=ri?500:200;input.setAttribute('aria-label',`جدول ردیف ${ri+1} ستون ${ci+1}`);input.onfocus=()=>checkpoint();input.oninput=()=>{row[ci]=input.value;refreshText();changed()};grid.append(input)}));form.append(grid)}
  }
  if(tab==='media')mountExtraInspector(form,s);
  if(tab==='appearance'){const button=document.createElement('button');button.type='button';button.className='button';button.textContent='اعمال این پس‌زمینه به همهٔ صفحه‌ها';button.onclick=()=>{checkpoint();for(const d of project.decks)for(const page of d.scenes){page.background=s.background;page.presentationStyle=s.presentationStyle||'reference'}renderStage();changed();toast('پس‌زمینهٔ همهٔ صفحه‌ها یکسان شد.')};form.append(button)}
  if(tab==='geometry'||textTab){form.insertAdjacentHTML('beforeend','<section class="page-layout-tools"><p class="hint">متن را با دستگیره جابه‌جا کن. Shift هنگام کشیدن، Snap را موقتاً خاموش می‌کند.</p><button type="button" id="reset-placement" class="text-button">بازنشانی چیدمان این صفحه</button></section>');$('#reset-placement').onclick=()=>{checkpoint();delete scene().placement;for(const b of [...(scene().textBlocks||[]),...(scene().mediaItems||[])])delete b.placement;legacyBoxes={};renderStage();changed();};}
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
  applyElementLayers();renderElementPanel();
}

$('#scene-form').addEventListener('submit', e => e.preventDefault());
$('#scene-form').addEventListener('click', e => {
  const b = e.target.closest('[data-media]'); if (!b) return; const m = project.library.find(x => x.id === b.dataset.media); if (!m) return;
  if($('#media-insert-mode')?.value==='add'||activeMediaItemId){checkpoint();if($('#media-insert-mode')?.value==='add'){if(!addMediaItem(scene(),m))return}else if(activeMediaItemId){const item=scene().mediaItems?.find(x=>x.id===activeMediaItemId);if(item)Object.assign(item,{media:m.src,poster:m.poster,name:m.name})}renderStage();renderInspector();changed();return}
  checkpoint(); Object.assign(scene(), { media:m.src, poster:m.poster }); if (['legacy','title'].includes(scene().layout)) scene().layout = 'split'; setPlaying(true); elapsed = 0; renderStage(true); renderInspector(); renderList(); changed();
});
$('.editor-tabs').addEventListener('mousedown',e=>{if(e.target.closest('[data-tab]'))e.preventDefault()});
$('.editor-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) setInspectorTab(b.dataset.tab); });
$('.editor-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const buttons=[...e.currentTarget.querySelectorAll('[data-tab]')].filter(button=>!button.hidden),current=buttons.indexOf(e.target),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(current+(e.key==='ArrowLeft'?1:-1)+buttons.length)%buttons.length;buttons[next].click();buttons[next].focus()});

$('#deck-select').onchange = () => { checkpoint(); deckId = $('#deck-select').value;const url=new URL(location.href);url.searchParams.set('deck',deckId);window.history.replaceState(null,'',url); project.activeDeck = deckId; index = 0; sceneSignature = ''; renderDecks(); choose(0, false); changed(); };
$('#toggle-edit').onclick = () => { editMode(!document.body.classList.contains('editing')); };
$('#play').onclick = () => { setPlaying(!playing); };
$('#prev').onclick = () => choose(index - 1); $('#next').onclick = () => choose(index + 1); $('#restart').onclick = () => {seek(0);setPlaying(true)};
$('#add-scene').onclick = () => { if (deck().scenes.length >= 200) return toast('هر پروژه حداکثر ۲۰۰ صفحه دارد.', true); checkpoint(); deck().scenes.splice(index + 1, 0, blankScene()); choose(index + 1, false); tab = 'content'; renderInspector(); changed(); };
function addSubpage(chapter){
 if(deck().scenes.length>=200)return toast('هر پروژه حداکثر ۲۰۰ صفحه دارد.',true);
 checkpoint();const siblings=deck().scenes.map((s,i)=>({s,i})).filter(({s})=>s.chapter===chapter),after=siblings.at(-1).i+1;
 const current=scene(),page={...blankScene(),chapter,label:`زیرصفحهٔ ${fa(siblings.length+1)}`,background:current.background,textColor:current.textColor,accent:current.accent,presentationStyle:current.presentationStyle||'plain'};
 deck().scenes.splice(after,0,page);tab='page';choose(after);changed();
 requestAnimationFrame(()=>{$('#scene-form [data-key="label"]')?.focus()});
}
$('#duplicate').onclick = () => { if (deck().scenes.length >= 200) return toast('هر پروژه حداکثر ۲۰۰ صفحه دارد.', true); checkpoint(); const copy = clone(scene()); copy.id = `page-${crypto.randomUUID()}`; copy.label = `${copy.label} · کپی`.slice(0,200); deck().scenes.splice(index + 1, 0, copy); choose(index + 1, false); changed(); };
$('#delete').onclick = () => { if (deck().scenes.length <= 1) return; checkpoint(); deck().scenes.splice(index, 1); choose(Math.min(index, deck().scenes.length - 1), false); changed(); toast('صفحه حذف شد؛ با «برگرداندن تغییر» قابل بازیابی است.'); };
for (const [id, delta] of [['move-up',-1],['move-down',1]]) $('#' + id).onclick = () => { const target = index + delta; if (target < 0 || target >= deck().scenes.length) return; checkpoint(); const [s] = deck().scenes.splice(index, 1); deck().scenes.splice(target, 0, s); choose(target, false); changed(); };
function restore(value) { project = value; deckId = project.activeDeck; index = Math.min(index, deck().scenes.length - 1); renderDecks();if(homePicker?.editing){syncProjectEditor(project);homePicker.refresh();renderHomeInspector();changed()}else{choose(index, false);changed()} }
$('#undo').onclick = () => { if (history.length) { future.push(clone(project)); restore(history.pop()); } };
$('#redo').onclick = () => { if (future.length) { history.push(clone(project)); restore(future.pop()); } };

async function save({automatic=false}={}) {
  clearTimeout(autoSaveTimer); autoSaveTimer=null;
  if (saving) return;
  try {
    validateProject(project);
    if (!backend) { localStorage.setItem('talacard-static-project-v1', JSON.stringify(project)); savedJSON = JSON.stringify(project); changed(); if(!automatic)toast('در این مرورگر ذخیره شد. اتصال انتشار آنلاین در این نسخه فعال نیست.'); return; }
    saving = true; updateStatus();let attempts=0;
    for(;;){
      syncProjectEditor(project);const snapshot=clone(project);validateProject(snapshot);
      const response=await accessFetch('/api/project',{method:'PUT',headers:{'Content-Type':'application/json','X-TalaCard-Studio':'1'},body:JSON.stringify({project:snapshot,revision})});
      const result=await response.json();
      if(response.status===409&&attempts<3){
        const latestResponse=await accessFetch('/api/project',{cache:'no-store'});if(!latestResponse.ok)throw Error('دریافت نسخهٔ جدید انجام نشد؛ دوباره ذخیره کن.');
        const latest=await latestResponse.json(),merged=reconcileProjects(JSON.parse(savedJSON),project,validateProject(latest.project));
        if(merged.conflicts.length){autoSaveBlocked=true;throw Error('یک بخش از محتوا در دو پنجره هم‌زمان تغییر کرده است. تغییرات این پنجره حفظ شده؛ از گزینه‌های پروژه فایل JSON را دریافت کن تا نسخه‌ها بررسی شوند.');}
        validateProject(merged.project);const selected=scene().id;applyProjectInPlace(project,merged.project);revision=latest.revision;savedJSON=JSON.stringify(latest.project);attempts++;
        if(!project.decks.some(d=>d.id===deckId))deckId=project.activeDeck;
        index=Math.max(0,deck().scenes.findIndex(s=>s.id===selected));renderDecks();renderList();renderFlow();renderStage();
        if(!document.activeElement?.closest('#scene-form')||scene().id!==selected)renderInspector();
        autoSaveBlocked=false;draft();continue;
      }
      if(!response.ok){if(response.status===409)autoSaveBlocked=true;throw Error(result.error||'ذخیره انجام نشد.');}
      revision=result.revision;savedJSON=JSON.stringify(snapshot);autoSaveBlocked=false;localSaveError=false;draft();readSyncStatus();
      if(!automatic)toast(hostedStorage?'روی سایت ذخیره شد.':'روی دستگاه ذخیره شد؛ لینک عمومی خودکار به‌روز می‌شود.');break;
    }

  } catch (e) { localSaveError=true; if(!automatic||autoSaveBlocked)toast(e.message || 'ذخیره انجام نشد؛ دوباره تلاش می‌شود.', true); if(!autoSaveBlocked)autoSaveTimer=setTimeout(()=>save({automatic:true}),5000); }
  finally { saving = false; updateStatus(); if(dirty()&&!autoSaveBlocked&&!autoSaveTimer)scheduleAutoSave(); }
}
$('#save').onclick = () => {save();if(backend)accessFetch('/api/sync/retry',{method:'POST',headers:{'X-TalaCard-Studio':'1'}}).catch(()=>{});};
function downloadJSON() { const blob = new Blob([JSON.stringify(project, null, 2) + '\n'], { type:'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'talacard-project.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); }
$('#export-json').onclick = () => { downloadJSON(); closeMenu(); };
$('#import-json').onclick = () => { $('#json-file').value = ''; $('#json-file').click(); closeMenu(); };
$('#json-file').onchange = async () => {
  const file = $('#json-file').files[0]; if (!file) return;
  try { if (file.size > 2 * 1024 * 1024) throw new Error('فایل پروژه باید کوچک‌تر از ۲ مگابایت باشد.'); const incoming = ensureEditableProject(validateProject(JSON.parse(await file.text()))); checkpoint(); project = incoming; deckId = project.activeDeck; renderDecks(); choose(0, false); changed(); toast('پروژه بارگذاری شد. مسیر رسانه‌ها باید در پوشهٔ پروژه موجود باشد؛ برای ثبت، ذخیره را بزن.'); }
  catch (e) { toast(e instanceof SyntaxError ? 'فایل JSON قابل خواندن نیست.' : e.message, true); }
};
let uploadTarget;
function uploadDialog(poster,append=false) {
  if (!backend) return toast('برای افزودن فایل، نسخهٔ محلی را با node server.mjs اجرا کن.', true);
  uploadTarget = { deckId, sceneId:scene().id, poster, append, itemId:activeMediaItemId }; $('#media-file').accept = poster ? 'image/png,image/jpeg,image/webp,image/gif' : 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm'; $('#media-file').multiple=!poster;$('#media-file').value = ''; $('#media-file').click();
}
function uploadHomeMedia(elementId){
 if(!backend)return toast('برای افزودن فایل، نسخهٔ محلی را با node server.mjs اجرا کن.',true);
 uploadTarget={homeElementId:elementId};$('#media-file').accept='image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm';$('#media-file').multiple=false;$('#media-file').value='';$('#media-file').click();
}
$('#media-file').onchange = async () => {
  const files=[...$('#media-file').files];if(!files.length||!uploadTarget)return;const target={...uploadTarget};
  if(!target.homeElementId&&(target.append?files.length:Math.max(0,files.length-1))+(scene().mediaItems?.length||0)>12)return toast('هر صفحه حداکثر ۱۲ رسانهٔ اضافه دارد.',true);
  for(const [fileIndex,file] of files.entries()){try {
    if (file.size > 95 * 1024 * 1024) throw new Error('حجم رسانه باید کمتر از ۹۵ مگابایت باشد.');
    toast('در حال کپی رسانه به پوشهٔ پروژه…');
    const uploadHeaders={'Content-Type':file.type,'X-TalaCard-Studio':'1','X-Upload-Length':String(file.size)};if(hostedStorage)uploadHeaders['X-Asset-Hash']=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
    const r=await accessFetch('/api/media',{method:'POST',headers:uploadHeaders,body:file}); const value = await r.json(); if (!r.ok) throw new Error(value.error || 'رسانه ذخیره نشد.');
    const targetScene = project.decks.find(d => d.id === target.deckId)?.scenes.find(s => s.id === target.sceneId);
    checkpoint(); project.library.push({ ...value, name:file.name.slice(0,200), originalName:file.name.slice(0,500) });
    if(target.homeElementId){updateEditorElement(project,'home',target.homeElementId,{content:{image:value.src,fit:'cover'}});homePicker.refresh();renderHomeInspector()}
    else if (targetScene) { if(target.itemId){const item=targetScene.mediaItems?.find(m=>m.id===target.itemId);if(item){if(target.poster)item.poster=value.src;else Object.assign(item,{media:value.src,poster:value.poster,name:file.name.slice(0,200)})}target.itemId=null}else if(target.append||fileIndex>0){addMediaItem(targetScene,{...value,name:file.name.slice(0,200)})}else if (target.poster) targetScene.poster = value.src; else { targetScene.media = value.src; targetScene.poster = value.poster; if (['legacy','title'].includes(targetScene.layout)) targetScene.layout = 'split'; } }
    if(!target.homeElementId){setPlaying(true);renderStage(true);renderInspector();renderList()}changed();toast('رسانه اضافه شد؛ برای ثبت انتخاب، پروژه را ذخیره کن.');
  } catch (e) { toast(e.message || 'افزودن فایل انجام نشد.', true);break; }}
};

function closeMenu() { $('#project-menu').hidden = true; $('#more').setAttribute('aria-expanded','false'); }
$('#more').onclick = () => { $('#project-menu').hidden = !$('#project-menu').hidden; $('#more').setAttribute('aria-expanded', String(!$('#project-menu').hidden)); };
document.addEventListener('click', e => { if (!e.target.closest('#more') && !e.target.closest('#project-menu')) closeMenu(); });
$('#show-help').onclick = () => { $('#help').showModal(); closeMenu(); }; $('#close-help').onclick = () => $('#help').close();
async function fullscreen() { closeMenu(); try { await $('#stage').requestFullscreen(); document.body.classList.add('presenting'); resizeStage(); toast('فاصله: پخش/توقف · کلیدهای جهت: صفحهٔ بعد/قبل · Esc: خروج'); } catch { toast('نمایش تمام‌صفحه در این مرورگر فعال نیست؛ از «نمایش ارائه» استفاده کن.', true); } }
$('#fullscreen').onclick = fullscreen; $('#present').onclick = fullscreen;
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.body.classList.remove('presenting'); resizeStage(); });
document.addEventListener('keydown', e => {
  if (!project||homePicker?.visible) return;
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
    const access=await mountAccess({editor:true});hostedStorage=access.storage==='cloud';
    let result;
    try { const r = await accessFetch('/api/project'); if (!r.ok) throw new Error(); result = await r.json(); if (!result.project) throw new Error(); }
    catch { backend = false; const r = await fetch('/default-content.json'); if (!r.ok) throw new Error('فایل محتوای پروژه پیدا نشد.'); const baseline = validateProject(await r.json()); result = { project:baseline, revision:'static' }; try { const stored = localStorage.getItem('talacard-static-project-v1'); if (stored) result.project = validateProject(JSON.parse(stored)); } catch {} }
    project = ensureEditableProject(validateProject(result.project)); revision = result.revision; savedJSON = JSON.stringify(project);
    try {
      const recovered=JSON.parse(localStorage.getItem('talacard-draft-v1')||'null');
      if(recovered){
        if(recovered.revision===revision){project=validateProject(recovered.project);toast('تغییرات ذخیره‌نشدهٔ قبلی از مرورگر بازیابی شد.');}
        else if(recovered.baseProject){
          const merged=reconcileProjects(recovered.baseProject,validateProject(recovered.project),project);
          if(!merged.conflicts.length){project=validateProject(merged.project);toast('تغییرات ذخیره‌نشده با نسخهٔ جدید ادغام شد.');}
          else{project=validateProject(recovered.project);savedJSON=JSON.stringify(validateProject(recovered.baseProject));revision=recovered.revision;autoSaveBlocked=true;toast('تغییرات قبلی حفظ شده‌اند؛ یک بخش در دو نسخه تغییر کرده است. از گزینه‌های پروژه خروجی JSON بگیر.',true);}
        }
      }
    }catch{}

    const requested=new URL(location.href).searchParams.get('deck');deckId=project.decks.some(d=>d.id===requested)?requested:project.activeDeck;renderDecks();editMode(location.hash === '#edit');choose(0,false);updateStatus();setupHome();
    readSyncStatus(); syncPoll=setInterval(readSyncStatus,2500);scheduleAutoSave();
    previousFrame = performance.now(); requestAnimationFrame(tick);
  } catch (e) { $('#save-status').textContent = 'خطا در بارگذاری'; $('#scene-canvas').textContent = 'پروژه بارگذاری نشد. فایل content.json و اجرای سرور را بررسی کنید.'; toast(e.message, true); }
}
function preserveSessionDraft(){if(project&&dirty())try{localStorage.setItem('talacard-draft-v1',JSON.stringify({revision,project,baseProject:JSON.parse(savedJSON)}))}catch{}}
window.addEventListener('talacard-before-logout',preserveSessionDraft);
window.addEventListener('talacard-session-expired',()=>{clearTimeout(autoSaveTimer);autoSaveBlocked=true;preserveSessionDraft()});
init();

function canvasElement(){return $('#scene-canvas');}
$('#loop-video').onchange=()=>{checkpoint(); scene().loop=$('#loop-video').checked;const v=$('#scene-canvas video');if(v){v.loop=scene().loop;if(playing && v.ended){v.currentTime=0;playVideo(v)}}renderInspector();changed();};
$('#autoplay').onchange=()=>{checkpoint();setAutoplay($('#autoplay').checked);renderFlow();};

// Handles live in the scaled design canvas, so pointer deltas remain accurate
// at editor zoom, on touch screens, and in fullscreen. One gesture = one undo.
let legacyBoxes = {}, activeGesture;
function currentBox(kind) {
  const canvas=canvasElement();
  if(kind.startsWith('extra:')){const i=(scene().mediaItems||[]).findIndex(m=>m.id===kind.slice(6));return i<0?null:mediaItemBox(canvas,scene().mediaItems[i],i)}
  if(kind.startsWith('text:')){const id=kind.slice(5),block=textBlocks(scene()).find(b=>b.id===id),el=canvas.querySelector('[data-text-block="'+id+'"]');return block?.placement?.[placementMode(canvas)] || (frame?legacyBoxes[kind]:el?readPlacement(canvas,el):null)}
  const el=canvas.querySelector('.scene-'+kind);
  return scene().placement?.[placementMode(canvas)]?.[kind] || (frame ? legacyBoxes[kind] : el ? readPlacement(canvas,el) : null);
}
function writeBox(kind,box) {
  const canvas=canvasElement(),mode=placementMode(canvas);
  if(kind.startsWith('extra:')){const item=scene().mediaItems?.find(m=>m.id===kind.slice(6));if(!item)return;item.placement||={};item.placement[mode]=box;renderMediaItems(canvas,scene(),{playing,reduce});
  }else if(kind.startsWith('text:')){
   const block=ensureTextBlocks(scene()).find(b=>b.id===kind.slice(5));if(!block)return;block.placement||={};block.placement[mode]=box;syncDescription(scene());
   if(frame)sendLegacy('text',{scene:scene()});else {const content=canvas.querySelector('.scene-content');renderDescription(content,content.querySelector('.scene-description'),scene(),mode);prepareCanvasTextEditing()}
  }else{
   scene().placement||={};scene().placement[mode]||={};scene().placement[mode][kind]=box;
   if(frame)sendLegacy('placement',{placement:scene().placement[mode]});else applyPlacement(canvas,scene());paintBackdrop(canvas,scene(),elapsed,reduce);
  }
  positionHandle(kind,box);applyElementLayers();
}
function positionHandle(kind,box) {
  const el=canvasElement().querySelector(`.placement-handle[data-kind="${kind}"]`); if(!el)return;
  Object.assign(el.style,{left:box.x+'%',top:box.y+'%',width:box.w+'%',height:box.h+'%'});
}
function clearSmartGuides(){canvasElement().querySelectorAll('.smart-guide').forEach(element=>element.remove())}
function renderSmartGuides(guides=[]){
  clearSmartGuides();const canvas=canvasElement();for(const guide of guides){const element=document.createElement('div');element.className='smart-guide '+(guide.axis==='x'?'vertical':'horizontal');element.setAttribute('aria-hidden','true');if(guide.axis==='x')element.style.left=guide.position+'%';else element.style.top=guide.position+'%';canvas.append(element)}
}
function renderTextGrid(){
 const canvas=canvasElement();canvas.querySelectorAll('.text-placement-grid').forEach(element=>element.remove());
 const selected=selectedElement();if(!selected||selected.type!=='richText'||!placementSettings().grid.visible)return;
 const box=currentBox(kindForElement(selected));if(!box)return;
 const grid=document.createElement('div');grid.className='text-placement-grid';grid.style.setProperty('--text-grid-size',placementSettings().grid.size+'px');Object.assign(grid.style,{left:box.x+'%',top:box.y+'%',width:box.w+'%',height:box.h+'%'});grid.setAttribute('aria-hidden','true');canvas.append(grid);
}
const textPlacementKind=kind=>kind==='copy'||kind.startsWith('text:');
function placementSettings(){return resolvePlacementSettings(project.editor?.settings?.placement)}
function alignmentBoxes(activeKind){
  const mode=placementMode(canvasElement()),kinds=['copy','media',...(scene().mediaItems||[]).map(item=>'extra:'+item.id),...(scene().textBlocks||[]).filter(block=>block.placement?.[mode]).map(block=>'text:'+block.id)];
  return kinds.filter(kind=>kind!==activeKind).map(currentBox).filter(Boolean);
}
function renderHandles() {
  const canvas=canvasElement(); if(!project || activeGesture)return;
  canvas.querySelectorAll('.placement-handle').forEach(el=>el.remove());clearSmartGuides();canvas.querySelectorAll('.text-placement-grid').forEach(el=>el.remove());
  if(!document.body.classList.contains('editing'))return;
  renderTextGrid();
  for(const kind of ['copy','media',...(scene().mediaItems||[]).map(m=>'extra:'+m.id),...(activeTextBlockId?['text:'+activeTextBlockId]:[])]) {
    const raw=currentBox(kind); if(!raw)continue; const box=adjustBox(raw,0,0);
    const handle=document.createElement('div');handle.className='placement-handle';handle.classList.toggle('selected',elementForKind(kind)?.id===selectedElementId);handle.dataset.kind=kind;
    const label=kind==='copy'?'عنوان و متن':kind==='media'?'رسانه':kind.startsWith('extra:')?'رسانهٔ '+fa(scene().mediaItems.findIndex(m=>m.id===kind.slice(6))+2):'باکس متن';
    const move=document.createElement('button');move.type='button';move.className='move-handle';move.textContent='جابه‌جایی '+label;move.setAttribute('aria-label','جابه‌جایی '+label);move.dataset.action='move';
    const size=document.createElement('button');size.type='button';size.className='resize-handle';size.setAttribute('aria-label','تغییر اندازهٔ '+label+(textPlacementKind(kind)?'':' · Option/Alt برای حفظ نسبت'));size.title=textPlacementKind(kind)?'تغییر اندازه':'Option/Alt را نگه دارید تا نسبت تصویر حفظ شود';size.dataset.action='resize';
    handle.append(move,size);canvas.append(handle);positionHandle(kind,box);
  }
}
canvasElement().addEventListener('pointerdown',e=>{
  const button=e.target.closest('.placement-handle button');if(!button||e.button!==0)return;
  e.preventDefault();const kind=button.parentElement.dataset.kind, box=currentBox(kind);if(!box)return;
  const element=elementForKind(kind);if(element){selectedElementId=element.id;button.parentElement.classList.add('selected');renderElementPanel()}
  checkpoint();stageAnimations.forEach(a=>{try{a.finish()}catch{}});
  activeGesture={kind,start:adjustBox(box,0,0),x:e.clientX,y:e.clientY,resize:button.dataset.action==='resize',button,pointer:e.pointerId,sceneId:scene().id};
  button.setPointerCapture(e.pointerId);document.body.classList.add('placing');
});
canvasElement().addEventListener('pointermove',e=>{
  const g=activeGesture;if(!g||g.pointer!==e.pointerId||scene().id!==g.sceneId)return;
  const canvas=canvasElement(),rect=canvas.getBoundingClientRect(),dx=(e.clientX-g.x)/rect.width*100,dy=(e.clientY-g.y)/rect.height*100;
  if(g.resize){const media=!textPlacementKind(g.kind),modifier=placementSettings().media.preserveAspectModifier,locked=elementForKind(g.kind)?.style?.preserveAspect,preserve=media&&(locked||modifier==='always'||(modifier==='alt'&&e.altKey));writeBox(g.kind,resizeBox(g.start,dx,dy,preserve));renderSmartGuides([]);return}
  const moved=adjustBox(g.start,dx,dy),result=textPlacementKind(g.kind)?snapTextMove(moved,alignmentBoxes(g.kind),{width:canvas.offsetWidth,height:canvas.offsetHeight},placementSettings(),e.shiftKey):{box:moved,guides:[]};
  writeBox(g.kind,result.box);renderSmartGuides(result.guides);
});
function finishGesture(e) {
  if(!activeGesture||activeGesture.pointer!==e.pointerId)return;
  const g=activeGesture;activeGesture=null;document.body.classList.remove('placing');
  if(g.button.hasPointerCapture(e.pointerId))g.button.releasePointerCapture(e.pointerId);
  clearSmartGuides();changed();renderHandles();
}
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvasElement().addEventListener(event,finishGesture);
canvasElement().addEventListener('keydown',e=>{
  const button=e.target.closest('.placement-handle button');if(!button||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();e.stopPropagation();const kind=button.parentElement.dataset.kind,box=currentBox(kind);if(!box)return;
  checkpoint();const dx=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,dy=e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0;
  writeBox(kind,adjustBox(box,dx,dy,e.shiftKey||button.dataset.action==='resize'));changed();
});

function refreshText(){
 if(frame){sendLegacy('text',{scene:scene()});return}
 const canvas=canvasElement(),content=canvas.querySelector('.scene-content');if(!content)return;
 renderTitle(content.querySelector('h2'),scene());renderDescription(content,content.querySelector('.scene-description'),scene(),placementMode(canvas));prepareCanvasTextEditing();renderHandles();
}
function mountMediaEffects(form,s){
 const fx={...DEFAULT_EFFECT,...s.mediaEffect};const area=document.createElement('section');area.className='media-effects';
 area.innerHTML='<h3 class="field-title">افکت رسانه</h3>'+select('نوع افکت','effect-type',[['none','بدون افکت'],['zoom-in','زوم به داخل'],['zoom-out','زوم به بیرون'],['zoom-in-out','زوم رفت و برگشت'],['pan-left','حرکت به چپ'],['pan-right','حرکت به راست'],['pan-up','حرکت به بالا'],['pan-down','حرکت به پایین'],['fade-in','آشکار شدن آرام'],['blur-in','از محو به واضح']],fx.type)+field('مدت افکت (ثانیه)','effect-duration',fx.duration,'number','min="0.2" max="120" step="0.1"')+field('شروع پس از (ثانیه)','effect-delay',fx.delay,'number','min="0" max="60" step="0.1"')+field('شدت افکت (درصد)','effect-amount',fx.amount,'number','min="1" max="60" step="1"')+select('شتاب حرکت','effect-easing',[['ease-out','پایان آرام'],['ease-in-out','شروع و پایان آرام'],['linear','سرعت ثابت']],fx.easing)+`<label class="field checkbox"><input type="checkbox" data-effect="repeat" ${fx.repeat?'checked':''}><span>تکرار افکت</span></label><button type="button" class="button" id="replay-effect">بازپخش افکت</button><p class="hint">افکت روی عکس یا ویدیو اعمال می‌شود. زمان و تکرار افکت از لوپ ویدیو مستقل است.</p>`;
 const divider=form.querySelector('.editor-divider');if(divider)divider.before(area);else form.append(area);
 area.querySelectorAll('[data-key]').forEach(el=>{el.dataset.effect=el.dataset.key.replace('effect-','');delete el.dataset.key});
 area.querySelectorAll('[data-effect]').forEach(el=>el.addEventListener('input',()=>{
  const key=el.dataset.effect;const value=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;
  if(el.type==='number'&&(!el.value||!Number.isFinite(value)||value<Number(el.min)||value>Number(el.max)))return;
  checkpoint();s.mediaEffect={...DEFAULT_EFFECT,...s.mediaEffect,[key]:value};applyMediaEffect(activeMediaItemId?canvasElement().querySelector('[data-media-item="'+activeMediaItemId+'"]'):canvasElement(),s,{playing:true,restart:true,reduce});setPlaying(true);changed();
 }));
 area.querySelector('#replay-effect').onclick=()=>{applyMediaEffect(activeMediaItemId?canvasElement().querySelector('[data-media-item="'+activeMediaItemId+'"]'):canvasElement(),s,{playing:true,restart:true,reduce});setPlaying(true)};
}
canvasElement().addEventListener('click',e=>{const elementNode=e.target.closest('[data-editor-element]');if(elementNode){selectElement(elementNode.dataset.editorElement);return}const block=e.target.closest('[data-text-block]');if(block){activeTextBlockId=block.dataset.textBlock;const element=sceneElements().find(value=>value.binding.field==='textBlock'&&value.binding.itemId===activeTextBlockId);if(element)selectElement(element.id)}});

function addMediaItem(s,media){
 s.mediaItems||=[];if(s.mediaItems.length>=12){toast('هر صفحه حداکثر ۱۲ رسانهٔ اضافه دارد.',true);return false}
 s.mediaItems.push({id:'media-'+crypto.randomUUID(),name:media.name||'رسانهٔ اضافه',media:media.src,poster:media.poster||'',fit:'contain',loop:true});return true;
}
function mountExtraInspector(form,s){
 if(!s.mediaItems?.some(m=>m.id===activeMediaItemId))activeMediaItemId=null;
 const section=document.createElement('section');section.className='extra-inspector';
 section.innerHTML='<h3 class="field-title">چند رسانه در این صفحه</h3><p class="hint">رسانه‌های اضافه مستقل‌اند؛ قاب هرکدام را در پیش‌نمایش جابه‌جا یا کوچک و بزرگ کن.</p><button type="button" class="button upload-button" id="append-media">افزودن عکس یا ویدیو به این صفحه</button><label class="field"><span>انتخاب رسانه برای ویرایش افکت و جایگزینی</span><select id="media-target"><option value="">رسانهٔ اصلی</option></select></label><div id="extra-media-settings"></div><label class="field"><span>انتخاب از کتابخانه</span><select id="media-insert-mode"><option value="replace">جایگزینی رسانهٔ انتخاب‌شده</option><option value="add">افزودن به‌عنوان رسانهٔ جدید</option></select></label>';
 const first=form.firstChild;form.insertBefore(section,first);const target=section.querySelector('#media-target');
 for(const [i,item] of (s.mediaItems||[]).entries())target.append(new Option((i+2)+' · '+item.name,item.id));target.value=activeMediaItemId||'';
 target.onchange=()=>{activeMediaItemId=target.value||null;const element=sceneElements().find(value=>activeMediaItemId?value.binding.field==='mediaItem'&&value.binding.itemId===activeMediaItemId:value.binding.field==='primaryMedia');if(element)selectedElementId=element.id;renderInspector();renderHandles()};
 const insertMode=section.querySelector('#media-insert-mode');insertMode.value=mediaInsertMode;insertMode.onchange=()=>mediaInsertMode=insertMode.value;
 section.querySelector('#append-media').onclick=()=>{activeMediaItemId=null;uploadDialog(false,true)};
 const item=s.mediaItems?.find(m=>m.id===activeMediaItemId);
 if(item){const area=section.querySelector('#extra-media-settings');area.innerHTML='<label class="field"><span>نام رسانه</span><input id="extra-name" maxlength="200"></label><label class="field"><span>نمایش رسانه</span><select id="extra-fit"><option value="contain">نمایش کامل</option><option value="cover">پر کردن قاب</option><option value="fill">کشیده‌شدن تا لبه‌ها</option></select></label><label class="field checkbox"><input id="extra-loop" type="checkbox"><span>لوپ این ویدیو</span></label><button type="button" class="text-button danger" id="delete-extra">حذف این رسانهٔ اضافه</button>';
  area.querySelector('#extra-name').value=item.name;area.querySelector('#extra-fit').value=item.fit;area.querySelector('#extra-loop').checked=item.loop;
  for(const [selector,key] of [['#extra-name','name'],['#extra-fit','fit'],['#extra-loop','loop']])area.querySelector(selector).onchange=e=>{checkpoint();item[key]=e.target.type==='checkbox'?e.target.checked:e.target.value;renderMediaItems(canvasElement(),s,{playing,reduce});changed()};
  area.querySelector('#delete-extra').onclick=()=>{checkpoint();s.mediaItems=s.mediaItems.filter(m=>m.id!==item.id);activeMediaItemId=null;renderStage();renderInspector();changed()};
 }
 mountMediaEffects(form,item||s);
}

function setupHome(){
 homePicker=mountHomePicker(()=>project,id=>{
  const url=new URL(location.href);url.searchParams.set('deck',id);if(url.hash==='#home')url.hash='';window.history.pushState(null,'',url);enterDeck(id);
 },{onElementSelect:id=>{selectedElementId=id;renderHomeInspector()}});
 function enterDeck(id){homePicker.hide();editMode(location.hash==='#edit');deckId=id;index=0;renderDecks();choose(0);resizeStage();requestAnimationFrame(()=>{$('#stage').tabIndex=-1;$('#stage').focus({preventScroll:true})})}
 function showHome(editing=false){setPlaying(false);document.body.classList.toggle('editing',editing);$('#toggle-edit').textContent=editing?'نمایش ارائه':'ویرایش صفحه‌ها';selectedElementId=homeElements().some(element=>element.id===selectedElementId)?selectedElementId:homeEditorContent(project).title?.id;homePicker.show({editing,selectedId:selectedElementId});if(editing)renderHomeInspector();document.title=editing?'طلاکارت · ویرایش صفحهٔ اصلی':'طلاکارت · انتخاب بخش ارائه'}
 $('#home-button').onclick=()=>{const editing=document.body.classList.contains('editing');const url=new URL(location.href);url.searchParams.delete('deck');url.hash=editing?'edit-home':'home';window.history.pushState(null,'',url);showHome(editing)};
 $('.brand').onclick=event=>{event.preventDefault();$('#home-button').click()};
 function routeFromLocation(){const requested=new URL(location.href).searchParams.get('deck');if(location.hash==='#edit-home')showHome(true);else if(project.decks.some(d=>d.id===requested))enterDeck(requested);else if(location.hash==='#edit')enterDeck(project.activeDeck);else showHome(false)}
 addEventListener('popstate',routeFromLocation);addEventListener('hashchange',routeFromLocation);
 const requested=new URL(location.href).searchParams.get('deck');if(location.hash==='#edit-home')showHome(true);else if(!project.decks.some(d=>d.id===requested)&&location.hash!=='#edit')showHome(false);
}
