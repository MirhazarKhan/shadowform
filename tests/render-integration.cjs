const fs=require('fs'),vm=require('vm'),assert=require('assert');
const env={console};env.window=env;env.self=env;vm.createContext(env);vm.runInContext(fs.readFileSync('app/js/three.r74.min.js','utf8'),env);
const THREE=env.THREE;global.window={THREE,location:{href:'http://localhost/?amount=4k'}};global.localStorage={getItem(){return null}};
const constants={},names={},calls=[],floatAllocations=[],simulationDraws=[];let next=1000,id=1,program;
const gl=new Proxy({drawingBufferWidth:960,drawingBufferHeight:540},{get(target,name){
 if(name in target)return target[name];
 if(/^[A-Z_0-9]+$/.test(name)){if(!(name in constants)){constants[name]=next++;names[constants[name]]=name;}return constants[name];}
 if(name==='getParameter')return key=>{const n=names[key]||'';if(/VERSION|VENDOR|RENDERER/.test(n))return 'Native render integration';if(n==='COMPRESSED_TEXTURE_FORMATS')return [];if(/RANGE/.test(n))return new Float32Array([1,1]);if(/VIEWPORT|SCISSOR/.test(n))return new Int32Array([0,0,960,540]);if(/MAX_TEXTURE_SIZE|MAX_CUBE_MAP_TEXTURE_SIZE/.test(n))return 4096;if(/UNIFORM/.test(n))return 1024;if(/MAX_VERTEX_ATTRIBS/.test(n))return 16;return 8;};
 if(name==='getExtension')return n=>/^OES_texture_float|OES_element_index_uint|OES_standard_derivatives/.test(n)?{}:null;
 if(name==='getContextAttributes')return ()=>({alpha:true,premultipliedAlpha:true,antialias:true,stencil:true});
 if(name==='getShaderPrecisionFormat')return ()=>({precision:23,rangeMin:127,rangeMax:127});
 if(name==='getProgramParameter')return (p,key)=>/ACTIVE_UNIFORMS|ACTIVE_ATTRIBUTES/.test(names[key])?0:true;
 if(name==='getShaderParameter')return ()=>true;
 if(name==='getShaderInfoLog'||name==='getProgramInfoLog')return ()=>'';
 if(name==='getUniformLocation')return (p,n)=>({name:n});
 if(name==='getAttribLocation')return (p,n)=>n==='position'?0:n==='normal'?1:n==='uv'?2:-1;
 if(name==='checkFramebufferStatus')return ()=>gl.FRAMEBUFFER_COMPLETE;
 if(name==='getError')return ()=>0;
 if(name==='shaderSource')return (shader,source)=>{shader.source=source;};
 if(name==='attachShader')return (p,shader)=>{(p.shaders||(p.shaders=[])).push(shader);};
 if(name==='useProgram')return p=>{program=p;};
 if(name==='texImage2D')return (...args)=>{if(args.includes(gl.FLOAT))floatAllocations.push(args.slice(0,8));};
 if(/^create/.test(name))return ()=>({id:id++});
 return (...args)=>{if(name==='drawElements'||name==='drawArrays'){calls.push(name);if(program&&program.shaders&&program.shaders.some(s=>s.source.includes('environmentCollision')))simulationDraws.push(name);}};
}});

const useGPU=process.argv.includes('--gpu'),elements={},handlers={},raf=[],errors=[],warnings=[],submits=[],dispatches=[],gpuBuffers=[],gpuSeeds=[];let now=0,lockedCanvas,pointerRequests=0;
function element(id){return elements[id]||(elements[id]={id,style:{},textContent:id==='fps'?'— FPS':'',value:'',hidden:false,children:[],querySelectorAll(){return [];},querySelector(tag){return element(id+':'+tag);},getAttribute(){return null;},setAttribute(){},remove(){},classList:{add(){},remove(){},toggle(){}},appendChild(n){this.children.push(n);},addEventListener(name,fn){handlers[id+':'+name]=fn;},blur(){this.blurred=true;},click(){if(this.onclick&&!this.disabled)this.onclick();}});}
const paint={fillRect(){},fillText(){},createLinearGradient(){return {addColorStop(){}};},drawImage(){},clearRect(){}};
function canvas(){return {nodeName:'CANVAS',width:960,height:540,style:{},events:{},addEventListener(n,f){this.events[n]=f;},getContext(type){return type==='2d'?paint:type==='webgpu'?{configure(){},getCurrentTexture(){return {createView(){return {}}};}}:gl;},remove(){},setPointerCapture(){},requestPointerLock(){pointerRequests++;lockedCanvas=this;env.document.pointerLockElement=this;if(handlers['doc:pointerlockchange'])handlers['doc:pointerlockchange']();return Promise.resolve();}};}

