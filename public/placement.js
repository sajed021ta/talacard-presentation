export const placementMode = canvas => canvas.classList.contains('compact') ? 'compact' : 'desktop';
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
