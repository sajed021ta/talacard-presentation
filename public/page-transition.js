export const PAGE_TRANSITIONS=['none','fade','slide','wipe'];
export const DEFAULT_PAGE_TRANSITION={type:'fade',duration:.45};

export function pageTransitionFrames(type,reverse=false){
  if(type==='none')return null;
  if(type==='slide')return [{opacity:0,translate:`${reverse?'-':''}32px 0`},{opacity:1,translate:'0px 0'}];
  if(type==='wipe')return [{clipPath:reverse?'inset(0 100% 0 0)':'inset(0 0 0 100%)'},{clipPath:'inset(0 0 0 0)'}];
  return [{opacity:0},{opacity:1}];
}

const running=new WeakMap();
export function playPageTransition(canvas,settings=DEFAULT_PAGE_TRANSITION,{reduce=false,reverse=false}={}){
  running.get(canvas)?.cancel();running.delete(canvas);
  const frames=pageTransitionFrames(reduce&&settings.type!=='none'?'fade':settings.type,reverse);
  if(!frames||!canvas.animate)return null;
  // Individual translate preserves the stage's existing responsive scale transform.
  const animation=canvas.animate(frames,{duration:(reduce?Math.min(.12,settings.duration):settings.duration)*1000,easing:'cubic-bezier(.16,1,.3,1)'});
  running.set(canvas,animation);
  animation.finished.then(()=>{if(running.get(canvas)===animation)running.delete(canvas)},()=>{});
  return animation;
}
