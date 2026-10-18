var THREE=require('three'),settings=require('./core/settings');
exports.COUNT=8;
// Immutable target atlas shared by both GPU backends. No particle readback.
var data;
exports.data=function(){
 if(data)return data;var n=settings.simulatorTextureWidth*settings.simulatorTextureHeight;data=new Float32Array(n*exports.COUNT*4);
 for(var s=0;s<exports.COUNT;s++)for(var i=0;i<n;i++){
  var a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random()),t=Math.random(),x=0,y=0,z=0;
  // Vapor births fill an amorphous volume, with no head, torso or limb slots.
  if(s===0){var polar=Math.random()*2-1,volume=Math.pow(Math.random(),1/3),ring=Math.sqrt(1-polar*polar)*volume;x=Math.cos(a)*ring*6.4;y=9+polar*volume*7.4;z=Math.sin(a)*ring*6.4;}
  if(s===1){x=(Math.random()-.5)*14;y=Math.random()*13;z=(Math.random()-.5)*14;var face=i%3;if(face===0)x=(i%2?1:-1)*7;if(face===1)y=i%2?13:0;if(face===2)z=(i%2?1:-1)*7;}
  if(s===2){y=Math.random()*19;var vr=2.2+3.1*Math.sin(y/19*Math.PI);x=Math.cos(a)*vr;z=Math.sin(a)*vr;}
  if(s===3){x=(Math.random()-.5)*11;y=Math.random()*21;z=(Math.random()-.5)*7;if(i%3===0)z=3.5;}
  if(s===4){y=Math.random()*13;var er=y>11?1:2.6;x=Math.cos(a)*er;z=Math.sin(a)*er;}
  if(s===5){x=Math.cos(a)*r*7;y=1.5+Math.random()*3;z=Math.sin(a)*r*7;}
  if(s===6){x=(Math.random()-.5)*18;y=9+Math.random()*4;z=(Math.random()-.5)*5;}
  if(s===7){x=(Math.random()-.5)*19;y=Math.random()*22;z=(Math.random()-.5)*.16;}
  var j=(s*n+i)*4;data[j]=x;data[j+1]=y;data[j+2]=z;data[j+3]=Math.random();
 }return data;
};
exports.create=function(){var tex=new THREE.DataTexture(exports.data(),settings.simulatorTextureWidth,settings.simulatorTextureHeight*exports.COUNT,THREE.RGBAFormat,THREE.FloatType);tex.minFilter=tex.magFilter=THREE.NearestFilter;tex.needsUpdate=true;tex.generateMipmaps=false;tex.flipY=false;return tex;};
