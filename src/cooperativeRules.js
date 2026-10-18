// Small deterministic heist rules. The elected room host owns this state;
// clients only submit their stance and intent.
exports.relays=[
 {id:'lobby-a',x:-112,y:0,z:92,stage:0,label:'Lobby relay A'},
 {id:'lobby-b',x:116,y:0,z:92,stage:0,label:'Lobby relay B'},
 {id:'security-a',x:-112,y:26,z:-182,stage:1,label:'Security relay A'},
 {id:'security-b',x:112,y:26,z:-182,stage:1,label:'Security relay B'},
 {id:'vault',x:0,y:0,z:-236,stage:2,label:'Data vault'}
];
exports.fresh=function(round,ack){return {round:round||1,ack:ack||0,tick:0,time:0,stage:0,progress:0,relay:0,slow:1,down:{},rescues:{},respawn:{},dead:[],claims:{},marks:{},lures:[],cooldowns:{},processed:[],result:null,alarm:0};};
function distance(a,b){var dx=a.x-b.x,dy=a.y-b.y,dz=a.z-b.z;return Math.sqrt(dx*dx+dy*dy+dz*dz);}
function alive(w,p){return p.online!==false&&p.state.mode!=='ready'&&!w.down[p.id];}
exports.nearest=function(core,people,world){var target=null,score=16;for(var i=0;i<people.length;i++){var p=people[i];if(world.down[p.id]){var d=distance(core,p.state);if(d<score){score=d;target={id:'revive:'+p.id,label:'Restore '+p.name,target:p.id};}}}if(target)return target;
 for(i=0;i<exports.relays.length;i++){var r=exports.relays[i];d=distance(core,r);if(r.stage===world.stage&&d<score){score=d;target=r;}}return target;};
exports.resonance=function(core,people,world,self,sight){if(world.down[self])return false;return people.some(function(p){return p.id!==self&&alive(world,p)&&distance(core,p.state)<45&&(!sight||sight(core,p.state));});};
exports.capture=function(w,id){if(w.result||w.down[id])return;w.down[id]={at:w.time};delete w.rescues[id];};
exports.crossesLaser=function(s){return Math.abs(s.z+128)<2.3&&Math.abs(s.x)<53&&s.y+(s.low?4.8:18)>=6&&s.y<24&&!s.form&&!s.transport;};
exports.tick=function(w,people,dt,events,guardPositions,sight){
 if(w.processed===undefined){var initial=exports.fresh(w.round,w.ack);Object.keys(initial).forEach(function(k){if(w[k]===undefined)w[k]=initial[k];});}
 if(w.result)return w;w.tick++;w.time+=dt;var active=people.filter(function(p){return p.online!==false;}),live=active.filter(function(p){return alive(w,p);});
 w.slow=live.filter(function(p){return p.state.vision;}).length>=2?.65:1;
 events.forEach(function(e){w.ack=Math.max(w.ack,e.seq||0);if(w.processed.indexOf(e.id)>=0)return;w.processed.push(e.id);if(w.processed.length>100)w.processed.shift();var p=live.filter(function(p){return p.id===e.from;})[0],data=e.data;if(!p||!data)return;
  if(data.kind==='lure'&&p.state.form===0&&!(w.cooldowns[p.id]>w.time)&&(data.energy===undefined?p.state.cohesion:Number.isFinite(data.energy)?data.energy:0)>=20&&data.target){var target=data.target;if(Number.isFinite(target.x)&&Number.isFinite(target.y)&&Number.isFinite(target.z)&&distance(p.state,target)<=180&&(!sight||sight(p.state,target))){w.cooldowns[p.id]=w.time+12;w.lures.push({x:target.x,y:target.y,z:target.z,owner:p.id,color:p.color,until:w.time+8,id:e.id});w.lures=w.lures.slice(-4);}}
  if(data.kind==='claim'){var g=guardPositions[data.guard],claim=w.claims[data.guard];if(g&&!g.dead&&w.dead.indexOf(data.guard)<0&&p.state.form===0&&distance(p.state,g)<36&&(!claim||claim.until<w.time)&&(!sight||sight(p.state,g)))w.claims[data.guard]={player:p.id,until:w.time+2.2};}
  if(data.kind==='consumed'){var owned=w.claims[data.guard];if(owned&&owned.player===p.id&&owned.until>w.time&&w.dead.indexOf(data.guard)<0){w.dead.push(data.guard);delete w.claims[data.guard];}}
  if(data.kind==='ping'&&data.target&&Number.isFinite(data.target.x)&&Number.isFinite(data.target.y)&&Number.isFinite(data.target.z)&&distance(p.state,data.target)<220)w.ping={x:data.target.x,y:data.target.y,z:data.target.z,color:p.color,until:w.time+6,name:p.name};
 });
 w.lures=w.lures.filter(function(l){return l.until>w.time;});Object.keys(w.claims).forEach(function(id){if(w.claims[id].until<=w.time)delete w.claims[id];});
 live.forEach(function(p){if(p.state.vision)guardPositions.forEach(function(g,i){if(!g.dead&&distance(p.state,g)<220)w.marks[i]=w.time+6;});});
 Object.keys(w.marks).forEach(function(id){if(w.marks[id]<w.time)delete w.marks[id];});
 if(w.stage<2){var relays=exports.relays.filter(function(r){return r.stage===w.stage;});var assigned=relays.map(function(r){return live.filter(function(p){return p.state.channel===r.id&&p.state.form===0&&distance(p.state,r)<16&&p.state.mode==='playing';})[0];});
  var linked=assigned.length===2&&assigned[0]&&assigned[1]&&assigned[0].id!==assigned[1].id;w.progress=Math.max(0,Math.min(1,w.progress+dt*(linked?1/2.5:-.4)));
  if(w.progress>=1){w.stage++;w.progress=0;w.relay++;}
 }else if(w.stage===2){var vault=exports.relays[4],hacking=live.some(function(p){return p.state.channel===vault.id&&p.state.form===0&&distance(p.state,vault)<16&&p.state.mode==='playing';});w.progress=Math.max(0,Math.min(1,w.progress+dt*(hacking?1/3:-.5)));if(w.progress>=1){w.stage=3;w.progress=0;w.relay++;}}
 Object.keys(w.down).forEach(function(target){var victim=active.filter(function(p){return p.id===target;})[0];if(!victim){delete w.down[target];delete w.rescues[target];return;}var restoring=live.some(function(p){return p.state.channel==='revive:'+target&&p.state.form===0&&distance(p.state,victim.state)<16&&p.state.mode==='playing'&&(!sight||sight(p.state,victim.state));});w.rescues[target]=Math.max(0,Math.min(1,(w.rescues[target]||0)+dt*(restoring?1/1.8:-.35)));if(w.rescues[target]>=1){delete w.down[target];delete w.rescues[target];}});
 if(active.length>=2&&active.every(function(p){return !!w.down[p.id];}))w.result='failed';
 if(w.stage===3&&active.length>=2){var together=active.every(function(p){var s=p.state;return !w.down[p.id]&&s.z<-610&&Math.abs(s.x)<24&&s.y>=54&&s.form===0;});w.progress=Math.max(0,Math.min(1,w.progress+dt*(together&&w.alarm<.5?1/1.8:-.5)));if(w.progress>=1)w.result='won';}
 return w;
};