const device={pushErrorScope(){},popErrorScope:()=>Promise.resolve(null),createBuffer:options=>{const b={...options};gpuBuffers.push(b);return b;},createTexture:options=>({...options,createView:()=>({}),destroy(){}}),createShaderModule:options=>({...options}),createComputePipelineAsync:options=>Promise.resolve({...options,getBindGroupLayout:()=>({})}),createRenderPipelineAsync:options=>Promise.resolve({...options,getBindGroupLayout:()=>({})}),createBindGroup:options=>({...options}),addEventListener(){},lost:new Promise(()=>{}),queue:{writeBuffer(buffer,offset,data){assert(offset+data.byteLength<=buffer.size);if(buffer.usage&128&&data.length===65536*8)gpuSeeds.push(buffer);},submit(cmd){submits.push(cmd);}},createCommandEncoder(){return {beginComputePass(){return {setPipeline(){},setBindGroup(){},dispatchWorkgroups(n){dispatches.push(n);},end(){}};},beginRenderPass(){return {setPipeline(){},setBindGroup(){},draw(){},end(){}};},finish(){return {};}};}};
Object.assign(env,{innerWidth:960,innerHeight:540,navigator:{userAgent:'Native integration QA',gpu:useGPU?{requestAdapter:()=>Promise.resolve({requestDevice:()=>Promise.resolve(device)}),getPreferredCanvasFormat:()=> 'bgra8unorm'}:undefined},location:{href:'http://localhost/?amount=4k'},localStorage:{getItem(){return null;},setItem(){}},history:{replaceState(){}},URL,performance:{now:()=>now},requestAnimationFrame:fn=>{raf.push(fn);return raf.length;},addEventListener:(name,fn)=>handlers[name]=fn,sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},document:{body:element('body'),createElement:canvas,getElementById:element,querySelectorAll:()=>[],addEventListener:(name,fn)=>handlers['doc:'+name]=fn},fetch:path=>Promise.resolve({ok:true,text:()=>Promise.resolve(fs.readFileSync('app/'+path,'utf8'))}),GPUBufferUsage:{UNIFORM:64,COPY_DST:8,STORAGE:128},GPUTextureUsage:{RENDER_ATTACHMENT:16,TEXTURE_BINDING:4},setTimeout,clearTimeout,console:{log(){},warn:msg=>warnings.push(msg),error:error=>errors.push(error)}});
vm.runInContext(fs.readFileSync('app/js/index.js','utf8'),env,{filename:'production-index.js'});
function frame(){const callback=raf.shift();assert(callback,'animation loop must continue');now+=1000/60;callback(now);}
function key(code,down=true){handlers[down?'keydown':'keyup']({code,preventDefault(){}});}
(async()=>{
 for(let i=0;i<12;i++)await Promise.resolve();
 // Let the nested adapter/device/shader promises settle before the frame run.
 await new Promise(resolve=>setImmediate(resolve));
 if(useGPU)assert(element('engine').textContent.includes('GPU COMPUTE'),'GPU initialization must finish before testing its frames');
 assert.equal(errors.length,0,errors.map(String).join('\n'));assert(env.spiritGame,'game initialized');
 const state=()=>env.spiritGame.getState(),initial=state();assert.equal(initial.state,'ready');assert.equal(initial.titlePhase,'idle');
 for(let i=0;i<75;i++)frame();assert(!element('fps').textContent.includes('—'),'live title frames reach FPS update');assert.equal(state().time,0,'title does not advance patrols or the mission');
 assert.deepEqual(state().guards,initial.guards,'sentinels remain frozen on the title');
 const before=state().emitter;handlers.pointermove({clientX:820,clientY:365});frame();const first=state();assert(first.emitter.x>before.x);assert(first.emitter.y<before.y);assert(first.motion>0,'pointer motion drives the original field flow');
 for(let i=0;i<20;i++)frame();assert(state().emitter.x>first.emitter.x+8,'emitter follows smoothly rather than teleporting');
 if(useGPU)assert.equal(gpuSeeds.length,2,'both initial capacity buffers are recorded');const floatCount=floatAllocations.length,bufferCount=gpuBuffers.length,seedCount=gpuSeeds.length,drawCount=simulationDraws.length,dispatchCount=dispatches.length;
 element('start').click();assert.equal(pointerRequests,1,'Start requests mouse look within its user gesture');assert(element('start').blurred,'Start releases keyboard focus');key('KeyW');for(let i=0;i<30;i++)frame();assert.equal(state().state,'ready');assert.equal(state().titlePhase,'entering');assert(state().worldReveal>0&&state().worldReveal<1);assert.equal(state().time,0);element('start').click();
 for(let i=0;i<60;i++)frame();assert.equal(state().state,'playing');assert.equal(state().titlePhase,'complete');assert(element('titleScreen').hidden);assert.equal(state().worldReveal,1);assert.equal(state().core.z,278,'movement remains locked through the transition');assert.equal(state().emitter.x,0);assert.equal(state().emitter.y,0);assert(state().fieldOrigin.x<0,'curl origin is preserved through the live-field handoff');key('KeyW',false);
 assert.equal(floatAllocations.length,floatCount,'Start retains the float simulation targets');if(useGPU){assert.equal(gpuBuffers.length,bufferCount,'Start retains GPU particle buffers');assert.equal(gpuSeeds.length,seedCount,'Start does not reseed the field');assert(dispatches.length>dispatchCount+75);}else assert(simulationDraws.length>drawCount+75,'title and transition keep simulating');
 // Mouse look is live after the handoff, with smooth tracking and camera-relative keys.
 const beforeLook=state().camera.yaw;lockedCanvas.events.pointermove({type:'pointermove',movementX:-140,movementY:0});frame();const firstYaw=state().camera.yaw;assert(firstYaw>beforeLook&&firstYaw<beforeLook+.42,'orbit responds smoothly');for(let i=0;i<25;i++)frame();assert(state().camera.yaw>firstYaw+.20);assert(state().camera.shutter>0,'orbit has a measured shutter');
 const moveStart={...state().core};key('KeyW');for(let i=0;i<18;i++)frame();const moving=state(),viewYaw=moving.camera.viewYaw,dx=moving.core.x-moveStart.x,dz=moving.core.z-moveStart.z;assert(dx*(-Math.sin(viewYaw))+dz*(-Math.cos(viewYaw))>7,'forward follows the rendered view');assert(moving.velocity.z<0&&moving.velocity.x<0);assert.equal(moving.form,'Vapor');key('KeyW',false);for(let i=0;i<45;i++)frame();assert(Math.hypot(state().velocity.x,state().velocity.z)<.06,'release brakes to rest');assert(state().camera.actualDistance>=31.9,'camera never collapses into the field');
 // Reset to the initial forward heading for the existing sprint/dash scenarios.
 env.spiritGame.start();for(let i=0;i<75;i++)frame();
 key('ShiftLeft');key('KeyW');for(let i=0;i<15;i++)frame();assert(env.spiritGame.getState().speedBlur>.9);key('KeyW',false);key('ShiftLeft',false);for(let i=0;i<40;i++)frame();assert.equal(env.spiritGame.getState().speedBlur,0);
 key('Space');for(let i=0;i<10;i++)frame();assert(env.spiritGame.getState().aiming);key('Space',false);assert(env.spiritGame.getState().dashing);for(let i=0;i<12;i++)frame();assert(env.spiritGame.getState().speedBlur>2);for(let i=0;i<35;i++)frame();assert(!env.spiritGame.getState().dashing);
 key('KeyX');key('KeyX',false);for(let i=0;i<15;i++)frame();assert(env.spiritGame.getState().xray);env.spiritGame.pause();for(let i=0;i<8;i++)frame();element('begin').click();for(let i=0;i<8;i++)frame();
 assert.equal(errors.length,0,errors.map(String).join('\n'));assert(calls.length>400);if(useGPU){assert(submits.length>50);assert(dispatches.length>50);assert(element('engine').textContent.includes('GPU COMPUTE'));}else assert(element('engine').textContent.includes('GPU PARTICLES'));
 console.log('PASS entire production bundle with actual Three r74 renderer ('+(useGPU?'WebGPU orchestration':'WebGL simulation fallback')+'): live mouse-following title, smooth Start handoff without reseeding, immediate mouse capture, smoothed orbit, camera-relative movement and braking, safe camera clearance, 75 idle frames, FPS completion, Shift blur, dash/lightning, x-ray, pause/resume; '+calls.length+' WebGL draws. CPU GL/GPU API recorders; native shader/pixel checks are separate.');
})().catch(error=>{console.error('RENDER INTEGRATION FAILURE:',error.stack);process.exitCode=1;});
