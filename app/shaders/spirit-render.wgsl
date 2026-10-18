struct Uniforms { vp:mat4x4<f32>,view:mat4x4<f32>,core:vec4<f32>,clock:vec4<f32>,style:vec4<f32>,camera:vec4<f32>,motion:vec4<f32>,flow:vec4<f32>,effects:vec4<f32>,consume:vec4<f32>,wall:vec4<f32>,speed:vec4<f32>,previousVP:mat4x4<f32>,spiritColor:vec4<f32> }
struct Particle { position:vec4<f32>,velocity:vec4<f32> }
struct Box { center:vec4<f32>,size:vec4<f32> }
@group(0) @binding(0) var<uniform> u:Uniforms;
@group(0) @binding(1) var<storage,read> particles:array<Particle>;
@group(0) @binding(2) var<storage,read> boxes:array<Box>;
@group(0) @binding(3) var sceneDepth:texture_2d<f32>;
struct Output {@builtin(position) clip:vec4<f32>,@location(0) life:f32,@location(1) seed:f32,@location(2) depth:f32,@location(3) nearFade:f32,@location(4) fold:f32}
@vertex fn particleVertex(@builtin(vertex_index) vertex:u32,@builtin(instance_index) instance:u32)->Output{
 let corners=array<vec2<f32>,3>(vec2<f32>(0.0,-1.0),vec2<f32>(.8660254,.5),vec2<f32>(-.8660254,.5));
 let p=particles[instance];let seed=fract(f32(instance)*.6180339);let born=p.velocity.w<0.0;
 var view=u.view*vec4<f32>(p.position.xyz,1.0);let center=u.vp*vec4<f32>(p.position.xyz,1.0);
 let previous=p.position.xyz-p.velocity.xyz*u.clock.y-u.motion.xyz;
 let oldClip=u.previousVP*vec4<f32>(select(previous,p.position.xyz,born),1.0);
 let travel=select(vec2<f32>(0.0),(center.xy/max(.001,center.w)-oldClip.xy/max(.001,oldClip.w))*u.effects.yz*.5,u.clock.y>0.0);
 let shutter=.18+min(2.5,u.speed.w)*.16;let span=min(length(travel)*shutter,2.0+min(2.5,u.speed.w)*5.0);let direction=normalize(travel+vec2<f32>(.00001,0.0));
 let flip=(instance+u32(floor(u.clock.x*60.0)))%2u;let corner=corners[vertex]*select(-1.0,1.0,flip==1u);
 let nearFade=smoothstep(5.5,18.0,-view.z);let size=.14*min(3.0,sqrt(65536.0/max(1.0,u.style.w)))*smoothstep(0.0,.2,p.position.w)*nearFade;
 var offset=corner*size;offset+=direction*dot(corner,direction)*span*max(1.0,-view.z)/max(1.0,u.effects.z);
 // Billboard facets keep the original animation, with writable self depth.
 var o:Output;
 let right=vec3<f32>(u.view[0].x,u.view[1].x,u.view[2].x);let up=vec3<f32>(u.view[0].y,u.view[1].y,u.view[2].y);
 o.clip=u.vp*vec4<f32>(p.position.xyz+right*offset.x+up*offset.y,1.0);o.clip.z=(o.clip.z+o.clip.w)*.5;
 o.life=p.position.w;o.seed=seed;o.depth=-view.z;o.nearFade=nearFade;
 o.fold=.66+.34*clamp(.5+dot(normalize(p.velocity.xyz+vec3<f32>(.001,.001,0.0)),vec3<f32>(-.43,.62,.65))*.5,0.0,1.0);
 if(-view.z<2.0){o.clip=vec4<f32>(2.0,2.0,2.0,1.0);}return o;
}
@fragment fn particleFragment(o:Output)->@location(0) vec4<f32>{
 let linearDepth=textureLoad(sceneDepth,vec2<i32>(o.clip.xy),0).r;var alpha=smoothstep(0.0,.75,linearDepth-o.depth)*o.nearFade;
 if(u.core.w>.5){alpha*=mix(1.0,.015+.009*sin(u.clock.x*3.4),u.clock.z);}if(alpha<.004){discard;}
 var color=mix(vec3<f32>(.002,.0005,.003),u.spiritColor.xyz,smoothstep(0.0,.7,o.life))*o.fold*(.89+.11*o.seed);
 color+=u.spiritColor.xyz*.08*u.style.y*smoothstep(.2,.75,o.life);
 let grey=dot(color,vec3<f32>(.2126,.7152,.0722));color=mix(color,vec3<f32>(grey*.92),u.effects.x*.9);
 return vec4<f32>(color*alpha,alpha);
}
struct DepthOutput {@builtin(position) clip:vec4<f32>,@location(0) linearDepth:f32}
@vertex fn depthVertex(@builtin(vertex_index) vertex:u32,@builtin(instance_index) instance:u32)->DepthOutput{
 let corners=array<vec3<f32>,8>(vec3<f32>(-1,-1,-1),vec3<f32>(1,-1,-1),vec3<f32>(1,1,-1),vec3<f32>(-1,1,-1),vec3<f32>(-1,-1,1),vec3<f32>(1,-1,1),vec3<f32>(1,1,1),vec3<f32>(-1,1,1));
 let ids=array<u32,36>(0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,3,2,6,3,6,7,1,5,6,1,6,2,0,3,7,0,7,4);
 let b=boxes[instance];let world=vec4<f32>(b.center.xyz+corners[ids[vertex]]*b.size.xyz*.5,1.0);var p=u.vp*world;p.z=(p.z+p.w)*.5;var output:DepthOutput;output.clip=p;output.linearDepth=-(u.view*world).z;return output;
}

@fragment fn depthFragment(o:DepthOutput)->@location(0) vec4<f32>{return vec4<f32>(o.linearDepth,0.0,0.0,1.0);}
