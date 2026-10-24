// A video page advances only after every video finishes, never at the page timer.
export function pagePlaybackFinished(canvas,scene,elapsed,autoplay){
  const videos=[...canvas.querySelectorAll('video')];
  for(const video of videos){
    if(autoplay){
      if(!video.hasAttribute('data-autoplay-loop'))video.setAttribute('data-autoplay-loop',String(video.loop));
      video.loop=false;
    }else if(video.hasAttribute('data-autoplay-loop')){
      video.loop=video.getAttribute('data-autoplay-loop')==='true';
      video.removeAttribute('data-autoplay-loop');
    }
  }
  return Boolean(autoplay&&(videos.length?videos.every(video=>video.ended):elapsed>=scene.duration));
}
