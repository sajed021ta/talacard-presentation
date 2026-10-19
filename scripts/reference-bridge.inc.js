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
