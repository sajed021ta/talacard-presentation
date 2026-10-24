// Unified, persisted editing model for the home page and every presentation page.
// The current renderer keeps using the proven scene fields. This adapter mirrors those
// fields into stable elements and can apply element patches back without changing output.
export const EDITOR_SCHEMA_VERSION = 1;
export const ELEMENT_TYPES = ['richText', 'image', 'video', 'card', 'table'];
export const VIEWPORTS = ['desktop', 'compact'];

export const HOME_CARD_DEFAULTS = [
  { id:'kiosk', name:'طلاپرداز', description:'خرید و تحویل طلاکارت با حساب دیجی‌کالا', image:'/reference/assets/932b58fc924a03a1.webp', target:'kiosk', kind:'kiosk' },
  { id:'app', name:'اپ طلاکارت', description:'خرید، فروش و تحویل فیزیکی', image:'/reference/assets/8fd8ff7f04043f06.webp', target:'app', kind:'app' },
  { id:'deliv', name:'کارت طلا', description:'', image:'/reference/assets/a2cc2bf20f679f82.webp', target:'deliv', kind:'card' },
  { id:'proposal', name:'طلاکارت', description:'', image:'/reference/assets/03fa24a263eed294.webp', target:'proposal', kind:'brand' }
];

const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const mediaType = src => /\.(mp4|webm)$/i.test(src || '') ? 'video' : 'image';
const surfaceId = sceneId => `scene:${sceneId}`;
const elementId = (sceneId, role, id = '') => `scene:${sceneId}:${role}${id ? ':' + id : ''}`;
const homeElementId = (role, id = '') => `home:${role}${id ? ':' + id : ''}`;
const emptyResponsive = () => ({ desktop:null, compact:null });
const frameToGeometry = placement => {
  const position=emptyResponsive(),dimensions=emptyResponsive();
  for(const mode of VIEWPORTS){const box=placement?.[mode];if(!box)continue;position[mode]={x:box.x,y:box.y};dimensions[mode]={width:box.w,height:box.h}}
  return {position,dimensions};
};
const geometryToPlacement = element => {
  const placement={};for(const mode of VIEWPORTS){const point=element.position?.[mode],size=element.dimensions?.[mode];if(point&&size)placement[mode]={x:point.x,y:point.y,w:size.width,h:size.height}}
  return Object.keys(placement).length ? placement : undefined;
};
const mergeElement = (previous, generated) => ({
  ...clone(previous || {}),
  ...generated,
  zIndex:previous?.zIndex ?? generated.zIndex,
  position:generated.position,
  dimensions:generated.dimensions,
  content:generated.content,
  style:{...(previous?.style || {}),...(generated.style || {})},
  animation:{...(previous?.animation || {}),...(generated.animation || {})}
});
const byId = elements => new Map((elements || []).map(element => [element.id,element]));

function textElement({id,role,text,runs,format,placement,zIndex=2,binding,style={},animation={}}){
  return {id,type:'richText',role,...frameToGeometry(placement),zIndex,content:{text,runs:clone(runs || [{text}]),format:clone(format || {})},style:clone(style),animation:clone(animation),binding};
}
function mediaElement({id,role,src,poster='',fit='contain',loop=true,name='',placement,zIndex,binding,effect={}}){
  return {id,type:mediaType(src),role,...frameToGeometry(placement),zIndex,content:{src,poster,fit,loop,name},style:{},animation:clone(effect || {}),binding};
}

