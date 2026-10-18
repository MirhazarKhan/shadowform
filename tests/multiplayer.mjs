import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { roomsFetch } from '../server/rooms.mjs';
const require=createRequire(import.meta.url),db=require('../tools/sqlite-room-store.cjs').open(':memory:');
const rules=require('../src/cooperativeRules.js');
async function api(operation,data={},session,expected=200){
 const path=session?`/api/rooms/${session.code}/${operation}`:`/api/rooms/${operation}`;
 const response=await roomsFetch(new Request('http://game.local'+path,{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify({...data,...(session?{player:session.you}:{})})}),{DB:db});
 const body=await response.json();assert.equal(response.status,expected,JSON.stringify(body));return body;
}
const host=await api('create',{name:'Mir',color:0});
const peers=await Promise.all([1,2,3].map(i=>api('join',{code:host.code,name:'Spirit '+i,color:0})));
const sessions=[host,...peers];
assert.equal(new Set(peers.at(-1).players.map(p=>p.color)).size,4,'concurrent joins receive four distinct colors');
await api('join',{code:host.code,name:'Fifth'},undefined,409);
await api('start',{},peers[0],403);
await api('start',{},host,409);
for(const s of sessions)await api('ready',{ready:true},s);
const launched=await api('start',{},host);assert.equal(launched.phase,'playing');assert.equal(launched.world.round,1);
const bad={...peers[0],token:host.token};await api('sync',{},bad,401);
const points=sessions.map((s,i)=>({x:i*10,y:0,z:270,form:0,morph:0,flow:[0,0,-.5],wall:[0,0,0,0],cohesion:80,mode:'playing',tick:1}));
const snapshots=await Promise.all(sessions.map((s,i)=>api('sync',{state:points[i],epoch:launched.epoch},s)));
const restored=await api('sync',{},peers[0]);assert.equal(restored.players.find(p=>p.id===peers[0].you).state.x,points[1].x,'a cached session sync preserves its saved emitter before the game is ready');
assert.equal(snapshots[0].players.find(p=>p.id===host.you).state.consume[3],-1,'ordinary movement has no consume shell');
assert.equal(snapshots[0].players.length,4);assert(snapshots.every(p=>!JSON.stringify(p).includes('token_hash')),'session credentials are never exposed');
let world={...rules.fresh(1),tick:10,stage:1};
await api('sync',{state:points[0],world,epoch:launched.epoch},host);
const attempted=await api('sync',{state:points[1],world:{...world,tick:99,stage:3},epoch:launched.epoch},peers[0]);assert.equal(attempted.world.stage,1,'only the elected host writes the world');
const stale=await api('sync',{state:points[0],world:{...world,tick:1,stage:0},epoch:launched.epoch},host);assert.equal(stale.world.stage,1,'out-of-order host snapshots cannot roll back progress');
const action={id:'unique-action-0001',data:{kind:'ping',target:{x:10,y:0,z:250}}};
await api('sync',{state:points[1],events:[action,action]},peers[0]);
let read=await api('sync',{state:points[0]},host);assert.equal(read.events.filter(e=>e.id===action.id).length,1,'HTTP retries are idempotent');
const signal={id:'unique-signal-0001',to:peers[0].you,data:{type:'offer',sdp:'test-sdp'}};
await api('sync',{state:points[0],signals:[signal]},host);
const addressed=await api('sync',{state:points[1]},peers[0]);assert.equal(addressed.signals.length,1);assert.equal((await api('sync',{state:points[2]},peers[1])).signals.length,0,'signaling is delivered only to its intended member');
const seq=addressed.signals[0].seq;assert.equal((await api('sync',{state:points[1],signalAfter:seq},peers[0])).signals.length,0);
// Hiding / disconnecting the host elects an available peer without resetting
// the shared mission, and the old epoch loses authority immediately.
const migration=await api('sync',{state:points[0],available:false},host);assert.notEqual(migration.host,host.you);assert(migration.epoch>launched.epoch);assert.equal(migration.world.stage,1);
const refused=await api('sync',{state:points[0],world:{...world,tick:999,stage:3},epoch:launched.epoch},host);assert.equal(refused.world.stage,1);
await api('leave',{},peers[2]);assert.equal((await api('sync',{state:points[1]},peers[0])).players.length,3);
const isolated=await api('create',{name:'Other room'});assert.equal(isolated.players.length,1);
db.raw.prepare('UPDATE spirit_rooms SET expires = ? WHERE code = ?').run(Date.now()-1,isolated.code);await api('join',{code:isolated.code},undefined,404);

