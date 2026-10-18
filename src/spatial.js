// Static broad phase. Queries keep exact 3D slab tests, without allocating
// arrays or scanning the entire level for each patrol ray.
var cellSize=32,cells=Object.create(null),volumes=[],stamp=0;
exports.build=function(boxes,depth){
 cells=Object.create(null);volumes=[];var seen=Object.create(null),all=boxes.concat(depth);
 for(var i=0;i<all.length;i++){var b=all[i],key=[b.x,b.y||0,b.z,b.w,b.h,b.d].join(':');if(seen[key])continue;seen[key]=true;var v={box:b,stamp:0};volumes.push(v);
  for(var x=Math.floor((b.x-b.w/2-4)/cellSize);x<=Math.floor((b.x+b.w/2+4)/cellSize);x++)for(var z=Math.floor((b.z-b.d/2-4)/cellSize);z<=Math.floor((b.z+b.d/2+4)/cellSize);z++){key=x+','+z;if(!cells[key])cells[key]=[];cells[key].push(v);}
 }
};
exports.entry=function(a,b,box,pad){
 if(box.disabled)return Infinity;pad=pad||0;var near=0,far=1,t1,t2,swap,delta=b.x-a.x,lo=box.x-box.w/2-pad,hi=box.x+box.w/2+pad;
 if(Math.abs(delta)<.000001){if(a.x<lo||a.x>hi)return Infinity;}else{t1=(lo-a.x)/delta;t2=(hi-a.x)/delta;if(t1>t2){swap=t1;t1=t2;t2=swap;}near=Math.max(near,t1);far=Math.min(far,t2);if(near>far)return Infinity;}
 delta=b.y-a.y;lo=(box.y||0)-pad;hi=(box.y||0)+box.h+pad;
 if(Math.abs(delta)<.000001){if(a.y<lo||a.y>hi)return Infinity;}else{t1=(lo-a.y)/delta;t2=(hi-a.y)/delta;if(t1>t2){swap=t1;t1=t2;t2=swap;}near=Math.max(near,t1);far=Math.min(far,t2);if(near>far)return Infinity;}
 delta=b.z-a.z;lo=box.z-box.d/2-pad;hi=box.z+box.d/2+pad;
 if(Math.abs(delta)<.000001){if(a.z<lo||a.z>hi)return Infinity;}else{t1=(lo-a.z)/delta;t2=(hi-a.z)/delta;if(t1>t2){swap=t1;t1=t2;t2=swap;}near=Math.max(near,t1);far=Math.min(far,t2);if(near>far)return Infinity;}
 return near;
};
exports.firstHit=function(a,b,pad){
 var x=Math.floor(a.x/cellSize),z=Math.floor(a.z/cellSize),endX=Math.floor(b.x/cellSize),endZ=Math.floor(b.z/cellSize),dx=b.x-a.x,dz=b.z-a.z,sx=dx<0?-1:1,sz=dz<0?-1:1;
 var tx=dx===0?Infinity:((x+(sx>0?1:0))*cellSize-a.x)/dx,tz=dz===0?Infinity:((z+(sz>0?1:0))*cellSize-a.z)/dz,stepX=dx===0?Infinity:cellSize/Math.abs(dx),stepZ=dz===0?Infinity:cellSize/Math.abs(dz),nearest=Infinity;stamp++;
 for(var steps=0;steps<256;steps++){var list=cells[x+','+z];if(list)for(var i=0;i<list.length;i++){var v=list[i];if(v.stamp===stamp)continue;v.stamp=stamp;nearest=Math.min(nearest,exports.entry(a,b,v.box,pad));}if(x===endX&&z===endZ)break;if(tx<tz){if(tx>nearest)break;x+=sx;tx+=stepX;}else{if(tz>nearest)break;z+=sz;tz+=stepZ;}}
 return nearest;
};
