export const DEFAULT_EFFECT={type:'none',duration:5,delay:0,amount:20,repeat:false,easing:'ease-out'};
export function effectFrames(effect){
 const f={...DEFAULT_EFFECT,...effect},scale=1+f.amount/100,offset=f.amount/(2*scale);
 switch(f.type){
  case 'zoom-in':return [{transform:'scale(1)'},{transform:`scale(${scale})`}];
  case 'zoom-out':return [{transform:`scale(${scale})`},{transform:'scale(1)'}];
  case 'zoom-in-out':return [{transform:'scale(1)'},{transform:`scale(${scale})`,offset:.5},{transform:'scale(1)'}];
  case 'pan-left':case 'pan-right':case 'pan-up':case 'pan-down':{
   const vertical=['pan-up','pan-down'].includes(f.type),direction=['pan-left','pan-up'].includes(f.type)?1:-1,axis=vertical?'Y':'X';
   return [{transform:`scale(${scale}) translate${axis}(${offset*direction}%)`},{transform:`scale(${scale}) translate${axis}(${-offset*direction}%)`}];
  }
  case 'fade-in':return [{opacity:0},{opacity:1}];
  case 'blur-in':return [{filter:`blur(${f.amount/4}px)`,opacity:.35},{filter:'blur(0px)',opacity:1}];
  default:return null;
 }
}
const states=new WeakMap();
export function applyMediaEffect(canvas,scene,{playing=true,restart=false,reduce=false}={}){
 const el=canvas.querySelector('.scene-media video,.scene-media img'),f={...DEFAULT_EFFECT,...scene.mediaEffect};let state=states.get(canvas);
 const signature=JSON.stringify(f);
 if(state&&(state.el!==el||state.signature!==signature||restart)){state.animation?.cancel();states.delete(canvas);state=null}
 if(!el||f.type==='none'){if(state)state.animation?.cancel();states.delete(canvas);return}
 if(!state){
  const animation=el.animate(effectFrames(f),{duration:f.duration*1000,delay:f.delay*1000,iterations:f.repeat?Infinity:1,easing:f.easing==='ease-out'?'cubic-bezier(.22,1,.36,1)':f.easing,fill:'both'});
  state={el,animation,signature,reduce};states.set(canvas,state);
  if(reduce){animation.pause();animation.currentTime=(f.delay+f.duration)*1000;return}
 }
 if(!reduce){if(playing&&state.animation.playState==='paused')state.animation.play();else if(!playing)state.animation.pause()}
}
export function controlMediaEffect(canvas,playing){const state=states.get(canvas),a=state?.animation;if(a&&!state.reduce){if(playing&&a.playState==='paused')a.play();else if(!playing)a.pause()}}
export function seekMediaEffect(canvas,seconds){const a=states.get(canvas)?.animation;if(a)a.currentTime=seconds*1000}