const p=(id,state)=>({id,name:id,color:'#ff0305',online:true,state:{form:0,cohesion:100,mode:'playing',vision:false,channel:'',...state}});
const crew=[p('a',{x:-112,y:0,z:92,channel:'lobby-a'}),p('b',{x:116,y:0,z:92,channel:'lobby-b'})],guards=[{x:-108,y:0,z:94,dead:false}];
world=rules.fresh();function tick(seconds,events=[]){for(let t=0;t<seconds;t+=.02)rules.tick(world,crew,.02,t===0?events:[],guards,()=>true);}
crew[1].state.channel='';tick(3);assert.equal(world.stage,0,'one spirit cannot link both relays');crew[1].state.channel='lobby-b';crew[1].state.form=1;tick(3);assert.equal(world.stage,0,'a solid disguise cannot operate a relay');crew[1].state.form=0;tick(2.7);assert.equal(world.stage,1);
Object.assign(crew[0].state,{x:-112,y:26,z:-182,channel:'security-a'});Object.assign(crew[1].state,{x:112,y:0,z:-182,channel:'security-b'});tick(3);assert.equal(world.stage,1,'a ground-floor spirit cannot operate the raised relay');crew[1].state.y=26;tick(2.7);assert.equal(world.stage,2);
Object.assign(crew[0].state,{x:0,y:0,z:-236,channel:'vault'});tick(3.2);assert.equal(world.stage,3);
Object.assign(crew[1].state,{x:8,y:0,z:-236,channel:''});rules.capture(world,'b');assert.equal(world.result,null,'one capture does not end the team heist');crew[0].state.channel='revive:b';tick(1.9);assert(!world.down.b,'a nearby teammate can restore a captured spirit');assert(rules.resonance(crew[0].state,crew,world,'a',()=>true));assert(!rules.resonance(crew[0].state,crew,world,'a',()=>false),'resonance respects solid cover');
crew.forEach(p=>p.state.vision=true);tick(.04);assert.equal(world.slow,.65,'two simultaneous scans trigger shared time dilation');crew.forEach(p=>p.state.vision=false);
Object.assign(crew[0].state,{x:-112,y:0,z:92,channel:''});Object.assign(crew[1].state,{x:-110,y:0,z:92});
const lure={id:'lure-001',from:'a',data:{kind:'lure',target:{x:-80,y:0,z:90}}};tick(.02,[lure,lure]);assert.equal(world.lures.length,1);tick(.02,[{...lure,id:'lure-002'}]);assert.equal(world.lures.length,1,'lure cooldown is shared and authoritative');
tick(.02,[{id:'claim-a',from:'a',data:{kind:'claim',guard:0}},{id:'claim-b',from:'b',data:{kind:'claim',guard:0}}]);assert.equal(world.claims[0].player,'a','a sentinel has only one consume owner');tick(.02,[{id:'consume-b',from:'b',data:{kind:'consumed',guard:0}}]);assert.equal(world.dead.length,0);tick(.02,[{id:'consume-a',from:'a',data:{kind:'consumed',guard:0}}]);assert.deepEqual(world.dead,[0]);
crew.forEach(p=>Object.assign(p.state,{x:0,y:55,z:-626,channel:''}));crew[1].state.z=-550;tick(2);assert.equal(world.result,null,'the first arriving player cannot extract alone');crew[1].state.z=-626;tick(2);assert.equal(world.result,'won');
assert(rules.crossesLaser({x:0,y:0,z:-128,form:0,low:false,transport:false}));assert(!rules.crossesLaser({x:0,y:0,z:-128,form:0,low:true,transport:false}),'low vapor clears the shared laser grid');assert(!rules.crossesLaser({x:0,y:26,z:-128,form:0,transport:false}),'raised path clears the laser grid');assert(!rules.crossesLaser({x:0,y:0,z:-128,form:0,transport:true}),'phase transit is not captured by the laser grid');
const failure=rules.fresh();rules.capture(failure,'a');rules.capture(failure,'b');rules.tick(failure,crew,.02,[],guards);assert.equal(failure.result,'failed');
db.close();
console.log('PASS four-client room API on real SQLite: concurrent joins / unique colors, room limits, readiness, private tokens, host authority, snapshot ordering, retry deduplication, addressed signaling, host migration, leave and expiry.');
console.log('PASS cooperative heist: distinct relay operators, raised access, shared key, restore, cover-aware resonance, team scan slow time, lure cooldown, consume ownership and whole-crew extraction / capture.');
