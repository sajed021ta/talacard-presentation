// Same guilloche geometry as the refreshed reference, driven by the page's clock.
const states=new WeakMap();
export function paintBackdrop(canvas,scene,seconds=0,reduce=false){
 canvas.classList.toggle('reference-presentation',scene.presentationStyle==='reference');
 let layer=canvas.querySelector(':scope > .reference-backdrop');
 if(scene.layout==='legacy'||scene.presentationStyle!=='reference'){layer?.remove();return}
 if(!layer){layer=document.createElement('canvas');layer.className='reference-backdrop';layer.setAttribute('aria-hidden','true');canvas.prepend(layer)}
 const w=parseInt(canvas.style.width)||1240,h=parseInt(canvas.style.height)||820,t=reduce?0:Math.floor(seconds*25)/25,key=`${w}/${h}/${t}`;
 if(states.get(layer)===key)return;states.set(layer,key);if(layer.width!==w)layer.width=w;if(layer.height!==h)layer.height=h;
 const cx=layer.getContext('2d'),phase=t*.096;cx.clearRect(0,0,w,h);cx.lineWidth=1;
 for(let k=0;k<34;k++){cx.strokeStyle=`rgba(231,197,105,${.16+.16*Math.sin(k/34*Math.PI)})`;cx.beginPath();for(let x=0;x<=w;x+=8){const y=h*(.55+.3*Math.sin(x/w*Math.PI*1.5+.6+phase))+(k-17)*h*.011;x?cx.lineTo(x,y):cx.moveTo(x,y)}cx.stroke()}
}
