var THREE=require('three'),level=require('./level');
var surface=null,mantle=null,signal=new THREE.Vector4(),from=new THREE.Vector3(),to=new THREE.Vector3();
var offset=3.8,bodyHeight=18,probe={x:0,y:0,z:0},normal={x:0,z:0};
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function clear(p,ignore){if(!level.walkable(p.x,p.z))return false;var volumes=level.depthBoxes;for(var i=0;i<volumes.length;i++){var b=volumes[i];if(b.disabled||b===ignore)continue;if(ignore&&b.x===ignore.x&&b.y===ignore.y&&b.z===ignore.z&&b.w===ignore.w&&b.h===ignore.h&&b.d===ignore.d)continue;if(Math.abs(p.x-b.x)<b.w/2+3.5&&Math.abs(p.z-b.z)<b.d/2+3.5&&p.y+bodyHeight>b.y+.08&&p.y<b.y+b.h-.08)return false;}return true;}
// Only actual solid architecture is climbable. Shutters and mimic props stay interactive.
exports.near=function(p,forward){var best=null,score=Infinity;for(var i=0;i<level.boxes.length;i++){var b=level.boxes[i];if(b.disabled||!b.wall||b.gate||b.h<14||p.y<b.y-1||p.y>b.y+b.h-1)continue;for(var face=0;face<4;face++){var nx=face<2?(face===0?1:-1):0,nz=face<2?0:(face===2?1:-1),extent=nx?b.d:b.w;if(extent<8||forward.x*nx+forward.z*nz>-.15)continue;var d=nx?(p.x-b.x)*nx-b.w/2:(p.z-b.z)*nz-b.d/2,tangent=nx?p.z-b.z:p.x-b.x;if(d<2.5||d>10||Math.abs(tangent)>extent/2-1.2)continue;probe.x=nx?b.x+nx*(b.w/2+offset):p.x;probe.y=p.y;probe.z=nz?b.z+nz*(b.d/2+offset):p.z;if(clear(probe,b)&&d<score){score=d;best={box:b,nx:nx,nz:nz,distance:d};}}}return best;};
exports.attach=function(p,candidate){if(!candidate)return false;surface=candidate;mantle=null;normal.x=surface.nx;normal.z=surface.nz;if(normal.x)p.x=surface.box.x+normal.x*(surface.box.w/2+offset);else p.z=surface.box.z+normal.z*(surface.box.d/2+offset);p.wall=true;p.low=false;signal.set(normal.x,0,normal.z,signal.w);return true;};
exports.release=function(p){surface=mantle=null;p.wall=false;};
exports.reset=function(p){exports.release(p);normal.x=normal.z=0;signal.set(0,0,0,0);};
exports.active=function(){return !!surface;};
exports.mantling=function(){return !!mantle;};
exports.update=function(p,strafe,vertical,dt){if(!surface)return false;if(surface.box.disabled){exports.release(p);return false;}var oldX=p.x,oldY=p.y,oldZ=p.z,b=surface.box;
 if(mantle){mantle.phase=Math.min(1,mantle.phase+dt/.34);var t=mantle.phase,e=t*t*(3-2*t);p.y=from.y+(to.y-from.y)*Math.min(1,e*3);var cross=clamp((e-.33)/.67,0,1);p.x=from.x+(to.x-from.x)*cross;p.z=from.z+(to.z-from.z)*cross;if(t===1){p.copy(to);exports.release(p);}return p.x!==oldX||p.y!==oldY||p.z!==oldZ;}
 var length=Math.sqrt(strafe*strafe+vertical*vertical),speed=22;if(length){strafe/=length;vertical/=length;}var tx=normal.z,tz=-normal.x,span=(normal.x?b.d:b.w)/2-1.2;
 probe.x=normal.x?p.x:clamp(p.x+tx*strafe*speed*dt,b.x-span,b.x+span);probe.z=normal.z?p.z:clamp(p.z+tz*strafe*speed*dt,b.z-span,b.z+span);probe.y=p.y;
 if(clear(probe,b)){p.x=probe.x;p.z=probe.z;}
 var ground=level.height(p.x,p.z),top=b.top===undefined?b.y+b.h:b.top;probe.x=p.x;probe.z=p.z;probe.y=clamp(p.y+vertical*speed*dt,Math.max(b.y,ground),top);
 if(clear(probe,b))p.y=probe.y;
 if(vertical>0&&p.y>=top-.75){to.set(p.x-normal.x*(offset+4.5),top,p.z-normal.z*(offset+4.5));if(clear(to,b)){from.copy(p);mantle={phase:0};}}
 if(vertical<0&&p.y<=ground+.01)exports.release(p);
 return p.x!==oldX||p.y!==oldY||p.z!==oldZ;
};
exports.uniform=function(dt){signal.w+=((surface?1:0)-signal.w)*(1-Math.exp(-dt*12));if(signal.w<.001)signal.w=0;return signal;};
exports.getState=function(){return {attached:!!surface,mantling:!!mantle,normal:{x:normal.x,z:normal.z},blend:signal.w};};
