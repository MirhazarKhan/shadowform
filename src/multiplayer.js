// Direct, low-latency emitter snapshots; HTTP room sync remains available when
// a firewall blocks WebRTC. Both paths feed the same game state.
var settings=require('./core/settings');
var colors=['#ff0305','#12d9e8','#ad5aff','#ffb52e'],labels=['Crimson','Cyan','Violet','Amber'];
var room=null,identity=null,frame=null,world=null,peers={},actions=[],signals=[],inbox=[],signalAfter=0;
var timer=null,busy=false,ready=false,fieldReady=false,launched=false,onLaunch=null,onLeave=null,lastGood=0,ping=0,lastCleanup=0;
var sendClock=0,worldClock=0,choice=0,seq=0,generation=0,message='',receiveHandlers=[];
var $=function(id){return document.getElementById(id);};
function id(){var data=new Uint32Array(4);if(window.crypto&&window.crypto.getRandomValues)window.crypto.getRandomValues(data);else for(var i=0;i<4;i++)data[i]=Math.random()*4294967295;return Array.prototype.map.call(data,function(n){return n.toString(16);}).join('-');}
function note(text){message=text;if($('roomNotice'))$('roomNotice').textContent=text;}
function save(){try{sessionStorage.setItem('spirit-coop-session',JSON.stringify(identity));}catch(e){}}
function clearSession(){try{sessionStorage.removeItem('spirit-coop-session');}catch(e){}}
function request(path,data,auth){
 var controller=typeof AbortController!=='undefined'?new AbortController():null,timeout=controller?setTimeout(function(){controller.abort();},5000):null;
 return fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Authorization':auth?'Bearer '+auth:''},body:JSON.stringify(data),signal:controller?controller.signal:undefined}).then(function(r){return r.json().then(function(d){if(!r.ok)throw Error(d.error||'Room connection failed.');return d;});}).then(function(d){if(timeout)clearTimeout(timeout);return d;},function(e){if(timeout)clearTimeout(timeout);throw e;});
}
function send(peer,type,data,reliable){var channel=reliable?peer.events:peer.state;if(channel&&channel.readyState==='open'&&channel.bufferedAmount<32000){try{channel.send(JSON.stringify({type:type,data:data,epoch:room.epoch,round:world&&world.round}));return true;}catch(e){}}return false;}
function signal(to,data){signals.push({id:id(),to:to,data:data});if(signals.length>96)signals.shift();schedule(0);}
function channels(peer,channel){
 if(channel.label==='state')peer.state=channel;else if(channel.label==='events')peer.events=channel;else return;
 channel.onmessage=function(e){if(typeof e.data!=='string'||e.data.length>20000)return;var p;try{p=JSON.parse(e.data);}catch(err){return;}if(!room||p.epoch!==room.epoch)return;if((p.type==='state'||p.type==='action')&&p.round&&world&&p.round!==world.round)return;
  if(p.type==='state'){var member=find(peer.id);if(member&&p.data&&Number.isFinite(p.data.tick)&&p.data.tick>(member.state.tick||0)){member.state=p.data;peer.received=performance.now();}}
  if(p.type==='world'&&peer.id===room.host&&p.data&&(!world||p.data.round>(world.round||0)||p.data.round===(world.round||0)&&p.data.tick>(world.tick||0))){world=p.data;room.world=world;}
  if(p.type==='action'&&exports.isHost()&&p.data&&p.data.id&&p.data.data)inbox.push({id:p.data.id,from:peer.id,data:p.data.data});
 };
 channel.onopen=function(){peer.opened=performance.now();renderUI();};channel.onclose=renderUI;
}
function connect(p){
 if(!window.RTCPeerConnection||p.id===identity.player)return;var existing=peers[p.id];if(existing){var status=existing.pc.connectionState;if((status==='closed'||existing.failed||existing.disconnectedAt)&&performance.now()-(existing.disconnectedAt||existing.created)>6000){existing.pc.close();delete peers[p.id];}else return;}
 var pc,peer;try{pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}]});}catch(e){return;}
 peer=peers[p.id]={id:p.id,pc:pc,state:null,events:null,received:0,candidates:[],created:performance.now()};
 pc.onicecandidate=function(e){if(e.candidate)signal(p.id,{type:'ice',candidate:e.candidate.toJSON?e.candidate.toJSON():e.candidate});};
 pc.ondatachannel=function(e){channels(peer,e.channel);};
 pc.onconnectionstatechange=function(){if(pc.connectionState==='connected'){peer.disconnectedAt=0;peer.failed=false;}else if(pc.connectionState==='failed'||pc.connectionState==='disconnected'||pc.connectionState==='closed'){if(!peer.disconnectedAt)peer.disconnectedAt=performance.now();peer.failed=pc.connectionState==='failed';}renderUI();};
 if(identity.player<p.id){channels(peer,pc.createDataChannel('state',{ordered:false,maxRetransmits:0}));channels(peer,pc.createDataChannel('events',{ordered:true}));
  pc.createOffer().then(function(offer){return pc.setLocalDescription(offer);}).then(function(){signal(p.id,{type:'offer',sdp:pc.localDescription.sdp});}).catch(function(){peer.failed=true;});}
}
function acceptSignal(s){
 var p=find(s.from);if(!p)return;connect(p);var peer=peers[s.from];if(!peer)return;var data=s.data;if(data.type==='offer'&&peer.pc.remoteDescription){peer.pc.close();delete peers[s.from];connect(p);peer=peers[s.from];if(!peer)return;}var pc=peer.pc;
 function flush(){var list=peer.candidates.splice(0);for(var i=0;i<list.length;i++)pc.addIceCandidate(list[i]).catch(function(){});}
 if(data.type==='offer')pc.setRemoteDescription({type:'offer',sdp:data.sdp}).then(function(){flush();return pc.createAnswer();}).then(function(answer){return pc.setLocalDescription(answer);}).then(function(){signal(s.from,{type:'answer',sdp:pc.localDescription.sdp});}).catch(function(){peer.failed=true;});
 else if(data.type==='answer')pc.setRemoteDescription({type:'answer',sdp:data.sdp}).then(flush).catch(function(){peer.failed=true;});
 else if(data.type==='ice'){if(pc.remoteDescription)pc.addIceCandidate(data.candidate).catch(function(){});else peer.candidates.push(data.candidate);}
}
function find(player){if(!room)return null;for(var i=0;i<room.players.length;i++)if(room.players[i].id===player)return room.players[i];return null;}
function receive(data){
 var old=room,previousHost=old&&old.host,previousEpoch=old&&old.epoch;
 if(old&&world&&data.world.round===world.round){for(var i=0;i<data.players.length;i++){var peer=peers[data.players[i].id],prior=find(data.players[i].id);if(prior&&peer&&performance.now()-peer.received<2000&&prior.state.tick>data.players[i].state.tick)data.players[i].state=prior.state;}}
 room=data;var self=find(identity.player);if(!frame&&self){frame=self.state;seq=Math.max(seq,frame.tick||0);}lastGood=performance.now();ready=!!(find(identity.player)||{}).ready;
 if(!world||data.world.round>(world.round||0)||data.world.round===(world.round||0)&&data.world.tick>(world.tick||0)||previousEpoch!==data.epoch&&previousHost===identity.player){world=data.world;}
 room.world=world||data.world;
 for(i=0;i<room.players.length;i++)if(room.players[i].online)connect(room.players[i]);
 Object.keys(peers).forEach(function(key){if(!find(key)){peers[key].pc.close();delete peers[key];}});
 for(i=0;i<data.signals.length;i++){signalAfter=Math.max(signalAfter,data.signals[i].seq);acceptSignal(data.signals[i]);}
 if(exports.isHost())for(i=0;i<data.events.length;i++)inbox.push(data.events[i]);
 if(previousHost&&previousHost!==data.host)note('Room host reconnected to the shared mission.');
 renderUI();launchIfReady();for(i=0;i<receiveHandlers.length;i++)receiveHandlers[i](room);
}
function everyDirect(){if(!room)return false;var others=room.players.filter(function(p){return p.id!==identity.player&&p.online;});return others.length>0&&others.every(function(p){var peer=peers[p.id];return peer&&peer.state&&peer.state.readyState==='open'&&peer.events&&peer.events.readyState==='open';});}
function schedule(delay){if(timer)clearTimeout(timer);if(identity)timer=setTimeout(sync,delay);}
function sync(){
 if(!identity||busy)return;busy=true;var current=generation,start=performance.now(),sentActions=actions.slice(0,16),sentSignals=signals.slice(0,24);
 var cleanup=start-lastCleanup>30000;if(cleanup)lastCleanup=start;
 var payload={player:identity.player,state:frame||(find(identity.player)||{}).state,available:!document.hidden,signalAfter:signalAfter,events:sentActions,signals:sentSignals,cleanup:cleanup,epoch:room?room.epoch:0};
 if(exports.isHost()&&world)payload.world=world;
 request('/api/rooms/'+identity.code+'/sync',payload,identity.token).then(function(data){if(current!==generation)return;ping=performance.now()-start;actions=actions.filter(function(a){return !sentActions.some(function(s){return a.id===s.id;});});signals=signals.filter(function(a){return !sentSignals.some(function(s){return a.id===s.id;});});receive(data);if(message.indexOf('Reconnecting')===0)note('Connection restored.');},function(e){if(current!==generation)return;note('Reconnecting… '+(e.name==='AbortError'?'Room server took too long to respond.':e.message));renderUI();}).then(function(){busy=false;if(current===generation)schedule(everyDirect()?1000:room&&room.phase==='playing'?110:450);});
}
function join(create){
 if(busy||identity)return;busy=true;note(create?'Creating room…':'Joining room…');var input={name:$('playerName').value,color:choice,code:$('roomCode').value.toUpperCase()};
 request('/api/rooms/'+(create?'create':'join'),input).then(function(data){identity={player:data.you,token:data.token,code:data.code};world=data.world;generation++;launched=false;seq=0;signalAfter=0;frame=null;save();receive(data);note('Share the room code. Each spirit selects Ready before the host launches.');schedule(0);},function(e){note(e.message);}).then(function(){busy=false;renderUI();});
}
function operation(action,data){if(!identity)return Promise.reject(Error('Join a room first.'));data=data||{};data.player=identity.player;return request('/api/rooms/'+identity.code+'/'+action,data,identity.token).then(function(d){receive(d);return d;});}
function launchIfReady(){if(room&&room.phase==='playing'&&fieldReady&&!launched){launched=true;if(onLaunch)onLaunch();}}
function renderUI(){
 if(!$('coopLobby'))return;var connected=!!identity;$('roomSetup').hidden=connected;$('roomSession').hidden=!connected;
 $('roomLeave').hidden=!connected;$('crewHud').hidden=!connected;
 if(connected&&room){$('roomLabel').textContent=room.code;$('roomRole').textContent=exports.isHost()?'You host the heist':'Waiting for the host';$('readyRoom').textContent=ready?'Ready ✓':'Ready';$('readyRoom').classList.toggle('active',ready);
  var list=$('roomRoster');while(list.firstChild)list.removeChild(list.firstChild);
  room.players.forEach(function(p){var row=document.createElement('div'),dot=document.createElement('i'),name=document.createElement('span'),status=document.createElement('small');dot.style.background=p.color;name.textContent=p.name+(p.id===identity.player?' · you':'');status.textContent=!p.online?'reconnecting':p.ready?'ready':'preparing';row.appendChild(dot);row.appendChild(name);row.appendChild(status);list.appendChild(row);});
  var me=find(identity.player);if(me)settings.spiritColor=me.color;
  var count=room.players.filter(function(p){return p.online;}).length,allReady=count>=2&&room.players.filter(function(p){return p.online;}).every(function(p){return p.ready;});
  $('start').textContent=room.phase==='playing'?'Enter heist':exports.isHost()?'Launch heist':'Waiting for host';$('start').disabled=!fieldReady||(room.phase==='lobby'&&(!exports.isHost()||!allReady));
  $('crewRoom').textContent=room.code+' · '+count+'/4';$('networkState').textContent=exports.stalled()?'RECONNECTING':everyDirect()?'DIRECT LINK':Math.round(ping)+' ms · RELAY';
 }else if(fieldReady){$('start').textContent='Start solo';$('start').disabled=false;settings.spiritColor=colors[choice];}
}
exports.init=function(launch,leave){onLaunch=launch;onLeave=leave;
 $('createRoom').onclick=function(){join(true);};$('joinRoom').onclick=function(){join(false);};$('readyRoom').onclick=function(){operation('ready',{ready:!ready}).catch(function(e){note(e.message);});};
 $('roomLeave').onclick=exports.leave;$('copyRoom').onclick=function(){if(!identity)return;var url=new URL(location.href);url.searchParams.set('room',identity.code);if(navigator.clipboard)navigator.clipboard.writeText(url.toString()).then(function(){note('Invite copied. Your teammate opens it and selects Join.');},function(){note('Room code: '+identity.code);});else note('Room code: '+identity.code);};
 $('colorChoices').querySelectorAll('button').forEach(function(b){b.onclick=function(){if(identity)return;choice=Number(b.getAttribute('data-color'));settings.spiritColor=colors[choice];$('colorChoices').querySelectorAll('button').forEach(function(o){o.setAttribute('aria-pressed',o===b?'true':'false');});};});
 var requested=new URL(location.href).searchParams.get('room');if(requested)$('roomCode').value=requested.toUpperCase().slice(0,6);
 try{var cached=JSON.parse(sessionStorage.getItem('spirit-coop-session'));if(cached&&cached.player&&cached.token&&cached.code){identity=cached;generation++;sync();}}catch(e){}
 document.addEventListener('visibilitychange',function(){schedule(0);});renderUI();
};
exports.ready=function(){fieldReady=true;renderUI();launchIfReady();};
exports.start=function(){if(!identity)return true;if(room.phase==='playing')return true;operation('start').catch(function(e){note(e.message);});return false;};
exports.leave=function(){var old=identity;generation++;identity=null;room=world=null;frame=null;actions=signals=inbox=[];launched=false;busy=false;if(timer)clearTimeout(timer);Object.keys(peers).forEach(function(k){peers[k].pc.close();});peers={};clearSession();if(old)request('/api/rooms/'+old.code+'/leave',{player:old.player},old.token).catch(function(){});if(onLeave)onLeave();renderUI();note('Solo play is available.');};
exports.restart=function(){return operation('restart').catch(function(e){note(e.message);});};
exports.active=function(){return !!identity&&!!room;};exports.playing=function(){return exports.active()&&room.phase==='playing';};exports.isHost=function(){return exports.active()&&room.host===identity.player;};exports.id=function(){return identity?identity.player:'solo';};exports.slot=function(){var me=identity&&find(identity.player);return me?me.slot:0;};exports.room=function(){return room;};exports.world=function(){return world;};exports.color=function(){return identity&&find(identity.player)?find(identity.player).color:colors[choice];};
exports.stalled=function(){if(!identity)return false;var host=room&&peers[room.host];return performance.now()-lastGood>6000&&!(host&&performance.now()-host.received<2000);};
exports.people=function(){if(!room)return [];return room.players.filter(function(p){return p.online;}).map(function(p){if(p.id===identity.player&&frame)p.state=frame;return p;});};
exports.publish=function(state,shared,ms){if(!exports.active())return;frame=state;frame.tick=++seq;if(exports.isHost()&&shared)world=shared;sendClock+=ms;worldClock+=ms;
 if(sendClock>=33){sendClock=0;Object.keys(peers).forEach(function(k){send(peers[k],'state',frame,false);});}
 if(exports.isHost()&&world&&worldClock>=80){worldClock=0;Object.keys(peers).forEach(function(k){send(peers[k],'world',world,false);});}
};
exports.action=function(data){if(!exports.playing()||exports.stalled())return;var action={id:id(),data:data};actions.push(action);if(exports.isHost())inbox.push({id:action.id,from:identity.player,data:data});else if(peers[room.host])send(peers[room.host],'action',action,true);schedule(0);};
exports.drain=function(){var list=inbox;inbox=[];return list;};exports.onReceive=function(fn){receiveHandlers.push(fn);};exports.colors=colors;exports.colorNames=labels;

exports.entry=function(){var self=identity&&find(identity.player),s=self&&self.state;return s&&s.mode!=='ready'?{x:s.x,y:s.y,z:s.z}:{x:(exports.slot()-1.5)*10,y:0,z:278};};
