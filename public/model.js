export const LAYOUTS = ['legacy', 'split', 'full', 'title'];
export const TRANSITIONS = ['fade', 'reveal', 'slide', 'none'];
export const MAX_SCENES = 200;

export function mediaPath(value, optional = true) {
  if (optional && value === '') return true;
  // Project assets stay portable and same-origin. No scripts, arbitrary HTML or remote trackers.
  return typeof value === 'string' && /^\/media\/[a-zA-Z0-9][a-zA-Z0-9_.-]{0,180}$/.test(value) && !value.includes('..');
}

export function validateProject(project) {
  if (!project || project.version !== 1 || !Array.isArray(project.decks) || !project.decks.length || project.decks.length > 20) throw new Error('ساختار فایل پروژه معتبر نیست.');
  const text = (s, max) => typeof s === 'string' && s.length <= max;
  const id = s => typeof s === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(s);
  const color = s => /^#[0-9a-fA-F]{6}$/.test(s);
  const number = (n, a, b) => typeof n === 'number' && Number.isFinite(n) && n >= a && n <= b;
  const deckIds = new Set();
  for (const d of project.decks) {
    if (!id(d.id) || deckIds.has(d.id) || !text(d.name, 200) || !text(d.flowDescription, 4000) || !Array.isArray(d.scenes) || !d.scenes.length || d.scenes.length > MAX_SCENES) throw new Error('مشخصات یا تعداد صفحه‌های پروژه معتبر نیست.');
    deckIds.add(d.id);
    const sceneIds = new Set();
    for (const s of d.scenes) {
      if (!id(s.id) || sceneIds.has(s.id) || !text(s.chapter, 100) || !text(s.label, 200) || !text(s.title, 1000) || !text(s.highlight, 1000) || !text(s.description, 8000)) throw new Error('متن یا شناسهٔ یکی از صفحه‌ها معتبر نیست.');
      sceneIds.add(s.id);
      if (!LAYOUTS.includes(s.layout) || !TRANSITIONS.includes(s.transition) || !number(s.duration, 1, 180) || !number(s.fontSize, 20, 64) || !number(s.intensity, 0, 1) || !number(s.position, 0, 100) || !Number.isInteger(s.legacyScene) || s.legacyScene < 0 || s.legacyScene > 199 || !['contain', 'cover'].includes(s.fit) || typeof s.loop !== 'boolean') throw new Error('تنظیمات یکی از صفحه‌ها معتبر نیست.');
      if(s.legacyDeck!==undefined&&!['app','kiosk','deliv','previous','snapshot19'].includes(s.legacyDeck))throw new Error('مسیر نمایش معتبر نیست.');
      if(s.presentationStyle!==undefined&&!['reference','plain'].includes(s.presentationStyle))throw new Error('سبک پس‌زمینه معتبر نیست.');
      if(s.table!==undefined){const t=s.table;if(!t||!Array.isArray(t.columns)||t.columns.length!==4||!t.columns.every(v=>text(v,200))||!Array.isArray(t.rows)||t.rows.length>30||!t.rows.every(row=>Array.isArray(row)&&row.length===4&&row.every(v=>text(v,500))))throw Error('جدول معتبر نیست.');}
      validateRichScene(s);
      validateMediaItems(s);
      if (s.placement !== undefined) validatePlacement(s.placement);
      if (!mediaPath(s.media) || !mediaPath(s.poster) || !color(s.background) || !color(s.textColor) || !color(s.accent)) throw new Error('مسیر رسانه یا رنگ یکی از صفحه‌ها معتبر نیست.');
    }
  }
  if (!deckIds.has(project.activeDeck) || !Array.isArray(project.library) || project.library.length > 1000) throw new Error('فهرست رسانه‌ها یا پروژهٔ فعال معتبر نیست.');
  for (const m of project.library) {
    if (!id(m.id) || !text(m.name, 200) || !['image', 'video'].includes(m.type) || !mediaPath(m.src, false) || !mediaPath(m.poster) || !text(m.originalName, 500)) throw new Error('یکی از رسانه‌ها معتبر نیست.');
  }
  if(project.homeCards!==undefined){for(const [key,card] of Object.entries(project.homeCards)){if(!['kiosk','app','deliv','proposal'].includes(key)||!card||!text(card.name,200)||!text(card.description,1000)||!deckIds.has(card.target)||!(mediaPath(card.image,false)||/^\/reference\/assets\/[a-zA-Z0-9_.-]+$/.test(card.image)))throw Error('تنظیمات کارت صفحهٔ اول معتبر نیست.');}}
  return project;
}

export const clone = value => JSON.parse(JSON.stringify(value));
export const chapters = deck => [...new Set(deck.scenes.map(s => s.chapter))];
export function blankScene() {
  return { id: `page-${crypto.randomUUID()}`, chapter: 'بخش جدید', label: 'صفحهٔ جدید', title: 'عنوان صفحه', highlight: '', description: 'توضیح این صفحه را بنویسید.', duration: 8, layout: 'split', legacyScene: 0, media: '', poster: '', fit: 'contain', position: 50, transition: 'fade', intensity: .45, background: '#FFFFFF', presentationStyle:'reference', textColor: '#222225', accent: '#A87816', fontSize: 40, loop: true };
}

