// The Spirit, Edan Kwan (MIT): analytic 4D simplex derivatives and curl.
// Ported to WGSL; lifetime/advection remain entirely GPU resident.
// camera.xyz stores the curl-field origin; camera.w is immutable atlas capacity.
struct Uniforms { vp:mat4x4<f32>,view:mat4x4<f32>,core:vec4<f32>,clock:vec4<f32>,style:vec4<f32>,camera:vec4<f32>,motion:vec4<f32>,flow:vec4<f32>,effects:vec4<f32>,consume:vec4<f32>,wall:vec4<f32>,speed:vec4<f32> }
struct Particle { position:vec4<f32>,velocity:vec4<f32> }
@group(0) @binding(0) var<uniform> u:Uniforms;
@group(0) @binding(1) var<storage,read> source:array<Particle>;
@group(0) @binding(2) var<storage,read_write> destination:array<Particle>;
@group(0) @binding(3) var<storage,read> targets:array<vec4<f32>>;
struct Box {center:vec4<f32>,size:vec4<f32>}
@group(0) @binding(4) var<storage,read> obstacles:array<Box>;
fn mod289v(x:vec4<f32>)->vec4<f32>{return x-floor(x/289.0)*289.0;}
fn mod289f(x:f32)->f32{return x-floor(x/289.0)*289.0;}
fn permv(x:vec4<f32>)->vec4<f32>{return mod289v(((x*34.0)+1.0)*x);}
fn permf(x:f32)->f32{return mod289f(((x*34.0)+1.0)*x);}
fn grad4(j:f32)->vec4<f32>{let ip=vec3<f32>(1.0/294.0,1.0/49.0,1.0/7.0);let xyz=floor(fract(vec3<f32>(j)*ip)*7.0)*ip.z-1.0;let w=1.5-dot(abs(xyz),vec3<f32>(1.0));let p=vec4<f32>(xyz,w);let s=select(vec4<f32>(0.0),vec4<f32>(1.0),p<vec4<f32>(0.0));return vec4<f32>(xyz+(s.xyz*2.0-1.0)*s.w,w);}
fn contribution(x:vec4<f32>,p:vec4<f32>)->vec4<f32>{let m=max(.5-dot(x,x),0.0);return -6.0*m*m*dot(p,x)*x+m*m*m*p;}
fn snoise4(v:vec4<f32>)->vec4<f32>{
 let c=vec4<f32>(.138196601125011,.276393202250021,.414589803375032,-.447213595499958);
 var i=floor(v+dot(v,vec4<f32>(.309016994374947451)));
 let x0=v-i+dot(i,vec4<f32>(c.x));
 let isx=step(x0.yzw,vec3<f32>(x0.x));let isyz=step(x0.zww,x0.yyz);
 let i0=vec4<f32>(isx.x+isx.y+isx.z,1.0-isx.x+isyz.x+isyz.y,1.0-isx.y+1.0-isyz.x+isyz.z,1.0-isx.z+1.0-isyz.y+1.0-isyz.z);
 let i3=clamp(i0,vec4<f32>(0.0),vec4<f32>(1.0));let i2=clamp(i0-1.0,vec4<f32>(0.0),vec4<f32>(1.0));let i1=clamp(i0-2.0,vec4<f32>(0.0),vec4<f32>(1.0));
 let x1=x0-i1+c.x;let x2=x0-i2+c.y;let x3=x0-i3+c.z;let x4=x0+c.w;i=mod289v(i);
 let j0=permf(permf(permf(permf(i.w)+i.z)+i.y)+i.x);
 let j1=permv(permv(permv(permv(i.w+vec4<f32>(i1.w,i2.w,i3.w,1.0))+i.z+vec4<f32>(i1.z,i2.z,i3.z,1.0))+i.y+vec4<f32>(i1.y,i2.y,i3.y,1.0))+i.x+vec4<f32>(i1.x,i2.x,i3.x,1.0));
 var p0=grad4(j0);var p1=grad4(j1.x);var p2=grad4(j1.y);var p3=grad4(j1.z);var p4=grad4(j1.w);
 let norm=1.79284291400159-.85373472095314*vec4<f32>(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3));
 p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;p4*=1.79284291400159-.85373472095314*dot(p4,p4);
 return (contribution(x0,p0)+contribution(x1,p1)+contribution(x2,p2)+contribution(x3,p3)+contribution(x4,p4))*49.0;
}
fn curl(p:vec3<f32>,t:f32,detail:f32)->vec3<f32>{var dx=vec4<f32>(0.0);var dy=dx;var dz=dx;var frequency=1.0;var persistence=1.0;for(var i=0;i<3;i++){let scale=.5*frequency*persistence;dx+=snoise4(vec4<f32>(p*frequency,t))*scale;dy+=snoise4(vec4<f32>((p+vec3<f32>(123.4,129845.6,-1239.1))*frequency,t))*scale;dz+=snoise4(vec4<f32>((p+vec3<f32>(-9519.0,9051.0,-123.0))*frequency,t))*scale;frequency*=2.0;persistence*=detail;}return vec3<f32>(dz.y-dy.z,dx.z-dz.x,dy.x-dx.y);}
@compute @workgroup_size(128)
fn simulate(@builtin(global_invocation_id) invocation:vec3<u32>){
 let id=invocation.x;let count=u32(u.style.w);if(id>=count){return;}
 let activity=select(clamp(u.flow.w,0.0,1.0),0.0,u.flow.w<.002);let wake=smoothstep(.03,.36,activity);let form=u32(u.core.w);let seed=targets[id].w;var local=targets[form*u32(u.camera.w)+id].xyz;
 if(form>0u){let co=cos(u.clock.w);let si=sin(u.clock.w);local=vec3<f32>(co*local.x+si*local.z,local.y,-si*local.x+co*local.z);}
 if(form==0u){local.y*=mix(1.0,.28,u.style.x);let angle=u.clock.w+seed*.6;let co=cos(angle);let si=sin(angle);local=vec3<f32>(co*local.x+si*local.z,local.y,-si*local.x+co*local.z);let breath=1.0+sin(u.clock.x*15.0)*.12*activity;local*=vec3<f32>(breath,1.0,breath);local-=u.flow.xyz*(2.0+seed*5.0)*activity;local-=u.wall.xyz*dot(local,u.wall.xyz)*u.wall.w*.94;}
 let attractor=u.core.xyz+local;let old=source[id];var p=old.position.xyz;if(form==0u){p+=u.motion.xyz;}var life=old.position.w-u.clock.y*select(.006,.015*mix(.4,1.0,min(1.0,activity*1.5)),form==0u);
 var refreshed=life<=0.0||distance(p,u.core.xyz)>140.0||id>=u32(u.style.z);if(refreshed){p=attractor;life=.5+fract(seed*21.4131+u.clock.x);}
 if(form==0u){
  // Original Spirit follow law: keys move the emitter, never the whole cloud.
  // A common emitter holds a living cloud together without individual body anchors.
  if(!refreshed){let follow=u.core.xyz+vec3<f32>(0.0,mix(9.0,2.5,u.style.x),0.0);let delta=follow-p;let pull=(.005+life*.01)*(1.0-smoothstep(18.0,110.0,length(delta)));p+=delta*pull*u.clock.y*mix(.6,1.0,wake);
   // Gentle curl and particle renewal continue at rest; movement strengthens the wake.
   let turbulence=curl((p-u.camera.xyz)*.055,u.clock.x,.1+(1.0-life)*.1);p+=turbulence*mix(.14,.52,activity)*u.clock.y;}
  if(u.consume.w>=0.0){let h=1.0-2.0*fract(seed*17.17);let angle=seed*137.508+u.clock.x*3.0;let radius=mix(7.8,.85,smoothstep(.65,1.0,u.consume.w));let shell=u.consume.xyz+vec3<f32>(cos(angle)*sqrt(max(0.0,1.0-h*h)),h,sin(angle)*sqrt(max(0.0,1.0-h*h)))*radius;p=mix(p,shell,smoothstep(.15,.65,u.consume.w)*(1.0-pow(.48,u.clock.y)));}
  p-=u.wall.xyz*dot(p-u.core.xyz,u.wall.xyz)*u.wall.w*.97;p.y=max(u.core.y+.25-22.0*activity*u.wall.w,p.y);if(u.style.x>.5){p.y=min(p.y,u.core.y+4.4);}
  // Signed box contact: the vapor presses onto and flows around local geometry.
  for(var i=0u;i<u32(u.effects.w);i++){let b=obstacles[i];let q=p-b.center.xyz;let half=b.size.xyz*.5;let penetration=half+vec3<f32>(1.2)-abs(q);if(all(penetration>vec3<f32>(0.0))){if(penetration.x<=penetration.y&&penetration.x<=penetration.z){p.x=b.center.x+select(-1.0,1.0,q.x>=0.0)*(half.x+.7);}else if(penetration.y<=penetration.z){p.y=b.center.y+select(-1.0,1.0,q.y>=0.0)*(half.y+.7);}else{p.z=b.center.z+select(-1.0,1.0,q.z>=0.0)*(half.z+.7);}}}
 }
 else{let outward=clamp(length(local-vec3<f32>(0.0,8.0,0.0))/16.0,0.0,1.0);let shell=smoothstep(0.0,.16,u.clock.z-(1.0-outward)*.42);p=mix(p,attractor,(1.0-pow(.67,u.clock.y))*shell);if(u.clock.z<1.0){p+=curl(p*.065,u.clock.x*.3,.12)*u.clock.y*.014*(1.0-u.clock.z);}}
 destination[id].position=vec4<f32>(p,life);destination[id].velocity=vec4<f32>((p-select(old.position.xyz+select(vec3<f32>(0.0),u.motion.xyz,form==0u),attractor,refreshed))/max(.001,u.clock.y),select(seed,-seed-.0001,refreshed));
}
