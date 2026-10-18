attribute vec2 fboUV;
attribute vec3 positionFlip;
attribute float particleSeed;
uniform highp sampler2D state,previousState;
uniform mat4 previousVP;
uniform float viewport,frameRatio,count,flipRatio;
uniform vec2 screen;
uniform vec4 speedEffect;
varying float life,seed,depth,nearFade,fold;
void main(){
 vec4 p=texture2D(state,fboUV),previous=texture2D(previousState,fboUV);
 bool born=p.w>previous.w;
 seed=particleSeed;life=p.w;
 vec4 v=modelViewMatrix*vec4(p.xyz,1.0),center=projectionMatrix*v;
 depth=-v.z;nearFade=smoothstep(5.5,18.0,depth);
 vec4 oldClip=previousVP*vec4(born?p.xyz:previous.xyz,1.0);
 vec2 travel=frameRatio>0.0?(center.xy/max(.001,center.w)-oldClip.xy/max(.001,oldClip.w))*screen*.5:vec2(0.0);
 // A short exposure stretches each original facet along its actual screen travel.
 float shutter=.18+min(2.5,speedEffect.w)*.16;
 float span=min(length(travel)*shutter,2.0+min(2.5,speedEffect.w)*5.0);
 vec2 direction=normalize(travel+vec2(.00001,0.0));
 vec2 corner=mix(position.xy,positionFlip.xy,flipRatio);
 float size=.14*min(3.0,sqrt(65536.0/max(1.0,count)))*smoothstep(0.0,.2,life)*nearFade;
 vec2 offset=corner*size;
 float along=dot(corner,direction);
 offset+=direction*along*span*max(1.0,depth)/max(1.0,viewport);
 v.xy+=offset;
 gl_Position=projectionMatrix*v;
 vec3 velocity=p.xyz-previous.xyz;
 fold=.66+.34*clamp(.5+dot(normalize(velocity+vec3(.001,.001,0.0)),vec3(-.43,.62,.65))*.5,0.0,1.0);
 if(depth<2.0)gl_Position=vec4(2.0,2.0,2.0,1.0);
}
