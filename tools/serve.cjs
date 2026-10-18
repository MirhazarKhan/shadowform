'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),child=require('child_process'),{pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2),assets=path.join(root,args.includes('--app')?'app':fs.existsSync(path.join(root,'dist/client/index.html'))?'dist/client':'dist');
const pi=args.indexOf('--port');let port=pi>=0?Number(args[pi+1]):8087,attempts=0;
if(!Number.isInteger(port)||port<0||port>65535){console.error('Use --port with a number between 0 and 65535.');process.exit(1);}
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wgsl':'text/wgsl; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.ico':'image/x-icon'};
async function main(){
 const db=require('./sqlite-room-store.cjs').open(args.includes('--memory')?':memory:':path.join(root,'spirit-rooms.sqlite'));
 const {roomsFetch}=await import(pathToFileURL(path.join(root,'server/rooms.mjs')).href);
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://'+(req.headers.host||'localhost'));
  if(url.pathname.startsWith('/api/rooms')){
   if(req.method!=='POST'){res.writeHead(405);res.end();return;}
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>64000){res.writeHead(413);res.end('Request is too large');return;}chunks.push(chunk);}
   const request=new Request(url,{method:'POST',headers:req.headers,body:Buffer.concat(chunks)});
   const response=await roomsFetch(request,{DB:db});res.writeHead(response.status,Object.fromEntries(response.headers.entries()));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  let file;try{const p=decodeURIComponent(url.pathname);if(p.includes('\0'))throw Error();file=path.resolve(assets,'.'+p);if(file!==assets&&!file.startsWith(assets+path.sep)){res.writeHead(403);res.end();return;}}catch(e){res.writeHead(400);res.end();return;}
  fs.stat(file,(e,stat)=>{if(!e&&stat.isDirectory())file=path.join(file,'index.html');fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);});});
 });
 server.on('error',e=>{if(e.code==='EADDRINUSE'&&port>0&&port<65535&&attempts++<10){port++;server.listen(port,'0.0.0.0');return;}console.error(e.message);process.exit(1);});
 server.on('listening',()=>{const actual=server.address().port,url='http://127.0.0.1:'+actual+'/?build=coop-20261007';console.log('GAME APPLICATION - DEPARTMENT OF SOFTWARE ENGINEERING');console.log('MIRHAZAR KHAN | Cooperative heist | 2-4 spirits');console.log('Local game: '+url);try{for(const list of Object.values(os.networkInterfaces()))for(const item of list||[])if(item.family==='IPv4'&&!item.internal)console.log('Teammates on your Wi-Fi / LAN: http://'+item.address+':'+actual+'/');}catch(e){console.log('Teammates: open http://YOUR-LAN-IP:'+actual+'/ using this computer\'s Wi-Fi / LAN address.');}console.log('Keep this window open. Create a room, share its code, then select Ready.');if(!args.includes('--no-open')){const launcher=process.platform==='win32'?['cmd.exe',['/c','start','',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];child.spawn(launcher[0],launcher[1],{stdio:'ignore',windowsHide:true}).on('error',()=>console.log('Open the local URL above.'));}});
 server.listen(port,'0.0.0.0');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
