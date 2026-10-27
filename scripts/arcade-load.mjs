import WebSocket from 'ws';
import {randomBytes,randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import os from 'node:os';
const args=process.argv.slice(2),option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const inputUrl=option('--url','ws://127.0.0.1:5191'),url=new URL(inputUrl),base=`${url.protocol==='wss:'?'https:':'http:'}//${url.host}`;
const count=Number(option('--clients','26')),seconds=Number(option('--seconds','120')),origin=option('--origin','http://127.0.0.1:5189');
if(!Number.isInteger(count)||count<3||count>128||!Number.isFinite(seconds)||seconds<1)throw new Error('Invalid load parameters');
const post=async(path,data,token)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(data)});if(!r.ok)throw new Error(`HTTP ${r.status}: ${await r.text()}`);return r.json();};
const existingCode=option('--room','');if(existingCode&&!/^[A-Z2-7]{8}$/.test(existingCode))throw new Error('Room code must have8 uppercase base32 characters');
const hostToken=existingCode?null:randomBytes(32).toString('base64url'),room=existingCode?{code:existingCode}:await post('/rooms',{requestId:randomUUID(),hostToken});
const entrants=await Promise.all(Array.from({length:count},async(_,i)=>{const token=randomBytes(32).toString('base64url');return {...await post(`/rooms/${room.code}/join`,{requestId:randomUUID(),name:`Bot ${i+1}`,playerToken:token}),token,index:i,seq:0,snapshot:null,snapshots:0,moved:0,bytes:0,lastPoint:null,runId:'',ping:new Map()};}));
const rendered=Number(option('--rendered','0')),pages=[],browserErrors=[];let browser;if(existingCode&&rendered)throw new Error('--rendered is only for a load-created room');
if(rendered){const {chromium}=await import('@playwright/test');browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 for(let i=0;i<rendered;i++){const context=await browser.newContext({viewport:[{width:1366,height:768},{width:1280,height:720},{width:1920,height:1080}][i%3]});await context.addInitScript(({code,token})=>localStorage.setItem(`cdgk:host:${code}`,token),{code:room.code,token:hostToken});const page=await context.newPage();page.on('pageerror',e=>browserErrors.push(e.message));await page.goto(`${origin}/arcade/host/${room.code}`);pages.push(page);}}
const rtt=[],tickCosts=[];let errors=0;
await Promise.all(entrants.map(e=>new Promise((resolve,reject)=>{
 const socket=new WebSocket(`${inputUrl.replace(/\/$/,'')}/rooms/${room.code}/socket`,{origin,perMessageDeflate:false});e.socket=socket;const timeout=setTimeout(()=>reject(new Error('Socket auth timeout')),10000);
 socket.on('open',()=>socket.send(JSON.stringify({type:'auth',token:e.token})));
 socket.on('error',reject);
 socket.on('message',data=>{e.bytes+=data.length;const m=JSON.parse(data.toString());if(m.type==='patch'&&e.snapshot&&m.patch.runId===e.snapshot.runId){const merge=(base,delta)=>{const result={...base};for(const [id,change]of Object.entries(delta??{})){if(change===null)delete result[id];else result[id]={...result[id],...change};}return result;};m.snapshot={...e.snapshot,...m.patch,players:merge(e.snapshot.players,m.patch.players),orders:merge(e.snapshot.orders,m.patch.orders)};m.type='snapshot';}if(m.type==='snapshot'){
  e.snapshot=m.snapshot;e.snapshots++;if(e.runId!==m.snapshot.runId){e.runId=m.snapshot.runId;e.seq=0;e.lastBroadcast=undefined;}const seq=m.snapshot.updateSeq;if(typeof seq==='number'){if(e.lastBroadcast!==undefined&&seq>e.lastBroadcast+1)e.broadcastGaps=(e.broadcastGaps??0)+seq-e.lastBroadcast-1;e.lastBroadcast=seq;}
  const p=m.snapshot.players[e.playerId];if(p){if(e.lastPoint&&Math.hypot(p.x-e.lastPoint.x,p.y-e.lastPoint.y)>.1)e.moved++;e.lastPoint={x:p.x,y:p.y};}
  if(typeof m.snapshot.tickCostMs==='number')tickCosts.push(m.snapshot.tickCostMs);clearTimeout(timeout);resolve();
 }else if(m.type==='pong'){const t=e.ping.get(m.id);if(t!==undefined){rtt.push(performance.now()-t);e.ping.delete(m.id);}}
 else if(m.type==='error')errors++;
 });
})));
const bootStarted=performance.now();if(hostToken)await post(`/rooms/${room.code}/host`,{requestId:randomUUID(),action:'start'},hostToken);else console.log(`Bots joined${room.code}. MC may start when all humans have joined. Ctrl+C to disconnect bots.`);
for(const page of pages){await page.getByTestId('arcade-world').waitFor();await page.waitForFunction(()=>document.querySelector('[data-testid="arcade-world"]')?.dataset.ready==='true',undefined,{timeout:60000});}
const loadToCityReadyMs=Math.round(performance.now()-bootStarted);if(pages.length)await new Promise(resolve=>setTimeout(resolve,3000));
for(const page of pages)await page.evaluate(()=>{window.arcadePerf={started:performance.now(),frames:[],heaps:[],last:0};const sample=t=>{const p=window.arcadePerf;if(p.last)p.frames.push(t-p.last);p.last=t;if(p.frames.length%120===0&&performance.memory)p.heaps.push(performance.memory.usedJSHeapSize);requestAnimationFrame(sample);};requestAnimationFrame(sample);});
rtt.length=0;tickCosts.length=0;for(const e of entrants){e.bytes=0;e.snapshots=0;e.moved=0;e.lastPoint=null;e.broadcastGaps=0;}
const started=performance.now();let timer;
await new Promise(resolve=>{timer=setInterval(()=>{
 const elapsed=performance.now()-started;if(elapsed>=seconds*1000){clearInterval(timer);resolve();return;}
 for(const e of entrants){const s=e.snapshot,p=s?.players[e.playerId];if(!p||e.socket.readyState!==WebSocket.OPEN)continue;
  const order=p.carriedOrderId?s.orders[p.carriedOrderId]:null;
  const available=Object.values(s.orders).filter(o=>!o.settled&&!o.ownerId&&(!o.privateOwnerId||o.privateOwnerId===e.playerId));
  let target=order?.delivery??available[(e.index+Math.floor(elapsed/15000))%Math.max(1,available.length)]?.pickup??s.map.pickups[(e.index+Math.floor(elapsed/4000))%s.map.pickups.length];
  // Follow actual navigable waypoints around the river rather than teleporting.
  if(target&&((p.y<s.map.riverY+s.map.riverHeight+25&&target.y>s.map.riverY+s.map.riverHeight)||(p.y>s.map.riverY-25&&target.y<s.map.riverY))){
   const bridge=e.index%3===0?s.map.freeBridge:s.map.gate;
   target={x:bridge.x+bridge.w/2,y:Math.abs(p.x-(bridge.x+bridge.w/2))>7?p.y:target.y>s.map.riverY?s.map.riverY+s.map.riverHeight+30:s.map.riverY-30};
  }
  const dx=target?target.x-p.x:0,dy=target?target.y-p.y:0;
  e.socket.send(JSON.stringify({type:'input',input:{runId:s.runId,seq:++e.seq,moveX:Math.abs(dx)<8?0:Math.sign(dx),moveY:Math.abs(dy)<8?0:Math.sign(dy),interactPressed:e.seq%8===0,dashPressed:e.seq%100===1,abandonHeld:false}}));
  if(e.seq%10===0){const id=`${e.index}:${e.seq}`;e.ping.set(id,performance.now());e.socket.send(JSON.stringify({type:'ping',id}));}
 }
 },50);});
