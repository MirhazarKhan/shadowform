var THREE=require('three'),velocity=new THREE.Vector3(),step=new THREE.Vector3();
exports.reset=function(){velocity.set(0,0,0);step.set(0,0,0);};
// Integrate the response analytically so acceleration feels the same at any FPS.
exports.step=function(strafe,forward,direction,speed,dt){
 var length=Math.sqrt(strafe*strafe+forward*forward),x=0,z=0;
 if(length){x=(direction.forward.x*forward+direction.right.x*strafe)*speed/length;z=(direction.forward.z*forward+direction.right.z*strafe)*speed/length;}
 var reversing=x*velocity.x+z*velocity.z<0,response=!length?22:reversing?24:18,decay=Math.exp(-dt*response),integral=(1-decay)/response;
 step.set(x*dt+(velocity.x-x)*integral,0,z*dt+(velocity.z-z)*integral);
 velocity.x=x+(velocity.x-x)*decay;velocity.z=z+(velocity.z-z)*decay;
 if(!length&&velocity.lengthSq()<.0025)exports.reset();return step;
};
exports.contact=function(dx,dz){if(Math.abs(step.x)>.00001&&Math.abs(dx)<Math.abs(step.x)*.05)velocity.x=0;if(Math.abs(step.z)>.00001&&Math.abs(dz)<Math.abs(step.z)*.05)velocity.z=0;};
exports.velocity=function(){return velocity;};