export function timeLabel(seconds) {
  const sec = Math.max(0, Math.floor(seconds));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function validatePlacement(placement) {
  if (!placement || typeof placement !== 'object' || Array.isArray(placement)) throw new Error('چیدمان صفحه معتبر نیست.');
  for (const [mode, boxes] of Object.entries(placement)) {
    if (!['desktop','compact'].includes(mode) || !boxes || typeof boxes !== 'object' || Array.isArray(boxes)) throw new Error('چیدمان صفحه معتبر نیست.');
    for (const [kind, box] of Object.entries(boxes)) {
      if (!['copy','media'].includes(kind) || !box || !['x','y','w','h'].every(k => typeof box[k] === 'number' && Number.isFinite(box[k])) || box.x < 0 || box.y < 0 || box.w < 8 || box.h < 8 || box.x + box.w > 100.001 || box.y + box.h > 100.001) throw new Error('قاب متن یا رسانه باید داخل صفحه باشد.');
    }
  }
}

export const MEDIA_EFFECTS=['none','zoom-in','zoom-out','zoom-in-out','pan-left','pan-right','pan-up','pan-down','fade-in','blur-in'];
export function validateTextFormat(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('قالب متن معتبر نیست.');
 for(const [k,v] of Object.entries(value)){
  if(['bold','italic','underline'].includes(k)&&typeof v==='boolean')continue;
  if(k==='list'&&['none','bullet'].includes(v))continue;
  if(k==='color'&&typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v))continue;
  if(k==='fontFamily'&&['YekanX','Tahoma','Arial'].includes(v))continue;
  if(k==='fontSize'&&Number.isFinite(v)&&v>=12&&v<=96)continue;
  if(k==='lineHeight'&&Number.isFinite(v)&&v>=1&&v<=3)continue;
  if(k==='align'&&['right','center','left','justify'].includes(v))continue;
  if(k==='text'&&typeof v==='string')continue;
  throw new Error('یکی از تنظیمات متن معتبر نیست.');
 }
}
export function validateRuns(runs,max){
 if(!Array.isArray(runs)||runs.length>500)throw new Error('ساختار متن معتبر نیست.');
 let length=0;for(const r of runs){if(!r||typeof r.text!=='string')throw new Error('متن معتبر نیست.');validateTextFormat(r);length+=r.text.length}
 if(length>max)throw new Error('متن بیش از حد طولانی است.');
}
export function validateRichScene(s){
 if(s.titleRuns!==undefined){validateRuns(s.titleRuns,1000);if(s.titleRuns.map(r=>r.text).join('')!==s.title)throw new Error('عنوان و قالب متن هماهنگ نیستند.')}
 if(s.titleFormat!==undefined)validateTextFormat(s.titleFormat);
 if(s.textBlocks!==undefined){
  if(!Array.isArray(s.textBlocks)||s.textBlocks.length>40)throw new Error('هر صفحه حداکثر ۴۰ باکس متن دارد.');
  const ids=new Set();for(const b of s.textBlocks){if(!b||!/^[a-zA-Z0-9_-]{1,80}$/.test(b.id)||ids.has(b.id))throw new Error('شناسهٔ باکس متن معتبر نیست.');ids.add(b.id);validateRuns(b.runs,8000);if(b.format!==undefined)validateTextFormat(b.format);
   if(b.placement!==undefined){if(!b.placement||typeof b.placement!=='object'||Array.isArray(b.placement))throw new Error('جای متن معتبر نیست.');for(const [mode,box] of Object.entries(b.placement))validatePlacement({[mode]:{copy:box}})}
  }
  if(s.textBlocks.map(b=>b.runs.map(r=>r.text).join('')).join('\n')!==s.description)throw new Error('توضیحات و باکس‌ها هماهنگ نیستند.');
 }
 if(s.mediaEffect!==undefined){const f=s.mediaEffect;
  if(!f||!MEDIA_EFFECTS.includes(f.type)||!Number.isFinite(f.duration)||f.duration<.2||f.duration>120||!Number.isFinite(f.delay)||f.delay<0||f.delay>60||!Number.isFinite(f.amount)||f.amount<1||f.amount>60||typeof f.repeat!=='boolean'||!['linear','ease-out','ease-in-out'].includes(f.easing))throw new Error('تنظیمات افکت رسانه معتبر نیست.');
 }
}

export function sceneMediaPaths(scene){return [scene.media,scene.poster,...(scene.mediaItems||[]).flatMap(m=>[m.media,m.poster])].filter(Boolean)}
export function validateMediaItems(scene){
 if(scene.mediaItems===undefined)return;
 if(!Array.isArray(scene.mediaItems)||scene.mediaItems.length>12)throw Error('هر صفحه حداکثر ۱۲ رسانهٔ اضافه دارد.');
 const ids=new Set();for(const item of scene.mediaItems){
  if(!item||!/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)||ids.has(item.id)||typeof item.name!=='string'||item.name.length>200||!mediaPath(item.media,false)||!mediaPath(item.poster)||!['contain','cover'].includes(item.fit)||typeof item.loop!=='boolean')throw Error('رسانهٔ اضافه معتبر نیست.');
  ids.add(item.id);validateRichScene({mediaEffect:item.mediaEffect});
  if(item.placement!==undefined)for(const [mode,box] of Object.entries(item.placement))validatePlacement({[mode]:{media:box}});
 }
}
export function renameChapter(deck,oldName,newName){
 const name=newName.trim();if(!name||name.length>100)throw Error('نام بخش باید بین ۱ تا ۱۰۰ حرف باشد.');
 if(name!==oldName&&deck.scenes.some(s=>s.chapter===name))throw Error('این نام برای بخش دیگری استفاده شده است.');
 for(const scene of deck.scenes)if(scene.chapter===oldName)scene.chapter=name;
 return name;
}
