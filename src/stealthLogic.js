var level=require('./level'),spatial=require('./spatial');
exports.DASH_RANGE=180;
exports.distance=function(a,b){var x=a.x-b.x,z=a.z-b.z;return Math.sqrt(x*x+z*z);};
exports.inside=function(p,b,pad){return Math.abs(p.x-b.x)<b.w/2+(pad||0)&&Math.abs(p.z-b.z)<b.d/2+(pad||0);};
exports.segmentBox=function(a,b,box,pad){return spatial.entry(a,b,box,pad)!==Infinity;};
var sightStart={x:0,y:0,z:0},sightEnd={x:0,y:0,z:0},sample={x:0,y:0,z:0,sightHeight:9};
exports.clearSight=function(a,b){sightStart.x=a.x;sightStart.y=a.eye!==undefined?a.eye:(a.y===undefined?level.height(a.x,a.z):a.y)+16;sightStart.z=a.z;sightEnd.x=b.x;sightEnd.y=(b.y||0)+(b.sightHeight!==undefined?b.sightHeight:b.low?2.4:9);sightEnd.z=b.z;return spatial.firstHit(sightStart,sightEnd,0)===Infinity;};
exports.coneRange=function(g,angle){sightStart.x=g.x;sightStart.y=g.eye;sightStart.z=g.z;sightEnd.x=g.x+Math.sin(angle)*g.range;sightEnd.y=g.y+9;sightEnd.z=g.z+Math.cos(angle)*g.range;return Math.min(1,spatial.firstHit(sightStart,sightEnd,0))*g.range;};
// Four silhouette samples let a low obstacle hide vapor while an exposed upper
// edge gives only a partial signature. Solid geometry remains fully opaque.
exports.visibility=function(g,p){var dx=p.x-g.x,dz=p.z-g.z,dist=Math.sqrt(dx*dx+dz*dz);if(dist>g.range)return 0;var facing=(dx*Math.sin(g.angle)+dz*Math.cos(g.angle))/Math.max(.001,dist);if(dist>=7&&facing<=Math.cos(g.halfAngle||.52))return 0;
 sample.x=p.x;sample.y=p.y;sample.z=p.z;sample.sightHeight=p.low?2.4:9;var visible=exports.clearSight(g,sample)?.55:0;sample.sightHeight=p.low?4.2:17;visible+=exports.clearSight(g,sample)?.25:0;sample.sightHeight=p.low?2.8:9;
 var sideX=dz/Math.max(1,dist)*2.5,sideZ=-dx/Math.max(1,dist)*2.5;sample.x=p.x+sideX;sample.z=p.z+sideZ;visible+=exports.clearSight(g,sample)?.1:0;sample.x=p.x-sideX;sample.z=p.z-sideZ;visible+=exports.clearSight(g,sample)?.1:0;return visible;};
exports.sees=function(g,p){g.visibility=exports.visibility(g,p);return g.visibility>0;};
exports.detectionRate=function(g,p,moving,burst,light){var proximity=Math.max(0,1-exports.distance(g,p)/g.range),visibility=g.visibility===undefined?1:g.visibility;return (moving?burst?1.65:.96:.32)*(p.low?.34:1)*(.3+.7*proximity)*(light?2.1:p.exposure||.7)*visibility;};
exports.hears=function(g,event){var distance=exports.distance(g,event);if(Math.abs(g.y-event.y)>18||distance>event.radius)return false;return exports.clearSight(g,event)||distance<event.radius*.32;};
exports.inBeam=function(sensor,p){var eye={x:sensor.x,y:sensor.eye,z:sensor.z},v={x:p.x-eye.x,y:p.y+(p.low?2:9)-eye.y,z:p.z-eye.z},d=Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z);if(d>sensor.range)return false;var dot=(v.x*sensor.direction.x+v.y*sensor.direction.y+v.z*sensor.direction.z)/Math.max(d,.001);return dot>Math.cos(sensor.halfAngle)&&exports.clearSight(sensor,p);};
exports.blocked=function(p,low,ignoreGate){var height=low?4.8:18;return level.boxes.some(function(b){return !b.disabled&&!(ignoreGate&&b.gate)&&exports.inside(p,b,3.5)&&p.y+height>(b.y||0)&&p.y<(b.y||0)+b.h;});};
exports.move=function(p,dx,dz,low){var ox=p.x,oz=p.z,oy=p.y;function valid(){var h=p.spirit?level.supportHeight(p.x,p.z,oy+4):level.height(p.x,p.z);if(!level.walkable(p.x,p.z)||h-oy>4)return false;p.y=h<oy-4?oy:h;return !exports.blocked(p,low);}
 p.x+=dx;if(!valid()){p.x=ox;p.y=oy;}var ix=p.x,iy=p.y;p.z+=dz;if(!valid()){p.x=ix;p.z=oz;p.y=iy;}return exports.distance(p,{x:ox,z:oz})>.001;};