await Promise.all(pages.map(page=>page.evaluate(()=>{window.arcadePerf.ended=performance.now();})));
try{if(hostToken)await post(`/rooms/${room.code}/host`,{requestId:randomUUID(),action:'pause'},hostToken);}catch(error){for(const e of entrants)e.socket.close();await browser?.close();throw error;}
for(const e of entrants)e.socket.close();
const browserMetrics=[];
for(const [index,page]of pages.entries()){const measured=await page.evaluate(()=>{const canvas=document.querySelector('canvas'),gl=canvas?.getContext('webgl2')??canvas?.getContext('webgl');const ext=gl?.getExtension('WEBGL_debug_renderer_info'),engineFrames=canvas.readArcadeFrameTimes(window.arcadePerf.started,window.arcadePerf.ended);return {...window.arcadePerf,engineFrames,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',viewport:{width:innerWidth,height:innerHeight}};});const out=option('--out','');if(out)await page.screenshot({path:`${dirname(out)}/rendered-${index+1}.png`});browserMetrics.push(measured);}
await browser?.close();
const percentile=(values,n)=>{if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return Math.round(sorted[Math.min(sorted.length-1,Math.floor(sorted.length*n))]*100)/100;};
const report={kind:'actual-websocket-load-not-human-playtest',clients:count,activeInputSeconds:seconds,loadToCityReadyMs,snapshotBroadcastGaps:entrants.reduce((n,e)=>n+(e.broadcastGaps??0),0),inputFramesSent:entrants.map(e=>e.seq),durationSeconds:Math.round((performance.now()-started)/1000),snapshots:entrants.map(e=>e.snapshots),movingSnapshots:entrants.map(e=>e.moved),deliveredOrders:entrants.reduce((n,e)=>n+(e.snapshot?.players[e.playerId]?.delivered??0),0),receivedBytes:entrants.reduce((a,e)=>a+e.bytes,0),applicationRttMs:{samples:rtt.length,p50:percentile(rtt,.5),p95:percentile(rtt,.95)},tickProcessingMs:{samples:tickCosts.length,p95:percentile(tickCosts,.95)},messageErrors:errors,browserErrors,rendered:browserMetrics.map(m=>({view:'MC full-map view',viewport:m.viewport,renderer:m.renderer,frameSamples:m.engineFrames.length,frameTimeP95:percentile(m.engineFrames,.95),fps:Math.round(1000/(m.engineFrames.reduce((a,b)=>a+b,0)/m.engineFrames.length)),rafFrameTimeP95:percentile(m.frames,.95),heapFirst:m.heaps[0],heapLast:m.heaps.at(-1)})),machine:{cpu:os.cpus()[0].model,logicalCores:os.cpus().length},clientCorrection:'player prediction verified separately; no monetary client authority'};
const output=option('--out','');if(output){await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2));}console.log(JSON.stringify(report,null,2));
if(!existingCode&&(entrants.some(e=>e.moved===0)||errors||browserErrors.length||rtt.length===0||percentile(rtt,.95)>150||percentile(tickCosts,.95)>25||report.rendered.some(m=>m.frameTimeP95>33)||report.snapshotBroadcastGaps))process.exitCode=1;
