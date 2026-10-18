const fs=require('fs'),vm=require('vm'),assert=require('assert');
const env={console};env.window=env;env.self=env;vm.createContext(env);vm.runInContext(fs.readFileSync('app/js/three.r74.min.js','utf8'),env);
const mod={exports:{}};vm.runInNewContext(fs.readFileSync('src/locomotion.js','utf8'),{module:mod,exports:mod.exports,require:()=>env.THREE});const move=mod.exports;
const view={forward:{x:0,z:-1},right:{x:1,z:0}};
function journey(fps,diagonal){move.reset();let x=0,z=0;for(let frame=0;frame<fps*2;frame++){const step=move.step(diagonal?1:0,frame<fps?1:0,view,34,1/fps);x+=step.x;z+=step.z;}return {x,z,speed:move.velocity().length()};}
const runs=[30,60,120].map(fps=>journey(fps,false));for(const run of runs){assert(Math.abs(run.z+33.6566)<.02,'predictable distance through acceleration and braking');assert(run.speed<.01);assert(Math.abs(run.z-runs[0].z)<.006,'same travel at 30 / 60 / 120 FPS');}
move.reset();let distance=0;for(let i=0;i<60;i++)distance+=move.step(1,1,view,34,1/60).length();move.reset();let straight=0;for(let i=0;i<60;i++)straight+=move.step(0,1,view,34,1/60).length();assert(Math.abs(distance-straight)<.0001,'diagonal input has no speed advantage');
move.reset();for(let i=0;i<60;i++)move.step(0,1,view,66,1/60);for(let i=0;i<8;i++)move.step(0,-1,view,66,1/60);assert(move.velocity().z>55,'a reversal promptly follows the new input');
move.step(1,1,view,34,1/60);move.contact(0,0);assert.equal(move.velocity().length(),0,'blocked motion cannot accumulate pressure against cover');
console.log('PASS movement: frame-rate consistency, smooth acceleration/braking, normalized diagonals, responsive reversal and obstacle contact.');
