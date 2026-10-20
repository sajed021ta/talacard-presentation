import {placementMode} from './placement.js';
import {applyMediaEffect,controlMediaEffect,seekMediaEffect} from './effects.js';
export function mediaItemBox(canvas,item,index=0){return item.placement?.[placementMode(canvas)]||{x:5+(index%3)*29,y:58+Math.floor(index/3)*5,w:27,h:30}}
export function renderMediaItems(canvas,scene,{playing=true,reduce=false}={}){
 const items=scene.mediaItems||[];
 for(const layer of canvas.querySelectorAll(':scope > .extra-media'))if(!items.some(m=>m.id===layer.dataset.mediaItem)){layer.querySelector('video')?.pause();layer.remove()}
 items.forEach((item,index)=>{
  let layer=canvas.querySelector('[data-media-item="'+item.id+'"]');const signature=item.media+'|'+item.poster;
  if(!layer){layer=document.createElement('div');layer.className='extra-media';layer.dataset.mediaItem=item.id;canvas.append(layer)}
  if(layer.dataset.signature!==signature){layer.querySelector('video')?.pause();layer.replaceChildren();const visual=document.createElement('div');visual.className='scene-media';const video=/\.(mp4|webm)$/i.test(item.media),el=document.createElement(video?'video':'img');
   if(video){el.autoplay=true;el.muted=true;el.playsInline=true;el.preload='metadata';if(item.poster)el.poster=item.poster;el.addEventListener('loadeddata',()=>{if(layer.dataset.playing==='true')el.play().catch(()=>{})})}else el.alt=item.name;
   el.src=item.media;visual.append(el);layer.append(visual);layer.dataset.signature=signature;
  }
  layer.dataset.playing=String(playing);const box=mediaItemBox(canvas,item,index);Object.assign(layer.style,{left:box.x+'%',top:box.y+'%',width:box.w+'%',height:box.h+'%'});
  const el=layer.querySelector('video,img');el.style.objectFit=item.fit;const video=layer.querySelector('video');if(video){video.loop=item.loop;if(playing&&video.paused)video.play().catch(()=>{});if(!playing)video.pause()}
  applyMediaEffect(layer,item,{playing,reduce});
 });
}
export function controlMediaItems(canvas,playing){for(const layer of canvas.querySelectorAll(':scope > .extra-media')){layer.dataset.playing=String(playing);controlMediaEffect(layer,playing)}}
export function seekMediaItems(canvas,seconds){for(const layer of canvas.querySelectorAll(':scope > .extra-media'))seekMediaEffect(layer,seconds)}
