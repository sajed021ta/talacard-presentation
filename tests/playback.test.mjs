import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {pagePlaybackFinished} from '../public/playback.js';

const source = fs.readFileSync(new URL('../public/studio.js', import.meta.url), 'utf8');
const tickSource = source.slice(source.indexOf('function tick(now)'), source.indexOf('\nconst field ='));

test('Auto Play keeps scheduling frames across multiple legacy pages, including an unready iframe', () => {
  const state = {
    pagePlaybackFinished,project: {editor:{settings:{playback:{autoplay:true}}}}, playing:true,
    previousFrame:0, elapsed:0, frame:{}, iframeReady:false,
    stageAnimations:[], index:0, reduce:false, queued:null,
    scene:()=>({duration:.15,loop:true}),
    $:()=>({querySelectorAll:()=>[]}), sendLegacy:()=>{},
    paintBackdrop:()=>{}, updateProgress:()=>{},
  };
  state.choose = i => { state.index=i; state.elapsed=0; };
  state.requestAnimationFrame = callback => { state.queued=callback; };
  vm.createContext(state);
  vm.runInContext(tickSource, state);
  for(let frame=1;frame<=6;frame++) {
    state.queued=null;
    state.tick(frame*100);
    assert.equal(typeof state.queued,'function','next animation frame must survive navigation');
  }
  assert.equal(state.index,3);
  state.project.editor.settings.playback.autoplay=false;
  state.tick(700); state.tick(800);
  assert.equal(state.index,3,'manual mode must keep the current page');
});

test('Auto Play waits for all videos to finish even after the page timer expires',()=>{
  const attributes=new Map();
  const video={ended:false,loop:true,hasAttribute:key=>attributes.has(key),setAttribute:(key,value)=>attributes.set(key,value),getAttribute:key=>attributes.get(key),removeAttribute:key=>attributes.delete(key)};
  const state={project:{editor:{settings:{playback:{autoplay:true}}}},playing:true,previousFrame:0,elapsed:10,frame:null,iframeReady:true,stageAnimations:[],index:0,reduce:false,scene:()=>({duration:1}),$:()=>({querySelectorAll:()=>[video]}),sendLegacy:()=>{},paintBackdrop:()=>{},updateProgress:()=>{},requestAnimationFrame:()=>{}};
  state.choose=i=>{state.index=i;state.elapsed=0};
  state.pagePlaybackFinished=pagePlaybackFinished;
  vm.createContext(state);vm.runInContext(tickSource,state);
  state.tick(100);
  assert.equal(state.index,0);
  assert.equal(video.loop,false);
  video.ended=true;state.tick(200);
  assert.equal(state.index,1);
  state.project.editor.settings.playback.autoplay=false;state.tick(300);
  assert.equal(video.loop,true,'saved loop preference is restored in manual mode');
});

test('multiple videos wait for the last video and image-only pages use the timer',()=>{
  const videos=[false,true].map(ended=>({ended,loop:false,hasAttribute:()=>true,getAttribute:()=> 'false',removeAttribute(){}}));
  const canvas={querySelectorAll:()=>videos};
  assert.equal(pagePlaybackFinished(canvas,{duration:1},100,true),false);
  videos[0].ended=true;
  assert.equal(pagePlaybackFinished(canvas,{duration:1},100,true),true);
  assert.equal(pagePlaybackFinished(canvas,{duration:1},100,false),false);
  assert.equal(pagePlaybackFinished({querySelectorAll:()=>[]},{duration:5},4,true),false);
  assert.equal(pagePlaybackFinished({querySelectorAll:()=>[]},{duration:5},5,true),true);
});