exports.dashPoint=function(a,b,t,out){out=out||{};var e=t*t*(3-2*t);out.x=a.x+(b.x-a.x)*e;out.z=a.z+(b.z-a.z)*e;out.y=a.spirit?level.supportHeight(out.x,out.z,Math.max(a.y,b.y)+.08):level.height(out.x,out.z);return out;};
exports.landing=function(a,b,low){var distance=exports.distance(a,b);if(distance>exports.DASH_RANGE+.0001||!level.walkable(b.x,b.z)||exports.blocked(b,low))return false;
 // Validate the existing stance throughout the straight corridor. A dash never
 // shrinks the player to pass through cover or a shutter; C must be held first.
 var height=low?4.8:18,steps=Math.max(8,Math.ceil(distance/3.8)),previous={x:a.x,y:a.y,z:a.z},p={x:0,y:0,z:0},start={x:0,y:0,z:0},end={x:0,y:0,z:0};for(var i=1;i<=steps;i++){exports.dashPoint(a,b,i/steps,p);if(!level.walkable(p.x,p.z)||exports.blocked(p,low))return false;for(var j=0;j<3;j++){var offset=j===0?.35:j===1?height*.5:height-.35;start.x=previous.x;start.y=previous.y+offset;start.z=previous.z;end.x=p.x;end.y=p.y+offset;end.z=p.z;if(spatial.firstHit(start,end,.12)!==Infinity)return false;}previous.x=p.x;previous.y=p.y;previous.z=p.z;}return true;};
exports.context=function(p,forward){var best=null,score=Infinity;level.nodes.forEach(function(n){var d=exports.distance(p,n),dx=n.x-p.x,dz=n.z-p.z,dot=(dx*forward.x+dz*forward.z)/Math.max(1,d);if(d<19&&Math.abs(p.y-n.y)<5&&(dot>.25||d<7)&&d<score){best=n;score=d;}});if(best)return best;
 var wall=null;level.boxes.forEach(function(b){if(b.disabled||b.h<22||p.y<(b.y||0)-1||p.y>(b.y||0)+b.h-12)return;var x=Math.max(b.x-b.w/2,Math.min(b.x+b.w/2,p.x)),z=Math.max(b.z-b.d/2,Math.min(b.z+b.d/2,p.z)),dx=x-p.x,dz=z-p.z,d=Math.sqrt(dx*dx+dz*dz);if(d>9||d<.1)return;var dot=(dx*forward.x+dz*forward.z)/d;if(dot<.2)return;var nx=-dx/d,nz=-dz/d;if(!wall||d<wall.distance)wall={form:7,x:x+nx*.25,y:p.y,z:z+nz*.25,heading:Math.atan2(nx,nz),label:'Wall shadow',distance:d};});return wall;};
exports.drain=function(form,spotlight){return (form===7?100/22:form?100/18:0)+(spotlight?form?20:16:0);};
exports.recognizable=function(form,morph,remembered,light,cohesion){return form===0||morph<.75||remembered||(light&&cohesion<25);};
exports.bump=function(guard,p,form){return form>0&&form!==7&&exports.distance(guard,p)<(form===1?10:form===5?9:7)&&Math.abs((guard.y||0)-p.y)<8;};
