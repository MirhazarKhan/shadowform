var THREE=require('three');

// World-anchored ink: four light values, surface hatching and one hard shadow.
// No normal, bump, reflection or specular texture samples and no light loops.
var vertex=[
 'varying vec3 inkWorld,inkNormal,inkView;',
 'varying float inkDepth;',
 THREE.ShaderChunk.shadowmap_pars_vertex,
 'void main(){',
 ' vec4 worldPosition=modelMatrix*vec4(position,1.0);',
 ' vec4 viewPosition=viewMatrix*worldPosition;',
 ' inkWorld=worldPosition.xyz;inkNormal=normalize(mat3(modelMatrix)*normal);',
 ' inkView=cameraPosition-worldPosition.xyz;inkDepth=-viewPosition.z;',
 ' gl_Position=projectionMatrix*viewPosition;',
 THREE.ShaderChunk.shadowmap_vertex,
 '}'
].join('\n');
var fragment=[
 'uniform vec3 inkColor,inkEmissive;',
 'uniform float inkOpacity,inkHatch,inkPanel;',
 'varying vec3 inkWorld,inkNormal,inkView;',
 'varying float inkDepth;',
 THREE.ShaderChunk.shadowmap_pars_fragment,
 'void main(){',
 ' vec3 n=normalize(inkNormal);',
 ' float light=dot(n,normalize(vec3(-110.0,300.0,210.0)));',
 ' float band=.30+step(-.12,light)*.19+step(.28,light)*.25+step(.68,light)*.26;',
 ' float shadow=1.0;',
 '#ifdef USE_SHADOWMAP',
 ' for(int i=0;i<NUM_SHADOWS;i++){',
 '  vec3 p=vShadowCoord[i].xyz/vShadowCoord[i].w;',
 '  if(p.x>=0.0&&p.x<=1.0&&p.y>=0.0&&p.y<=1.0&&p.z<=1.0){',
 '   float hit=step(unpackDepth(texture2D(shadowMap[i],p.xy)),p.z+shadowBias[i]);',
 '   shadow*=1.0-hit*.52;',
 '  }',
 ' }',
 '#endif',
 ' vec2 plane=abs(n.y)>.65?inkWorld.xz:abs(n.x)>.65?inkWorld.zy:inkWorld.xy;',
 ' float softness=clamp(inkDepth*.00065,.07,.34);',
 ' float stroke=abs(fract((plane.x+plane.y*.71)*.36)-.5);',
 ' float hatch=1.0-smoothstep(.035,.035+softness,stroke);',
 ' float cross=1.0-smoothstep(.035,.035+softness,abs(fract((plane.x-plane.y*.79)*.29)-.5));',
 ' float shade=1.0-band*shadow;',
 ' vec3 color=inkColor*(.12+.88*band)*shadow;',
 ' color*=1.0-inkHatch*(hatch*shade+cross*smoothstep(.45,.75,shade)*.48);',
 ' if(inkPanel>0.0){vec2 cell=fract(plane/inkPanel);cell=min(cell,1.0-cell);float seam=1.0-smoothstep(.008,.022,min(cell.x,cell.y));color*=1.0-seam*.33;}',
 ' float rim=1.0-max(0.0,dot(n,normalize(inkView)));',
 ' color*=1.0-smoothstep(.78,.98,rim)*.28;',
 ' color+=inkEmissive;',
 ' float fog=1.0-exp(-inkDepth*.00115);',
 ' color=mix(color,vec3(.095,.098,.11),fog*.7);',
 ' gl_FragColor=vec4(color,inkOpacity);',
 '}'
].join('\n');

exports.create=function(color,panel,hatch){
 // r74 refreshes ambientLightColor whenever ShaderMaterial.lights is true,
 // even when the shader uses only the directional shadow map.
 var uniforms=THREE.UniformsUtils.merge([THREE.UniformsLib.ambient,THREE.UniformsLib.lights,THREE.UniformsLib.shadowmap,{
  inkColor:{type:'c',value:new THREE.Color(color)},inkEmissive:{type:'c',value:new THREE.Color(0x000000)},
  inkOpacity:{type:'f',value:1},inkHatch:{type:'f',value:hatch===undefined?.42:hatch},inkPanel:{type:'f',value:panel||0}
 }]);
 var m=new THREE.ShaderMaterial({uniforms:uniforms,vertexShader:vertex,fragmentShader:fragment,lights:true});
 m.inkSurface=true;m.color=m.uniforms.inkColor.value;m.emissive=m.uniforms.inkEmissive.value;
 Object.defineProperty(m,'opacity',{configurable:true,enumerable:true,get:function(){return this.uniforms.inkOpacity.value;},set:function(v){this.uniforms.inkOpacity.value=v;}});
 return m;
};
exports.clone=function(m){
 if(!m.inkSurface)return m.clone();
 var copy=exports.create(m.color.getHex(),m.uniforms.inkPanel.value,m.uniforms.inkHatch.value);
 copy.emissive.copy(m.emissive);copy.opacity=m.opacity;copy.transparent=m.transparent;copy.depthWrite=m.depthWrite;copy.side=m.side;
 return copy;
};
