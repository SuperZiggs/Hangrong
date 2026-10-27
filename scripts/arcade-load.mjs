import WebSocket from 'ws';
import {randomBytes,randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
const args=process.argv.slice(2),option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const inputUrl=option('--url','ws://127.0.0.1:5191'),url=new URL(inputUrl),base=`${url.protocol==='wss:'?'https:':'http:'}//${url.host}`;
const count=Number(option('--clients','26')),seconds=Number(option('--seconds','120')),origin=option('--origin','http://127.0.0.1:5189');
if(!Number.isInteger(count)||count<3||count>128||!Number.isFinite(seconds)||seconds<1)throw new Error('Invalid load parameters');
const post=async(path,data,token)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(data)});if(!r.ok)throw new Error(`HTTP ${r.status}: ${await r.text()}`);return r.json();};
const hostToken=randomBytes(32).toString('base64url'),room=await post('/rooms',{requestId:randomUUID(),hostToken});
const entrants=await Promise.all(Array.from({length:count},async(_,i)=>{const token=randomBytes(32).toString('base64url');return {...await post(`/rooms/${room.code}/join`,{requestId:randomUUID(),name:`Bot ${i+1}`,playerToken:token}),token,index:i,seq:0,snapshot:null,snapshots:0,moved:0,bytes:0,lastPoint:null,runId:'',ping:new Map()};}));
const rtt=[],tickCosts=[];let errors=0;
await Promise.all(entrants.map(e=>new Promise((resolve,reject)=>{
 const socket=new WebSocket(`${inputUrl.replace(/\/$/,'')}/rooms/${room.code}/socket`,{origin,perMessageDeflate:false});e.socket=socket;const timeout=setTimeout(()=>reject(new Error('Socket auth timeout')),10000);
 socket.on('open',()=>socket.send(JSON.stringify({type:'auth',token:e.token})));
 socket.on('error',reject);
 socket.on('message',data=>{e.bytes+=data.length;const m=JSON.parse(data.toString());if(m.type==='snapshot'){
  e.snapshot=m.snapshot;e.snapshots++;if(e.runId!==m.snapshot.runId){e.runId=m.snapshot.runId;e.seq=0;}
  const p=m.snapshot.players[e.playerId];if(p){if(e.lastPoint&&Math.hypot(p.x-e.lastPoint.x,p.y-e.lastPoint.y)>.1)e.moved++;e.lastPoint={x:p.x,y:p.y};}
  if(typeof m.snapshot.tickCostMs==='number')tickCosts.push(m.snapshot.tickCostMs);clearTimeout(timeout);resolve();
 }else if(m.type==='pong'){const t=e.ping.get(m.id);if(t!==undefined){rtt.push(performance.now()-t);e.ping.delete(m.id);}}
 else if(m.type==='error')errors++;
 });
})));
await post(`/rooms/${room.code}/host`,{requestId:randomUUID(),action:'start'},hostToken);
const started=performance.now();let timer;
await new Promise(resolve=>{timer=setInterval(()=>{
 const elapsed=performance.now()-started;if(elapsed>=seconds*1000){clearInterval(timer);resolve();return;}
 for(const e of entrants){const s=e.snapshot,p=s?.players[e.playerId];if(!p||e.socket.readyState!==WebSocket.OPEN)continue;
  const order=p.carriedOrderId?s.orders[p.carriedOrderId]:null;
  const available=Object.values(s.orders).filter(o=>!o.settled&&!o.ownerId&&(!o.privateOwnerId||o.privateOwnerId===e.playerId));
  let target=order?.delivery??available[(e.index+Math.floor(elapsed/15000))%Math.max(1,available.length)]?.pickup??s.map.pickups[(e.index+Math.floor(elapsed/4000))%s.map.pickups.length];
  // Follow actual navigable waypoints around the river rather than teleporting.
  if(target&&((p.y<s.map.riverY&&target.y>s.map.riverY)||(p.y>s.map.riverY+s.map.riverHeight&&target.y<s.map.riverY))){
   const bridge=e.index%3===0?s.map.freeBridge:s.map.gate;
   if(Math.abs(p.x-(bridge.x+bridge.w/2))>8)target={x:bridge.x+bridge.w/2,y:p.y};
  }
  const dx=target?target.x-p.x:0,dy=target?target.y-p.y:0;
  e.socket.send(JSON.stringify({type:'input',input:{runId:s.runId,seq:++e.seq,moveX:Math.abs(dx)<8?0:Math.sign(dx),moveY:Math.abs(dy)<8?0:Math.sign(dy),interactPressed:e.seq%8===0,dashPressed:e.seq%100===1,abandonHeld:false}}));
  if(e.seq%10===0){const id=`${e.index}:${e.seq}`;e.ping.set(id,performance.now());e.socket.send(JSON.stringify({type:'ping',id}));}
 }
 },50);});
await post(`/rooms/${room.code}/host`,{requestId:randomUUID(),action:'pause'},hostToken);
for(const e of entrants)e.socket.close();
const percentile=(values,n)=>{if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return Math.round(sorted[Math.min(sorted.length-1,Math.floor(sorted.length*n))]*100)/100;};
const report={kind:'actual-websocket-load-not-human-playtest',clients:count,durationSeconds:Math.round((performance.now()-started)/1000),snapshots:entrants.map(e=>e.snapshots),movingSnapshots:entrants.map(e=>e.moved),receivedBytes:entrants.reduce((a,e)=>a+e.bytes,0),applicationRttMs:{samples:rtt.length,p50:percentile(rtt,.5),p95:percentile(rtt,.95)},tickProcessingMs:{samples:tickCosts.length,p95:percentile(tickCosts,.95)},messageErrors:errors,renderFps:'not measured by socket clients',clientCorrection:'requires rendered client pass'};
const output=option('--out','');if(output){await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2));}console.log(JSON.stringify(report,null,2));
if(entrants.some(e=>e.moved===0)||errors||rtt.length===0||percentile(rtt,.95)>150||percentile(tickCosts,.95)>25)process.exitCode=1;
