import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {roomsFetch} from '../server/rooms.mjs';
const require=createRequire(import.meta.url),harness=require('./browser-harness.cjs'),db=require('../tools/sqlite-room-store.cjs').open(':memory:');
process.on('uncaughtException',e=>{console.error(e.stack);process.exit(1);});
const direct=process.argv.includes('--direct');
let time=0,nextTimer=0;const timers=new Map();
const timeout=(fn,delay=0)=>{const n=++nextTimer;timers.set(n,{fn,due:time+delay});return n;};
function advance(ms){time+=ms;for(const [id,t] of [...timers])if(t.due<=time){timers.delete(id);t.fn();}}
const rtc=new Map();let rtcSeq=0;
class RTC {
 constructor(){this.id=++rtcSeq;rtc.set(this.id,this);this.connectionState='new';this.channels=[];}
 createDataChannel(label){const c={label,readyState:'connecting',bufferedAmount:0,send(message){if(this.other?.onmessage)this.other.onmessage({data:message});}};this.channels.push(c);return c;}
 async createOffer(){return {type:'offer',sdp:String(this.id)};}
 async createAnswer(){return {type:'answer',sdp:String(this.id)};}
 async setLocalDescription(s){this.localDescription=s;if(this.onicecandidate)this.onicecandidate({candidate:{toJSON:()=>({candidate:'test-candidate',sdpMLineIndex:0})}});}
 async setRemoteDescription(s){this.remoteDescription=s;if(s.type==='answer'){const answer=rtc.get(Number(s.sdp));for(const local of this.channels){const remote=answer.createDataChannel(local.label);local.other=remote;remote.other=local;answer.ondatachannel({channel:remote});local.readyState=remote.readyState='open';if(local.onopen)local.onopen();if(remote.onopen)remote.onopen();}this.connectionState=answer.connectionState='connected';}}
 async addIceCandidate(){}
 close(){this.connectionState='closed';for(const c of this.channels){c.readyState='closed';if(c.other)c.other.readyState='closed';}}
}
async function fetchGame(path,options={}){if(path.startsWith('/api/'))return roomsFetch(new Request('http://game.local'+path,options),{DB:db});return new Response(fs.readFileSync('app/'+path));}
function makeClient(name,storage){
 const ownedTimers=new Set(),ownedRTC=[];
 function BrowserRTC(){const pc=new RTC();ownedRTC.push(pc);return pc;}
 const c=harness.create({name,storage,now:time,fetch:fetchGame,setTimeout:(fn,delay)=>{const id=timeout(fn,delay);ownedTimers.add(id);return id;},clearTimeout:n=>{ownedTimers.delete(n);timers.delete(n);},RTCPeerConnection:direct?BrowserRTC:undefined});
 c.stop=()=>{for(const id of ownedTimers)timers.delete(id);for(const pc of ownedRTC)pc.close();};return c;
}
const clients=[makeClient('Crimson'),makeClient('Cyan'),makeClient('Violet')];
const settle=()=>new Promise(r=>setImmediate(r));
async function pump(n=1){for(let i=0;i<n;i++){for(const c of clients)c.frame();advance(1000/60);await settle();}}
await settle();await pump(10);for(const c of clients)assert.equal(c.errors.length,0,c.errors.map(String).join('\n'));
clients[0].element('createRoom').click();await settle();await pump(15);const code=clients[0].element('roomLabel').textContent;assert.match(code,/^[A-Z2-9]{6}$/);
for(const c of clients.slice(1)){c.element('roomCode').value=code;c.element('joinRoom').click();}await pump(100);
for(const c of clients)c.element('readyRoom').click();await pump(100);assert.equal(clients[0].element('start').disabled,false,'ready crew enables host launch');
clients[0].element('start').click();await pump(180);
for(const c of clients){assert.equal(c.state().state,'playing');assert.equal(c.state().multiplayer.players,3);assert.equal(c.state().titlePhase,'complete');assert.equal(c.errors.length,0,c.errors.map(String).join('\n'));assert(c.floatTargets.some(t=>t[3]===128&&t[4]===64),'each viewer runs independent GPU teammate fields');assert(c.calls.length>2000);}
assert.notEqual(clients[0].state().core.x,clients[1].state().core.x,'spirits have separate spawn positions');assert.equal(clients[0].pointerRequests(),1,'room launch captures host mouse in the original click');
const pos=clients[1].state().core.z;clients[1].key('KeyW');clients[1].key('ShiftLeft');await pump(25);clients[1].key('KeyW',false);clients[1].key('ShiftLeft',false);await pump(40);assert(clients[1].state().core.z<pos-15,'a guest controls its own camera-relative spirit');assert(clients[1].state().speedBlur===0,'guest sprint blur decays correctly');
clients[1].key('KeyX');clients[1].key('KeyX',false);clients[2].key('KeyX');clients[2].key('KeyX',false);await pump(90);assert.equal(clients[0].state().timeScale,.65,'scans combine into one shared slow-time state');
const colors=db.raw.prepare('SELECT slot FROM spirit_players WHERE room = ? ORDER BY slot').all(code).map(p=>p.slot);assert.deepEqual(colors,[0,1,2]);
// Pausing a host is local: the crew and its patrol world continue to advance.
const before=clients[0].state().guards;clients[0].env.spiritGame.pause();await pump(45);assert.equal(clients[1].state().state,'playing');assert.notDeepEqual(clients[0].state().guards,before,'host patrols continue while its pause panel is open');clients[0].element('begin').click();await pump(20);
// A local menu cannot suspend resource drain in the shared heist.
const scanCharge=clients[1].state().charge;clients[1].env.spiritGame.pause();await pump(40);assert(clients[1].state().charge<scanCharge-5,'scan charge continues draining while a co-op menu is open');clients[1].element('begin').click();await pump(15);
// Reload the actual bundle with only the cached player session. The room keeps
// the location, sequence and color; direct links renegotiate when available.
const saved=clients[1].env.sessionStorage.getItem('spirit-coop-session'),savedPosition=clients[1].state().core;clients[1].stop();
clients[1]=makeClient('Cyan',{'spirit-coop-session':saved});await pump(240);
assert.equal(clients[1].state().state,'playing','a cached session enters the running heist');assert.equal(clients[1].state().multiplayer.players,3);
assert(Math.hypot(clients[1].state().core.x-savedPosition.x,clients[1].state().core.z-savedPosition.z)<5,'reloading preserves the guest position');
for(const c of clients)assert.equal(c.errors.length,0,c.errors.map(String).join('\n'));
// The hidden host hands simulation to another member, without replacing the
// running mission or particle buffers.
clients[0].env.document.hidden=true;clients[0].handlers['doc:visibilitychange']();await pump(140);assert.equal(clients.filter(c=>c.state().multiplayer.host).length,1);assert.equal(clients[0].state().multiplayer.host,false);for(const c of clients)assert.equal(c.errors.length,0,c.errors.map(String).join('\n'));
if(direct)assert(clients.some(c=>c.element('networkState').textContent==='DIRECT LINK'),'offer/answer/ICE flow opens the direct state and event channels');
for(const c of clients)c.stop();timers.clear();for(const pc of rtc.values())pc.close();db.close();
console.log('PASS three independent production bundles ('+(direct?'direct-channel signaling plus server recovery':'HTTP relay fallback')+'): create/join/ready/launch, continuous GPU handoff, independent guest motion and blur, GPU teammate fields, color slots, combined scans, live local pause, cached-session reload and host migration. Renderer calls use actual Three r74 with CPU GL recorders.');
