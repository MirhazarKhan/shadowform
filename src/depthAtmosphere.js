var THREE=require('three'),settings=require('./core/settings'),Effect=require('./3d/postprocessing/Effect'),composer=require('./3d/postprocessing/effectComposer');
var renderer,scene,camera,particles,target,depthMaterial,effect,transparentObjects=[],travel=new THREE.Vector3();
exports.init=function(r,s,c,p){renderer=r;scene=s;camera=c;particles=p;
// Pack the full camera range with sub-millimetre precision at one quarter
// of the old RGBA32F bandwidth. Packed values require nearest filtering.
target=new THREE.WebGLRenderTarget(1,1,{format:THREE.RGBAFormat,type:THREE.UnsignedByteType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,stencilBuffer:false});target.texture.generateMipmaps=false;
depthMaterial=new THREE.ShaderMaterial({vertexShader:'varying float vDepth;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vDepth=-p.z/2800.0;gl_Position=projectionMatrix*p;}',fragmentShader:'varying float vDepth;void main(){vec4 encodedDepth=fract(min(vDepth,.999999)*vec4(16777216.0,65536.0,256.0,1.0));encodedDepth-=encodedDepth.xxyz*vec4(0.0,.00390625,.00390625,.00390625);gl_FragColor=encodedDepth*(256.0/255.0);}'});
effect=new Effect();effect.init({uniforms:{u_depth:{type:'t',value:target},u_vision:{type:'f',value:0},u_reveal:{type:'f',value:1},u_speed:{type:'v4',value:new THREE.Vector4()},u_cameraMotion:{type:'v3',value:new THREE.Vector3()}},fragmentShader:['uniform sampler2D u_texture;','uniform highp sampler2D u_depth;','uniform vec2 u_resolution;','uniform float u_vision,u_reveal;','uniform vec4 u_speed;','uniform vec3 u_cameraMotion;','varying vec2 v_uv;','float readDepth(vec2 uv){return dot(texture2D(u_depth,uv),vec4(1.0/16777216.0,1.0/65536.0,1.0/256.0,1.0))*(255.0/256.0);}','void main(){',' vec3 color=texture2D(u_texture,v_uv).rgb;',
' // A short camera-relative shutter shares the existing atmosphere pass.',
' // Centre detail stays readable; peripheral scenery streaks with travel.',
' if(u_speed.x+u_cameraMotion.z>.003){',
'  vec2 radial=v_uv-vec2(.5,.46);float aspect=u_resolution.x/u_resolution.y;',
'  float edge=smoothstep(.12,.65,length(radial*vec2(aspect,1.0)));',
'  vec2 direction=vec2(-u_speed.y/aspect,-u_speed.z)+radial*u_speed.w*1.6;',
'  vec2 streak=(direction*(.022*u_speed.x)+u_cameraMotion.xy)*(.18+.82*edge);',
'  color=color*.32+texture2D(u_texture,clamp(v_uv+streak*.25,vec2(0.0),vec2(1.0))).rgb*.18;',
'  color+=texture2D(u_texture,clamp(v_uv+streak*.5,vec2(0.0),vec2(1.0))).rgb*.15;',
'  color+=texture2D(u_texture,clamp(v_uv+streak*.75,vec2(0.0),vec2(1.0))).rgb*.12;',
'  color+=texture2D(u_texture,clamp(v_uv+streak,vec2(0.0),vec2(1.0))).rgb*.1;',
'  color+=texture2D(u_texture,clamp(v_uv-streak*.25,vec2(0.0),vec2(1.0))).rgb*.13;',
' }',' float depth=readDepth(v_uv);',' vec2 px=1.35/u_resolution;',' float a=readDepth(v_uv+vec2(px.x,0.0)),b=readDepth(v_uv-vec2(px.x,0.0));',' float c=readDepth(v_uv+vec2(0.0,px.y)),d=readDepth(v_uv-vec2(0.0,px.y));',' float difference=max(0.0,depth-min(min(a,b),min(c,d)));',' float ink=smoothstep(.018,.055,difference/max(depth,.008));',' color=mix(color,vec3(.018,.019,.025),ink*(.86/(1.0+u_speed.x*.3)));',' float fog=smoothstep(.24,.7,depth)*.12;',' color=mix(color,vec3(.11,.105,.115),fog);',' float vignette=smoothstep(.20,.78,length(v_uv-.5));',' color*=1.0-vignette*.19;',' float grey=dot(color,vec3(.2126,.7152,.0722));',' vec3 charcoal=vec3(.88,.90,.92)*(grey*.62+.026);',' float threat=smoothstep(.035,.16,color.r-max(color.g,color.b)*1.2);',' vec3 scan=mix(charcoal,vec3(.75,.026,.075)*(grey+.4),threat);',' color=mix(color,scan,u_vision);',' color=mix(vec3(.09412,.09804,.11373),color,u_reveal);',' gl_FragColor=vec4(color,1.0);','}'].join('\n')});composer.queue.unshift(effect);
exports.invalidate();
};
exports.resize=function(w,h){target.setSize(w,h)};
exports.texture=function(){return target;};
exports.invalidate=function(){transparentObjects.length=0;scene.traverse(function(o){if(o.material)transparentObjects.push({object:o,visible:false});});};
exports.capture=function(){if(settings.sceneChanged){exports.invalidate();settings.sceneChanged=false;}for(var i=0;i<transparentObjects.length;i++){var item=transparentObjects[i];item.visible=item.object.visible;if(item.object.material.transparent)item.object.visible=false;}var old=scene.overrideMaterial,visible=particles.visible;particles.visible=false;scene.overrideMaterial=depthMaterial;var color=renderer.getClearColor().getHex(),alpha=renderer.getClearAlpha();renderer.setClearColor(0xffffff,1);renderer.render(scene,camera,target);renderer.setClearColor(color,alpha);scene.overrideMaterial=old;particles.visible=visible;for(i=0;i<transparentObjects.length;i++)transparentObjects[i].object.visible=transparentObjects[i].visible;};

exports.update=function(){effect.uniforms.u_reveal.value=settings.worldReveal===undefined?1:settings.worldReveal;effect.uniforms.u_vision.value=settings.vision||0;var speed=settings.speedEffect,velocity=settings.playerVelocity,strength=Math.max(speed?speed.w:0,velocity?Math.min(.20,velocity.length()/200):0);camera.matrixWorldInverse.getInverse(camera.matrixWorld);if(speed&&speed.w>.003)travel.set(speed.x,speed.y,speed.z);else if(velocity)travel.copy(velocity);else travel.set(0,0,0);if(travel.lengthSq()>.0001)travel.transformDirection(camera.matrixWorldInverse);effect.uniforms.u_speed.value.set(strength,travel.x,travel.y,travel.z);if(settings.cameraShutter)effect.uniforms.u_cameraMotion.value.copy(settings.cameraShutter);else effect.uniforms.u_cameraMotion.value.set(0,0,0);};
