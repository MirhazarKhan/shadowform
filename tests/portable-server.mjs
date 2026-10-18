import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {once} from 'node:events';

// Use a real TCP server and the prebuilt download assets. This catches stale
// folders and static-only launchers that would otherwise lose the room API.
const server=spawn(process.execPath,['tools/serve.cjs','--port','0','--memory','--no-open'],{stdio:['ignore','pipe','pipe']});
let output='',errors='',step='startup';server.stderr.on('data',d=>errors+=d);
const exit=once(server,'exit');
try {
 const base=await new Promise((resolve,reject)=>{
  const limit=setTimeout(()=>reject(Error('Portable server startup timed out: '+errors)),5000);
  server.stdout.on('data',d=>{output+=d;const match=output.match(/Local game: (http:\/\/127\.0\.0\.1:\d+)/);if(match){clearTimeout(limit);resolve(match[1]);}});
  server.once('exit',()=>{clearTimeout(limit);reject(Error('Portable server stopped: '+errors));});
 });
 step='page';const page=await fetch(base+'/');assert.equal(page.status,200);const html=await page.text();
 assert(html.includes('createRoom'));assert(html.includes('20261007-coop'));assert(html.includes('MIRHAZAR KHAN'));
 step='bundle';const bundle=Buffer.from(await (await fetch(base+'/js/index.js')).arrayBuffer());
 const hash=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(hash(bundle),hash(fs.readFileSync('app/js/index.js')),'the portable launcher serves the current production bundle');
 assert.equal((await fetch(base+'/shaders/spirit-render.wgsl')).status,200);
 assert.equal((await fetch(base+'/server/rooms.mjs')).status,404,'server source is not served from browser assets');
 async function room(operation,data={},session){
  step=operation;
  const response=await fetch(base+'/api/rooms/'+(session?session.code+'/':'')+operation,{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify({...data,...(session?{player:session.you}:{})})});
  const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));return body;
 }
 const host=await room('create',{name:'LAN host',color:0});const guest=await room('join',{code:host.code,name:'LAN guest',color:1});
 await room('ready',{ready:true},host);await room('ready',{ready:true},guest);
 const playing=await room('start',{},host);assert.equal(playing.phase,'playing');assert.equal(playing.players.length,2);
 const sync=await room('sync',{state:{x:31,y:0,z:260,mode:'playing',cohesion:80,tick:15}},guest);
 assert.equal(sync.players.find(p=>p.id===guest.you).state.x,31);
 console.log('PASS portable LAN server over actual TCP: current prebuilt page/bundle/shaders, private server-source boundary, create/join/ready/launch and independent emitter sync.');
} catch(error) {
 console.error('Portable server failed at '+step+'\n'+output+'\n'+errors);
 throw error;
} finally {
 server.kill();await exit;
}