function sceneElements(scene, previous=[]){
  const old=byId(previous), elements=[];
  const copyPlacement={};for(const mode of VIEWPORTS)if(scene.placement?.[mode]?.copy)copyPlacement[mode]=scene.placement[mode].copy;
  const mediaPlacement={};for(const mode of VIEWPORTS)if(scene.placement?.[mode]?.media)mediaPlacement[mode]=scene.placement[mode].media;
  const title=textElement({id:elementId(scene.id,'title'),role:'title',text:scene.title,runs:scene.titleRuns,format:scene.titleFormat,placement:copyPlacement,zIndex:2,binding:{scope:'scene',sceneId:scene.id,field:'title'},style:{color:scene.textColor,fontSize:scene.fontSize,accent:scene.accent},animation:{type:scene.transition,duration:scene.duration,intensity:scene.intensity}});
  elements.push(mergeElement(old.get(title.id),title));
  const blocks=scene.textBlocks || [{id:'description',runs:[{text:scene.description}],format:{}}];
  for(const block of blocks){
    const body=textElement({id:elementId(scene.id,'text',block.id),role:'body',text:block.runs.map(run=>run.text).join(''),runs:block.runs,format:block.format,placement:block.placement || copyPlacement,zIndex:3,binding:{scope:'scene',sceneId:scene.id,field:'textBlock',itemId:block.id},style:{color:scene.textColor}});
    elements.push(mergeElement(old.get(body.id),body));
  }
  if(scene.media){const primary=mediaElement({id:elementId(scene.id,'media'),role:'primaryMedia',src:scene.media,poster:scene.poster,fit:scene.fit,loop:scene.loop,name:'رسانهٔ اصلی',placement:mediaPlacement,zIndex:1,binding:{scope:'scene',sceneId:scene.id,field:'primaryMedia'},effect:scene.mediaEffect});elements.push(mergeElement(old.get(primary.id),primary))}
  for(const [index,item] of (scene.mediaItems || []).entries()){
    const extra=mediaElement({id:elementId(scene.id,'media',item.id),role:'media',src:item.media,poster:item.poster,fit:item.fit,loop:item.loop,name:item.name,placement:item.placement,zIndex:6+index,binding:{scope:'scene',sceneId:scene.id,field:'mediaItem',itemId:item.id},effect:item.mediaEffect});elements.push(mergeElement(old.get(extra.id),extra));
  }
  if(scene.table){const table={id:elementId(scene.id,'table'),type:'table',role:'table',...frameToGeometry(copyPlacement),zIndex:3,content:clone(scene.table),style:{color:scene.textColor,accent:scene.accent},animation:{},binding:{scope:'scene',sceneId:scene.id,field:'table'}};elements.push(mergeElement(old.get(table.id),table))}
  return elements;
}

function homeElements(project, previous=[]){
  const old=byId(previous), elements=[];
  const kickerId=homeElementId('kicker'),titleId=homeElementId('title');
  const homePage=project.homePage||{},kickerValue=homePage.kicker||{},titleValue=homePage.title||{};
  const kicker=textElement({id:kickerId,role:'kicker',text:kickerValue.text??'طلاکارت × دیجی‌کالا',runs:kickerValue.runs??[{text:kickerValue.text??'طلاکارت × دیجی‌کالا'}],format:kickerValue.format||{align:'center'},placement:kickerValue.placement,zIndex:kickerValue.zIndex||2,binding:{scope:'home',field:'kicker'},style:{color:'#9B721C',...(kickerValue.style||{})}});
  const title=textElement({id:titleId,role:'title',text:titleValue.text??'طلاکارت جریان طلا',runs:titleValue.runs??[{text:'طلاکارت ',color:'#222225'},{text:'جریان طلا',color:'#D7B34E'}],format:titleValue.format||{align:'center'},placement:titleValue.placement,zIndex:titleValue.zIndex||3,binding:{scope:'home',field:'title'},style:{color:'#222225',...(titleValue.style||{})}});
  elements.push(mergeElement(old.get(kickerId),kicker),mergeElement(old.get(titleId),title));
  for(const [index,base] of HOME_CARD_DEFAULTS.entries()){
    const card={...base,...project.homeCards?.[base.id]};const id=homeElementId('card',base.id);
    const geometry=frameToGeometry(card.placement),generated={id,type:'card',role:'homeCard',position:geometry.position,dimensions:geometry.dimensions,zIndex:card.zIndex||4+index,content:{key:base.id,name:card.name,description:card.description,image:card.image,target:card.target,fit:card.fit||'cover',nameRuns:clone(card.nameRuns||[{text:card.name}]),nameFormat:clone(card.nameFormat||{align:'center'}),descriptionRuns:clone(card.descriptionRuns||[{text:card.description}]),descriptionFormat:clone(card.descriptionFormat||{align:'center'})},style:{kind:base.kind,...clone(card.style||{})},animation:clone(card.animation||{}),binding:{scope:'home',field:'card',itemId:base.id}};
    elements.push(mergeElement(old.get(id),generated));
  }
  return elements;
}

