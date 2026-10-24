import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pageTransitionFrames,playPageTransition} from '../public/page-transition.js';
import {validateProject,clone} from '../public/model.js';
import {syncProjectEditor} from '../public/editor-model.js';

test('page transition preserves canvas scale, cancels interrupted motion and respects reduced motion',()=>{
  const calls=[];
  const canvas={style:{transform:'scale(0.5)'},animate(frames,timing){const animation={finished:Promise.resolve(),cancelled:false,cancel(){this.cancelled=true}};calls.push({frames,timing,animation});return animation}};
  playPageTransition(canvas,{type:'slide',duration:.7});
  assert.equal(calls[0].timing.duration,700);
  assert.equal(canvas.style.transform,'scale(0.5)');
  assert.equal(calls[0].frames.some(frame=>'transform' in frame),false);
  playPageTransition(canvas,{type:'wipe',duration:1});
  assert.equal(calls[0].animation.cancelled,true);
  assert.equal(calls[1].frames[0].clipPath,'inset(0 0 0 100%)');
  playPageTransition(canvas,{type:'slide',duration:1},{reduce:true});
  assert.deepEqual(calls[2].frames,[{opacity:0},{opacity:1}]);
  assert.equal(calls[2].timing.duration,120);
  playPageTransition(canvas,{type:'none',duration:1});
  assert.equal(calls.length,3);
  assert.equal(calls[2].animation.cancelled,true);
  assert.equal(pageTransitionFrames('slide',true)[0].translate,'-32px 0');
});

test('transition settings survive editor synchronization and JSON reload; invalid settings fail',()=>{
  const project=JSON.parse(fs.readFileSync(new URL('../content.json',import.meta.url)));
  syncProjectEditor(project);project.editor.settings||={};project.editor.settings.playback={autoplay:true,transition:{type:'wipe',duration:.75}};
  syncProjectEditor(project);
  const restored=validateProject(JSON.parse(JSON.stringify(project)));
  assert.deepEqual(restored.editor.settings.playback,project.editor.settings.playback);
  for(const transition of [{type:'unknown',duration:1},{type:'fade',duration:0},{type:'fade',duration:4},{type:'slide',duration:'1'}]){
    const bad=clone(project);bad.editor.settings.playback.transition=transition;assert.throws(()=>validateProject(bad));
  }
});
