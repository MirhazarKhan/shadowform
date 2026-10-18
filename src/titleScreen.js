var THREE=require('three'),settings=require('./core/settings'),environment=require('./particleEnvironment');
var multiplayer=require('./multiplayer');
var scene,camera,particles,game,layer,screen,button,world=[],phase='idle',elapsed=0,duration=1.35;
var emitter=new THREE.Vector3(0,0,278),previous=new THREE.Vector3(),target=emitter.clone(),origin=new THREE.Vector3(),flow=new THREE.Vector3(),transport=new THREE.Vector3();
var pointer=new THREE.Vector2(0,0),ray=new THREE.Vector3(),startEmitter=new THREE.Vector3(),startFlow=new THREE.Vector3(),entryPosition=new THREE.Vector3(),entryRotation=new THREE.Quaternion(),titlePosition=new THREE.Vector3(0,9,340),titleRotation=new THREE.Quaternion(),empty=[];
var farDepth=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1,THREE.RGBAFormat);farDepth.minFilter=farDepth.magFilter=THREE.NearestFilter;farDepth.needsUpdate=true;
function smooth(t){return t*t*t*(t*(t*6-15)+10);}
function restoreWorld(){for(var i=0;i<world.length;i++)world[i].object.visible=world[i].visible;}
function finish(){restoreWorld();scene.add(particles);screen.hidden=true;document.body.classList.remove('on-title');document.body.classList.remove('entering-game');settings.titlePhase='complete';settings.worldReveal=1;phase='complete';}
function move(e){if(phase!=='idle')return;pointer.set(Math.max(-.96,Math.min(.96,e.clientX/Math.max(1,innerWidth)*2-1)),Math.max(-.94,Math.min(.94,1-e.clientY/Math.max(1,innerHeight)*2)));}
function enter(remote){if(phase!=='idle'||!game.isReady()||button.disabled&&!remote)return;if(!remote){game.capturePointer();if(!multiplayer.start())return;}var entry=multiplayer.playing()?multiplayer.entry():{x:0,y:0,z:278};entryPosition.set(entry.x,entry.y+30,entry.z+47);if(button.blur)button.blur();phase='entering';elapsed=0;startEmitter.copy(emitter);startFlow.copy(flow);button.disabled=true;screen.classList.add('departing');document.body.classList.add('entering-game');restoreWorld();settings.sceneChanged=true;}
exports.enterGame=function(){enter(true);};
exports.init=function(s,c,p,g){scene=s;camera=c;particles=p;game=g;screen=document.getElementById('titleScreen');button=document.getElementById('start');entryPosition.copy(camera.position);entryRotation.copy(camera.quaternion);
 // Render the same particle mesh above the world reveal in the WebGL path.
 // WebGPU already draws this field on its transparent overlay canvas.
 layer=new THREE.Scene();layer.add(particles);for(var i=0;i<scene.children.length;i++){var o=scene.children[i];if(o instanceof THREE.Light)continue;world.push({object:o,visible:o.visible});o.visible=false;}
 camera.position.copy(titlePosition);camera.lookAt(new THREE.Vector3(0,9,278));camera.updateMatrixWorld();titleRotation.copy(camera.quaternion);settings.titlePhase='idle';settings.worldReveal=0;
 if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)duration=.3;
 button.disabled=true;button.textContent='Loading…';addEventListener('pointermove',move);addEventListener('pointerdown',move);button.onclick=function(){enter(false);};
};
exports.ready=function(){if(phase!=='idle')return;button.disabled=false;button.textContent='Start solo';multiplayer.ready();if(button.focus)button.focus({preventScroll:true});};
exports.active=function(){return phase!=='complete';};
exports.occluders=function(){return empty;};
exports.update=function(ms){if(phase==='complete')return false;if(!game.isReady()){finish();return false;}var dt=ms/1000;previous.copy(emitter);transport.set(0,0,0);
 if(phase==='idle'){
  // Project the pointer onto the emitter plane, as in the original Spirit.
  ray.set(pointer.x,pointer.y,.5).unproject(camera).sub(camera.position).normalize();var distance=(278-camera.position.z)/ray.z;
  target.copy(camera.position).add(ray.multiplyScalar(distance));target.y-=9;emitter.lerp(target,1-Math.exp(-dt*9));
  var response=1-Math.exp(-dt*7);ray.copy(emitter).sub(previous).multiplyScalar(1/Math.max(.001,dt*45));ray.clampScalar(-1.5,1.5);flow.lerp(ray,response);
 }else{
  elapsed+=dt;var t=Math.min(1,elapsed/duration),ease=smooth(t);emitter.copy(startEmitter).lerp(target.set(entryPosition.x,entryPosition.y-30,entryPosition.z-47),ease);transport.copy(emitter).sub(previous);origin.add(transport);flow.copy(startFlow).multiplyScalar(1-ease);
  camera.position.copy(titlePosition).lerp(entryPosition,ease);camera.quaternion.copy(titleRotation).slerp(entryRotation,ease);camera.updateMatrixWorld();settings.worldReveal=smooth(Math.max(0,Math.min(1,(t-.12)/.88)));
 }
 settings.mouse3d.copy(emitter);settings.flow=flow;settings.motionAmount=Math.min(1,flow.length());settings.transport=transport;settings.fieldOrigin=origin;settings.shape=settings.morph=settings.low=settings.heading=settings.vision=0;settings.brightness=.14+settings.motionAmount*.18;settings.titlePhase=phase;environment.count=0;
 // No particle buffers, lifetimes or curl clocks are reset at this handoff.
 if(phase==='entering'&&elapsed>=duration){game.start(true);finish();}
 return true;
};
exports.render=function(renderer){if(!exports.active()||!particles.visible)return;var m=particles.material,depth=m.uniforms.sceneDepth.value,test=m.depthTest,clear=renderer.autoClear;m.uniforms.sceneDepth.value=farDepth;m.depthTest=true;renderer.autoClear=false;renderer.clearDepth();renderer.render(layer,camera);renderer.autoClear=clear;m.depthTest=test;m.uniforms.sceneDepth.value=depth;};
