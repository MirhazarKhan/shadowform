uniform vec2 resolution;
uniform highp sampler2D texturePosition,textureDefaultPosition,textureShape;
uniform float shape,time,speed,dieSpeed,radius,curlSize,attraction,initAnimation,morph,heading,low;
uniform vec3 mouse3d,transport,flow,fieldOrigin;
uniform vec4 consume,wall;
uniform float motionAmount;
uniform highp sampler2D environmentCollision;
uniform float collisionCount,activeCount,previousActiveCount;
#pragma glslify: curl = require(./helpers/curl4)
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;vec4 state=texture2D(texturePosition,uv);if(floor(gl_FragCoord.y)*resolution.x+floor(gl_FragCoord.x)>=activeCount){gl_FragColor=state;return;}vec4 seed=texture2D(textureShape,vec2(uv.x,uv.y/8.0));
 float activity=motionAmount<.002?0.0:clamp(motionAmount,0.0,1.0);float wake=smoothstep(.03,.36,activity);vec3 local=shape<.5?seed.xyz:texture2D(textureShape,vec2(uv.x,(uv.y+shape)/8.0)).xyz;
 if(shape>.5)local.xz=mat2(cos(heading),-sin(heading),sin(heading),cos(heading))*local.xz;
 if(shape<.5){local.y*=mix(1.0,.28,low);float angle=heading+seed.w*.6;local.xz=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*local.xz;local.xz*=1.0+sin(time*15.0)*.12*activity;local-=flow*(2.0+seed.w*5.0)*activity;local-=wall.xyz*dot(local,wall.xyz)*wall.w*.94;}
 vec3 target=mouse3d+local,pos=state.xyz;if(shape<.5)pos+=transport;float life=state.w-dieSpeed*(shape<.5?mix(.4,1.0,min(1.0,activity*1.5)):.4);
 bool refreshed=life<=0.0||distance(pos,mouse3d)>140.0||floor(gl_FragCoord.y)*resolution.x+floor(gl_FragCoord.x)>=previousActiveCount;
 if(refreshed){pos=target;life=.5+fract(seed.w*21.4131+time);}
 if(shape<.5){
  // Spirit's mouse-follow force, driven by the keyboard emitter in world space.
  // Keep the cloud cohesive around one emitter while letting every particle flow.
  if(!refreshed){vec3 delta=mouse3d+vec3(0.0,mix(9.0,2.5,low),0.0)-pos;float pull=(.005+life*.01)*(1.0-smoothstep(18.0,110.0,length(delta)));pos+=delta*pull*speed*mix(.6,1.0,wake);
   pos+=curl((pos-fieldOrigin)*curlSize,time,.1+(1.0-life)*.1)*speed*mix(.14,.52,activity);}
  if(consume.w>=0.0){float h=1.0-2.0*fract(seed.w*17.17),angle=seed.w*137.508+time*3.0,r=mix(7.8,.85,smoothstep(.65,1.0,consume.w));vec3 shell=consume.xyz+vec3(cos(angle)*sqrt(max(0.0,1.0-h*h)),h,sin(angle)*sqrt(max(0.0,1.0-h*h)))*r;pos=mix(pos,shell,smoothstep(.15,.65,consume.w)*(1.0-pow(.48,speed)));}
  pos-=wall.xyz*dot(pos-mouse3d,wall.xyz)*wall.w*.97;pos.y=max(mouse3d.y+.25-22.0*activity*wall.w,pos.y);if(low>.5)pos.y=min(pos.y,mouse3d.y+4.4);
  for(int i=0;i<12;i++){if(float(i)>=collisionCount)break;vec3 center=texture2D(environmentCollision,vec2((float(i)+.5)/12.0,.25)).xyz,halfSize=texture2D(environmentCollision,vec2((float(i)+.5)/12.0,.75)).xyz*.5,q=pos-center,penetration=halfSize+1.2-abs(q);if(all(greaterThan(penetration,vec3(0.0)))){if(penetration.x<=penetration.y&&penetration.x<=penetration.z)pos.x=center.x+(q.x>=0.0?1.0:-1.0)*(halfSize.x+.7);else if(penetration.y<=penetration.z)pos.y=center.y+(q.y>=0.0?1.0:-1.0)*(halfSize.y+.7);else pos.z=center.z+(q.z>=0.0?1.0:-1.0)*(halfSize.z+.7);}}

 }else{
  float outward=clamp(length(local-vec3(0.0,8.0,0.0))/16.0,0.0,1.0);
  float shell=smoothstep(0.0,.16,morph-(1.0-outward)*.42);
  pos=mix(pos,target,(1.0-pow(.67,speed))*shell);
  if(morph<1.0)pos+=curl(pos*.065,time*.3,.12)*speed*.014*(1.0-morph);
 }
 gl_FragColor=vec4(pos,life);
}
