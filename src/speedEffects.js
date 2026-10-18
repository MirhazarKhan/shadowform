var THREE=require('three'),settings=require('./core/settings'),level=require('./level');
var effect=new THREE.Vector4(0,0,0,0),direction=new THREE.Vector3(),origin=new THREE.Vector3(),destination=new THREE.Vector3(),dashDirection=new THREE.Vector3(),mesh,positions,uvs,positionAttribute,clock=0,dashLife=0,dashLength=0,dashHeight=8;
var arcs=3,segments=12,points=new Float32Array((segments+1)*3);
exports.init=function(scene){
 positions=new Float32Array(arcs*segments*18);uvs=new Float32Array(arcs*segments*12);
 for(var i=0;i<arcs*segments;i++)uvs.set([-1,0,1,0,-1,1,1,0,1,1,-1,1],i*12);
 var geometry=new THREE.BufferGeometry();positionAttribute=new THREE.BufferAttribute(positions,3);positionAttribute.dynamic=true;geometry.addAttribute('position',positionAttribute);geometry.addAttribute('uv',new THREE.BufferAttribute(uvs,2));
 var material=new THREE.ShaderMaterial({uniforms:{opacity:{type:'f',value:0}},vertexShader:'varying vec2 vArc;void main(){vArc=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform float opacity;varying vec2 vArc;void main(){float rim=max(0.0,1.0-abs(vArc.x));float core=pow(rim,9.0);vec3 color=mix(vec3(.72,.006,.035),vec3(1.0,.48,.48),core);gl_FragColor=vec4(color,opacity*rim*.85);}',transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
 mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=3;mesh.visible=false;scene.add(mesh);settings.speedEffect=effect;
};
exports.reset=function(){clock=dashLife=dashLength=0;effect.set(0,0,0,0);if(mesh)mesh.visible=false;};
exports.suspend=function(){effect.w=0;if(mesh)mesh.visible=false;};
exports.dash=function(from,to,low){origin.copy(from);destination.copy(to);dashDirection.copy(to).sub(from);dashDirection.y=0;dashLength=dashDirection.length();dashDirection.normalize();dashHeight=low?2.2:8;dashLife=.48;direction.copy(dashDirection);};
function lightning(core,dt,camera){
 dashLife=Math.max(0,dashLife-dt);mesh.visible=dashLife>0&&dashLength>1;
 if(!mesh.visible)return;
 var travelled=Math.max(0,Math.min(dashLength,(core.x-origin.x)*dashDirection.x+(core.z-origin.z)*dashDirection.z)),extent=Math.min(68,travelled),tick=Math.floor(clock*32),sideX=-dashDirection.z,sideZ=dashDirection.x;
 if(extent<.5){mesh.visible=false;return;}
 mesh.material.uniforms.opacity.value=Math.min(1,dashLife/.16)*.85;
 for(var a=0;a<arcs;a++){
  for(var i=0;i<=segments;i++){
   var t=i/segments,distance=travelled-extent*t,x=origin.x+dashDirection.x*distance,z=origin.z+dashDirection.z*distance,fade=Math.sin(t*Math.PI),noise=Math.sin(i*31.7+a*19.3+tick*7.9),side=(noise*1.45+(a-1)*.7)*fade;
   points[i*3]=x+sideX*side;points[i*3+1]=level.supportHeight(x,z,Math.max(origin.y,destination.y)+.08)+dashHeight+Math.cos(i*21.3+a*12.1+tick*3.7)*fade*1.15;points[i*3+2]=z+sideZ*side;
  }
  for(i=0;i<segments;i++){
   var p=i*3,q=p+3,base=(a*segments+i)*18,width=(a===0?.48:.28)*(1-.55*i/segments),tx=points[q]-points[p],ty=points[q+1]-points[p+1],tz=points[q+2]-points[p+2],cx=camera.position.x-points[p],cy=camera.position.y-points[p+1],cz=camera.position.z-points[p+2],wx=ty*cz-tz*cy,wy=tz*cx-tx*cz,wz=tx*cy-ty*cx,length=Math.sqrt(wx*wx+wy*wy+wz*wz);
   if(length<.001){wx=sideX;wy=0;wz=sideZ;length=1;}wx*=width/length;wy*=width/length;wz*=width/length;
   positions[base]=points[p]-wx;positions[base+1]=points[p+1]-wy;positions[base+2]=points[p+2]-wz;
   positions[base+3]=points[p]+wx;positions[base+4]=points[p+1]+wy;positions[base+5]=points[p+2]+wz;
   positions[base+6]=points[q]-wx;positions[base+7]=points[q+1]-wy;positions[base+8]=points[q+2]-wz;
   positions[base+9]=points[p]+wx;positions[base+10]=points[p+1]+wy;positions[base+11]=points[p+2]+wz;
   positions[base+12]=points[q]+wx;positions[base+13]=points[q+1]+wy;positions[base+14]=points[q+2]+wz;
   positions[base+15]=points[q]-wx;positions[base+16]=points[q+1]-wy;positions[base+17]=points[q+2]-wz;
  }
 }
 positionAttribute.needsUpdate=true;
}
// Visual shutter only: the simulation keeps its ordinary curl and lifetime.
exports.update=function(dt,core,previous,sprinting,dashing,active,camera){
 if(!active){exports.suspend();return;}clock+=dt;
 var travelSpeed=core.distanceTo(previous)/Math.max(.001,dt),progress=Math.max(0,Math.min(1,(travelSpeed-12)/40));var target=dashing?2.35:sprinting?progress:0,response=1-Math.exp(-dt*(dashing?30:target>effect.w?14:15));
 if(dashing)direction.copy(dashDirection);else if(sprinting){direction.copy(core).sub(previous);if(direction.lengthSq()>.000001)direction.normalize();}
 effect.x=direction.x;effect.y=direction.y;effect.z=direction.z;effect.w+=(target-effect.w)*response;if(effect.w<.001)effect.w=0;
 lightning(core,dt,camera);
};