export function syncProjectEditor(project){
  const previous=new Map((project.editor?.surfaces || []).map(surface=>[surface.id,surface]));
  const homePrevious=previous.get('home');const surfaces=[{id:'home',kind:'home',sourceId:'home',elements:homeElements(project,homePrevious?.elements)}];
  for(const deck of project.decks)for(const scene of deck.scenes){const id=surfaceId(scene.id),old=previous.get(id);surfaces.push({id,kind:'scene',sourceId:scene.id,elements:sceneElements(scene,old?.elements)})}
  const settings=clone(project.editor?.settings);project.editor={schemaVersion:EDITOR_SCHEMA_VERSION,surfaces,...(settings?{settings}:{})};return project;
}

export function ensureEditableProject(project){
  if(!project.editor || project.editor.schemaVersion!==EDITOR_SCHEMA_VERSION)project.editor={schemaVersion:EDITOR_SCHEMA_VERSION,surfaces:[]};
  return syncProjectEditor(project);
}

export function editorSurface(project,id){return project.editor?.surfaces?.find(surface=>surface.id===(id==='home'?'home':surfaceId(id)))}
export function editorElement(project,surface,element){return editorSurface(project,surface)?.elements.find(item=>item.id===element)}

function applyGeometry(target,element){const placement=geometryToPlacement(element);if(placement)target.placement=placement;else delete target.placement}
function findScene(project,id){for(const deck of project.decks){const scene=deck.scenes.find(item=>item.id===id);if(scene)return scene}}
function applyElementToLegacy(project,element){
  const binding=element.binding;if(!binding)return;
  if(binding.scope==='home'){
    if(binding.field==='card'){
      project.homeCards||={};project.homeCards[binding.itemId]={...clone(element.content),style:clone(element.style||{}),animation:clone(element.animation||{}),zIndex:element.zIndex};
      const placement=geometryToPlacement(element);if(placement)project.homeCards[binding.itemId].placement=placement;
    } else if(['kicker','title'].includes(binding.field)){
      project.homePage||={};project.homePage[binding.field]={text:element.content.text,runs:clone(element.content.runs),format:clone(element.content.format||{}),style:clone(element.style||{}),zIndex:element.zIndex};
      const placement=geometryToPlacement(element);if(placement)project.homePage[binding.field].placement=placement;
    }
    return;
  }
  const scene=findScene(project,binding.sceneId);if(!scene)return;
  if(binding.field==='title'){
    scene.title=element.content.text;scene.titleRuns=clone(element.content.runs);scene.titleFormat=clone(element.content.format || {});
    if(element.style?.color)scene.textColor=element.style.color;if(Number.isFinite(element.style?.fontSize))scene.fontSize=element.style.fontSize;if(element.style?.accent)scene.accent=element.style.accent;
    const placement=geometryToPlacement(element);if(placement){scene.placement||={};for(const [mode,box] of Object.entries(placement)){scene.placement[mode]||={};scene.placement[mode].copy=box}}
  } else if(binding.field==='textBlock'){
    scene.textBlocks||=[];let block=scene.textBlocks.find(item=>item.id===binding.itemId);if(!block){block={id:binding.itemId,runs:[],format:{}};scene.textBlocks.push(block)}
    block.runs=clone(element.content.runs);block.format=clone(element.content.format || {});applyGeometry(block,element);scene.description=scene.textBlocks.map(item=>item.runs.map(run=>run.text).join('')).join('\n');
  } else if(binding.field==='primaryMedia'){
    Object.assign(scene,{media:element.content.src,poster:element.content.poster||'',fit:element.content.fit||'contain',loop:element.content.loop!==false});if(Object.keys(element.animation||{}).length)scene.mediaEffect=clone(element.animation);
    const placement=geometryToPlacement(element);if(placement){scene.placement||={};for(const [mode,box] of Object.entries(placement)){scene.placement[mode]||={};scene.placement[mode].media=box}}
  } else if(binding.field==='mediaItem'){
    const item=scene.mediaItems?.find(value=>value.id===binding.itemId);if(item){Object.assign(item,{name:element.content.name||item.name,media:element.content.src,poster:element.content.poster||'',fit:element.content.fit||'contain',loop:element.content.loop!==false});if(Object.keys(element.animation||{}).length)item.mediaEffect=clone(element.animation);applyGeometry(item,element)}
  } else if(binding.field==='table')scene.table=clone(element.content);
}

