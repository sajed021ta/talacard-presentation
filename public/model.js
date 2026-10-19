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
      if (!LAYOUTS.includes(s.layout) || !TRANSITIONS.includes(s.transition) || !number(s.duration, 1, 180) || !number(s.fontSize, 20, 64) || !number(s.intensity, 0, 1) || !number(s.position, 0, 100) || !Number.isInteger(s.legacyScene) || s.legacyScene < 0 || s.legacyScene > 13 || !['contain', 'cover'].includes(s.fit) || typeof s.loop !== 'boolean') throw new Error('تنظیمات یکی از صفحه‌ها معتبر نیست.');
      if (!mediaPath(s.media) || !mediaPath(s.poster) || !color(s.background) || !color(s.textColor) || !color(s.accent)) throw new Error('مسیر رسانه یا رنگ یکی از صفحه‌ها معتبر نیست.');
    }
  }
  if (!deckIds.has(project.activeDeck) || !Array.isArray(project.library) || project.library.length > 1000) throw new Error('فهرست رسانه‌ها یا پروژهٔ فعال معتبر نیست.');
  for (const m of project.library) {
    if (!id(m.id) || !text(m.name, 200) || !['image', 'video'].includes(m.type) || !mediaPath(m.src, false) || !mediaPath(m.poster) || !text(m.originalName, 500)) throw new Error('یکی از رسانه‌ها معتبر نیست.');
  }
  return project;
}

export const clone = value => JSON.parse(JSON.stringify(value));
export const chapters = deck => [...new Set(deck.scenes.map(s => s.chapter))];
export function blankScene() {
  return { id: `page-${crypto.randomUUID()}`, chapter: 'بخش جدید', label: 'صفحهٔ جدید', title: 'عنوان صفحه', highlight: '', description: 'توضیح این صفحه را بنویسید.', duration: 8, layout: 'split', legacyScene: 0, media: '', poster: '', fit: 'contain', position: 50, transition: 'fade', intensity: .45, background: '#FFFFFF', textColor: '#222225', accent: '#A87816', fontSize: 40, loop: true };
}

export function timeLabel(seconds) {
  const sec = Math.max(0, Math.floor(seconds));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
