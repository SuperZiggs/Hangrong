import {test,expect,type APIRequestContext} from '@playwright/test';
import {spawn,spawnSync,type ChildProcess} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {arcadeToken,inputFrame,openArcadeSocket,sleep} from '../support/arcade-independent';
import type {PublicSnapshot} from '../../shared/arcade/types';

test.describe('arcade authority across sockets and runtime restoration',()=>{
 test.setTimeout(90000);
 const base='http://127.0.0.1:5194',origin='http://127.0.0.1:5189',persist=resolve('work',`lifecycle-${randomUUID()}`);
 let api:APIRequestContext,runtime:ChildProcess|undefined,logs='';
 async function boot(){
  runtime=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local','--config','realtime/wrangler.jsonc','--persist-to',persist,'--port','5194','--ip','127.0.0.1','--inspector-port','0'],{cwd:process.cwd(),stdio:['ignore','pipe','pipe'],windowsHide:true,env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:resolve('work/lifecycle-wrangler.log')}});
  runtime.stdout?.on('data',c=>{logs+=String(c);});runtime.stderr?.on('data',c=>{logs+=String(c);});
  await expect.poll(async()=>{if(runtime?.exitCode!==null)throw new Error(logs.slice(-1500));try{return(await api.get('/health',{timeout:1000})).status();}catch{return 0;}},{timeout:30000,intervals:[250,500]}).toBe(200);
 }
 async function stop(){
  if(!runtime?.pid||runtime.exitCode!==null)return;const owned=runtime;runtime=undefined;
  if(process.platform==='win32'){const result=spawnSync('taskkill.exe',['/PID',String(owned.pid),'/T','/F'],{windowsHide:true,encoding:'utf8'});expect(result.status,result.stderr||result.stdout).toBe(0);}else owned.kill('SIGTERM');
  await expect.poll(async()=>{try{await api.get('/health',{timeout:500});return false;}catch{return true;}},{timeout:10000}).toBe(true);
 }
 test.beforeAll(async({playwright})=>{api=await playwright.request.newContext({baseURL:base});let occupied=false;try{await api.get('/health',{timeout:500});occupied=true;}catch{}expect(occupied,'Isolated lifecycle port must be free').toBe(false);await boot();});
 test.afterAll(async()=>{await stop();await api?.dispose();});
 async function room(){
  const host=arcadeToken(),created=await api.post('/rooms',{data:{requestId:randomUUID(),hostToken:host}});expect(created.ok()).toBe(true);const {code}=await created.json();
  const players=await Promise.all(['Một','Hai','Ba'].map(async name=>{const token=arcadeToken(),r=await api.post(`/rooms/${code}/join`,{data:{requestId:randomUUID(),playerToken:token,name}});expect(r.ok()).toBe(true);return{...(await r.json()),token};}));
  const command=async(action:string)=>{const r=await api.post(`/rooms/${code}/host`,{headers:{Authorization:`Bearer ${host}`},data:{requestId:randomUUID(),action}});expect(r.ok()).toBe(true);};
  const view=async()=>{const r=await api.get(`/rooms/${code}/bootstrap`,{headers:{Authorization:`Bearer ${host}`}});expect(r.ok()).toBe(true);return await r.json() as {snapshot:PublicSnapshot;wsUrl:string};};
  await command('start');return{players,command,view};
 }
 test('a second socket cannot regress the player input acknowledgement or replace newer intent',async()=>{
  const r=await room(),initial=await r.view(),id=r.players[0].playerId,a=await openArcadeSocket(initial.wsUrl,r.players[0].token,{origin}),b=await openArcadeSocket(initial.wsUrl,r.players[0].token,{origin});
  try{await Promise.all([a.next(),b.next()]);a.send({type:'input',input:inputFrame(initial.snapshot.runId,100)});await expect.poll(async()=>(await r.view()).snapshot.players[id].lastInputSeq).toBe(100);const before=(await r.view()).snapshot.players[id];b.send({type:'input',input:inputFrame(initial.snapshot.runId,1,{moveX:1})});await sleep(200);const after=(await r.view()).snapshot.players[id];expect(after.lastInputSeq).toBe(100);expect(after.x).toBeCloseTo(before.x,3);expect(after.y).toBeCloseTo(before.y,3);}finally{a.close();b.close();await r.command('pause');}
 });
 test('silent traffic loss releases a still-open socket body and valid traffic restores it',async()=>{
  const r=await room(),initial=await r.view(),id=r.players[0].playerId,socket=await openArcadeSocket(initial.wsUrl,r.players[0].token,{origin});
  try{await socket.next();socket.send({type:'input',input:inputFrame(initial.snapshot.runId,1)});await sleep(3400);expect(socket.closed).toBe(false);expect((await r.view()).snapshot.players[id].connected).toBe(false);socket.send({type:'input',input:inputFrame(initial.snapshot.runId,2)});await expect.poll(async()=>(await r.view()).snapshot.players[id].connected).toBe(true);}finally{socket.close();await r.command('pause');}
 });
 test('paused real runtime restart releases absent entrants on resume and preserves their progress',async()=>{
  const r=await room();await sleep(100);await r.command('pause');const before=(await r.view()).snapshot,id=r.players[0].playerId,liveId=r.players[1].playerId;expect(before.players[id].connected).toBe(true);
  await stop();await boot();const restored=await r.view();expect(restored.snapshot.paused).toBe(true);expect(restored.snapshot.runId).toBe(before.runId);expect(restored.snapshot.players[id]).toEqual(before.players[id]);
  const socket=await openArcadeSocket(restored.wsUrl,r.players[1].token,{origin});await socket.next();let seq=0;const heartbeat=setInterval(()=>socket.send({type:'input',input:inputFrame(before.runId,++seq)}),100);
  try{await r.command('resume');await sleep(3400);const after=(await r.view()).snapshot;expect(after.players[id].connected).toBe(false);expect(after.players[liveId].connected).toBe(true);for(const key of ['coins','carriedOrderId','x','y'] as const)expect(after.players[id][key]).toEqual(before.players[id][key]);}finally{clearInterval(heartbeat);socket.close();await r.command('pause');}
 });
});