function deepMerge(target,patch){
  if(!patch||typeof patch!=='object'||Array.isArray(patch))return clone(patch);
  const value={...(target || {})};for(const [key,next] of Object.entries(patch))value[key]=next&&typeof next==='object'&&!Array.isArray(next)?deepMerge(value[key],next):clone(next);return value;
}
export function updateEditorElement(project,surfaceIdValue,elementIdValue,patch){
  const surface=editorSurface(project,surfaceIdValue),index=surface?.elements.findIndex(element=>element.id===elementIdValue) ?? -1;if(index<0)throw new Error('المان قابل ویرایش پیدا نشد.');
  const next=deepMerge(surface.elements[index],patch);surface.elements[index]=next;applyElementToLegacy(project,next);syncProjectEditor(project);return editorElement(project,surfaceIdValue,elementIdValue);
}
export function reorderEditorElement(project,surfaceIdValue,elementIdValue,direction){
  const surface=editorSurface(project,surfaceIdValue),ordered=(surface?.elements||[]).filter(element=>['richText','image','video','card'].includes(element.type)&&!element.style?.hidden).sort((a,b)=>a.zIndex-b.zIndex),index=ordered.findIndex(element=>element.id===elementIdValue),next=index+Math.sign(direction);
  if(index<0||next<0||next>=ordered.length)return false;ordered.forEach((element,position)=>element.zIndex=position+1);[ordered[index].zIndex,ordered[next].zIndex]=[ordered[next].zIndex,ordered[index].zIndex];ordered.forEach(element=>applyElementToLegacy(project,element));return true;
}

