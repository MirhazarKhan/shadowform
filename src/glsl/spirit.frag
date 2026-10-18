uniform sampler2D sceneDepth;
uniform vec2 screen;
uniform float form,morph,brightness,clock,vision;
uniform vec3 spiritColor;
varying float life,seed,depth,nearFade,fold;
void main(){
 float surface=dot(texture2D(sceneDepth,gl_FragCoord.xy/screen),vec4(1.0/16777216.0,1.0/65536.0,1.0/256.0,1.0))*(255.0/256.0)*2800.0;
 float alpha=smoothstep(0.0,.75,surface-depth)*nearFade;
 if(form>.5)alpha*=mix(1.0,.015+.009*sin(clock*3.4),morph);
 if(alpha<.004)discard;
 // Original Spirit life colouring: a scarlet head, dark ageing curls and wake.
 vec3 color=mix(vec3(.002,.0005,.003),spiritColor,smoothstep(0.0,.7,life));
 color*=fold*(.89+.11*seed);
 color+=spiritColor*.08*brightness*smoothstep(.2,.75,life);
 float grey=dot(color,vec3(.2126,.7152,.0722));
 color=mix(color,vec3(grey*.92),vision*.9);
 gl_FragColor=vec4(color,alpha);
}
