export const placementMode = canvas => canvas.classList.contains('compact') ? 'compact' : 'desktop';
export const DEFAULT_PLACEMENT_SETTINGS={
  grid:{enabled:true,visible:true,size:8},
  guides:{enabled:true,threshold:6},
  media:{snap:false,preserveAspectModifier:'alt'}
};
export function resolvePlacementSettings(value={}){
  return {
    grid:{...DEFAULT_PLACEMENT_SETTINGS.grid,...value.grid},
    guides:{...DEFAULT_PLACEMENT_SETTINGS.guides,...value.guides},
    media:{...DEFAULT_PLACEMENT_SETTINGS.media,...value.media}
  };
}
export function applyPlacement(canvas, scene) {
  for (const kind of ['copy', 'media']) {
    const el = canvas.querySelector('.scene-' + kind); if (!el) continue;
    const box = scene.placement?.[placementMode(canvas)]?.[kind];
    el.classList.toggle('placed', !!box);
    for (const [key, property] of Object.entries({x:'--box-x',y:'--box-y',w:'--box-w',h:'--box-h'})) {
      if (box) el.style.setProperty(property, box[key] + '%'); else el.style.removeProperty(property);
    }
  }
}
export function readPlacement(canvas, el) {
  const c=canvas.getBoundingClientRect(); let r=el.getBoundingClientRect();
  if(el.classList.contains('scene-copy') && !el.classList.contains('placed')) {
    const style=getComputedStyle(el), scale=c.width/canvas.offsetWidth;
    const left=Math.max(0,parseFloat(style.paddingLeft)-12)*scale,right=Math.max(0,parseFloat(style.paddingRight)-12)*scale;
    const top=Math.max(0,parseFloat(style.paddingTop)-12)*scale,bottom=Math.max(0,parseFloat(style.paddingBottom)-12)*scale;
    r={left:r.left+left,top:r.top+top,width:r.width-left-right,height:r.height-top-bottom};
  }
  return {x:(r.left-c.left)/c.width*100,y:(r.top-c.top)/c.height*100,w:r.width/c.width*100,h:r.height/c.height*100};
}
export function adjustBox(box, dx, dy, resize=false) {
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const x=clamp(box.x,0,92), y=clamp(box.y,0,92);
  const w=clamp(box.w,8,100-x),h=clamp(box.h,8,100-y);
  return resize ? {x,y,w:clamp(w+dx,8,100-x),h:clamp(h+dy,8,100-y)} : {x:clamp(x+dx,0,100-w),y:clamp(y+dy,0,100-h),w,h};
}

export function resizeBox(box,dx,dy,preserveAspect=false){
  if(!preserveAspect)return adjustBox(box,dx,dy,true);
  const start=adjustBox(box,0,0),horizontal=Math.abs(dx/start.w)>=Math.abs(dy/start.h);
  const requested=horizontal?(start.w+dx)/start.w:(start.h+dy)/start.h;
  const minimum=Math.max(8/start.w,8/start.h),maximum=Math.min((100-start.x)/start.w,(100-start.y)/start.h);
  const scale=Math.max(minimum,Math.min(maximum,requested));
  return {...start,w:start.w*scale,h:start.h*scale};
}

const anchors=(box,width,height)=>({
  x:[box.x/100*width,(box.x+box.w/2)/100*width,(box.x+box.w)/100*width],
  y:[box.y/100*height,(box.y+box.h/2)/100*height,(box.y+box.h)/100*height]
});
function bestGuide(source,targets,threshold){
  let best=null;
  for(const sourceValue of source)for(const targetValue of targets){const delta=targetValue-sourceValue;if(Math.abs(delta)<=threshold&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={delta,position:targetValue}}
  return best;
}
export function snapTextMove(box,otherBoxes,viewport,settings={},disabled=false){
  const config=resolvePlacementSettings(settings),width=viewport.width,height=viewport.height;
  if(disabled||!width||!height)return {box:adjustBox(box,0,0),guides:[]};
  let next=adjustBox(box,0,0);
  if(config.grid.enabled&&config.grid.size>0){
    next=adjustBox({...next,x:Math.round(next.x/100*width/config.grid.size)*config.grid.size/width*100,y:Math.round(next.y/100*height/config.grid.size)*config.grid.size/height*100},0,0);
  }
  if(!config.guides.enabled||!otherBoxes.length)return {box:next,guides:[]};
  const source=anchors(next,width,height),targets=otherBoxes.map(value=>anchors(adjustBox(value,0,0),width,height));
  const x=bestGuide(source.x,targets.flatMap(value=>value.x),config.guides.threshold),y=bestGuide(source.y,targets.flatMap(value=>value.y),config.guides.threshold),guides=[];
  if(x){next=adjustBox({...next,x:next.x+x.delta/width*100},0,0);guides.push({axis:'x',position:x.position/width*100})}
  if(y){next=adjustBox({...next,y:next.y+y.delta/height*100},0,0);guides.push({axis:'y',position:y.position/height*100})}
  return {box:next,guides};
}