const safeId=value=>typeof value==='string'&&/^[a-zA-Z0-9:_-]{1,180}$/.test(value);
const safeNumber=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const safeMedia=value=>typeof value==='string'&&(/^\/media\/[a-zA-Z0-9][a-zA-Z0-9_.-]{0,180}$/.test(value)||/^\/reference\/assets\/[a-zA-Z0-9_.-]+$/.test(value));
function validateGeometry(element){
  for(const key of ['position','dimensions']){if(!element[key]||typeof element[key]!=='object'||Array.isArray(element[key]))throw new Error('موقعیت یا ابعاد المان معتبر نیست.');for(const mode of VIEWPORTS){const value=element[key][mode];if(value===null)continue;if(!value||typeof value!=='object')throw new Error('موقعیت یا ابعاد المان معتبر نیست.');if(key==='position'&&(!safeNumber(value.x,0,100)||!safeNumber(value.y,0,100)))throw new Error('موقعیت المان معتبر نیست.');if(key==='dimensions'&&(!safeNumber(value.width,0,100)||!safeNumber(value.height,0,100)))throw new Error('ابعاد المان معتبر نیست.')}}
}
function validateElement(element){
  if(!element||!safeId(element.id)||!ELEMENT_TYPES.includes(element.type)||typeof element.role!=='string'||element.role.length>80||!Number.isInteger(element.zIndex)||element.zIndex<0||element.zIndex>1000)throw new Error('مشخصات المان قابل ویرایش معتبر نیست.');validateGeometry(element);
  if(!element.content||typeof element.content!=='object'||Array.isArray(element.content)||!element.style||typeof element.style!=='object'||Array.isArray(element.style)||!element.animation||typeof element.animation!=='object'||Array.isArray(element.animation))throw new Error('محتوا یا ظاهر المان معتبر نیست.');
  if(element.type==='richText'){
    if(typeof element.content.text!=='string'||element.content.text.length>8000||!Array.isArray(element.content.runs)||element.content.runs.length>500||element.content.runs.some(run=>!run||typeof run.text!=='string')||element.content.runs.map(run=>run.text).join('')!==element.content.text)throw new Error('متن ساختاریافتهٔ المان معتبر نیست.');
  } else if(['image','video'].includes(element.type)){
    if(!safeMedia(element.content.src)||(element.content.poster&& !safeMedia(element.content.poster))||!['contain','cover','fill'].includes(element.content.fit)||typeof element.content.loop!=='boolean')throw new Error('رسانهٔ المان معتبر نیست.');
  } else if(element.type==='card'){
    const c=element.content,validRuns=(runs,text)=>runs===undefined||(Array.isArray(runs)&&runs.every(run=>run&&typeof run.text==='string')&&runs.map(run=>run.text).join('')===text);if(typeof c.name!=='string'||c.name.length>200||typeof c.description!=='string'||c.description.length>1000||!safeMedia(c.image)||typeof c.target!=='string'||(c.fit!==undefined&&!['contain','cover','fill'].includes(c.fit))||!validRuns(c.nameRuns,c.name)||!validRuns(c.descriptionRuns,c.description))throw new Error('محتوای کارت معتبر نیست.');
  } else if(element.type==='table'&&(!Array.isArray(element.content.columns)||!Array.isArray(element.content.rows)))throw new Error('محتوای جدول معتبر نیست.');
}
export function validateEditorProject(project){
  if(project.editor===undefined)return project;
  const editor=project.editor;if(!editor||editor.schemaVersion!==EDITOR_SCHEMA_VERSION||!Array.isArray(editor.surfaces))throw new Error('مدل ویرایش پروژه معتبر نیست.');
  if(editor.settings!==undefined){const settings=editor.settings;if(!settings||typeof settings!=='object'||Array.isArray(settings))throw new Error('تنظیمات ویرایش معتبر نیست.');if(settings.playback!==undefined&&(!settings.playback||typeof settings.playback!=='object'||Array.isArray(settings.playback)||(settings.playback.autoplay!==undefined&&typeof settings.playback.autoplay!=='boolean')))throw new Error('تنظیمات پخش خودکار معتبر نیست.');if(settings.placement!==undefined){const placement=settings.placement;if(!placement||typeof placement!=='object'||Array.isArray(placement))throw new Error('تنظیمات گرید معتبر نیست.');const grid=placement.grid,guides=placement.guides,media=placement.media;if(grid!==undefined&&(!grid||typeof grid!=='object'||Array.isArray(grid)||(grid.enabled!==undefined&&typeof grid.enabled!=='boolean')||(grid.visible!==undefined&&typeof grid.visible!=='boolean')||(grid.size!==undefined&&!safeNumber(grid.size,1,128))))throw new Error('تنظیمات گرید معتبر نیست.');if(guides!==undefined&&(!guides||typeof guides!=='object'||Array.isArray(guides)||(guides.enabled!==undefined&&typeof guides.enabled!=='boolean')||(guides.threshold!==undefined&&!safeNumber(guides.threshold,0,40))))throw new Error('تنظیمات راهنمای هوشمند معتبر نیست.');if(media!==undefined&&(!media||typeof media!=='object'||Array.isArray(media)||(media.snap!==undefined&&typeof media.snap!=='boolean')||(media.preserveAspectModifier!==undefined&&!['alt','always','never'].includes(media.preserveAspectModifier))))throw new Error('تنظیمات رسانه معتبر نیست.')}}
  const transition=editor.settings?.playback?.transition;
  if(transition!==undefined&&(!transition||!['none','fade','slide','wipe'].includes(transition.type)||!safeNumber(transition.duration,.1,3)))throw new Error('تنظیمات انتقال صفحه معتبر نیست.');
  const expected=new Set(['home',...project.decks.flatMap(deck=>deck.scenes.map(scene=>surfaceId(scene.id)))]),ids=new Set();
  for(const surface of editor.surfaces){if(!surface||!safeId(surface.id)||ids.has(surface.id)||!['home','scene'].includes(surface.kind)||!safeId(surface.sourceId)||!Array.isArray(surface.elements)||surface.elements.length>100)throw new Error('سطح قابل ویرایش معتبر نیست.');ids.add(surface.id);const elements=new Set();for(const element of surface.elements){if(elements.has(element.id))throw new Error('شناسهٔ المان تکراری است.');elements.add(element.id);validateElement(element)}}
  if(ids.size!==expected.size||[...expected].some(id=>!ids.has(id)))throw new Error('همهٔ صفحه‌ها باید سطح ویرایش داشته باشند.');return project;
}

export function homeEditorContent(project){
  const surface=editorSurface(project,'home'),find=role=>surface?.elements.find(element=>element.role===role);
  return {kicker:find('kicker'),title:find('title'),cards:(surface?.elements || []).filter(element=>element.role==='homeCard')};
}
