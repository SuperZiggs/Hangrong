import {DurableObject} from 'cloudflare:workers';
import {createWorld,stepWorld} from '../shared/arcade/world';
import {projectSnapshot} from '../shared/arcade/snapshot';
import {RULES} from '../shared/arcade/config';
import {constrainPlayer} from '../shared/arcade/motion';
import type {Actor,InputFrame,World} from '../shared/arcade/types';
import {ArcadeError,errorResponse,hash,json,readBody,validRequest,validToken} from './auth';
import {inputSchema} from './protocol';
import {SnapshotStream,actorKey} from '../shared/arcade/stream';
import {InputInbox} from '../shared/arcade/input-inbox';
export interface RealtimeEnv{ARCADE_ROOMS:DurableObjectNamespace<ArcadeRoom>;ARCADE_ALLOWED_ORIGINS?:string;ARCADE_PUBLIC_WS_URL?:string;}
type Entrant={playerId:string;name:string;hash:string;recovery?:{hash:string;expires:number}};
type Stored={code:string;createRequestId:string;hostHash:string;expiresAtMs:number;roster:Entrant[];world:World;receipts:Record<string,{action:string;reply:Record<string,unknown>}>;recoveries:Record<string,{playerId:string;hash:string}>};
type Attachment={actor:Actor|null;hash:string|null;createdAt:number;seenAt:number;seq:number;rateAt:number;rateCount:number};
export class ArcadeRoom extends DurableObject<RealtimeEnv>{
 private stream=new SnapshotStream();private updateSeq=0;
 private presence=new Map<string,Map<WebSocket,number>>();
 private data:Stored|null=null;private timer:ReturnType<typeof setInterval>|null=null;private lastTickAt=0;private accumulator=0;private inputs=new InputInbox();private disconnected=new Map<string,number>();private tickCostMs=0;
 constructor(ctx:DurableObjectState,env:RealtimeEnv){super(ctx,env);ctx.blockConcurrencyWhile(async()=>{this.data=await ctx.storage.get<Stored>('room')??null;if(this.data&&Date.now()<this.data.expiresAtMs){for(const ws of ctx.getWebSockets()){const meta=ws.deserializeAttachment() as Attachment;if(ws.readyState===1&&this.currentActor(meta))this.touchPresence(ws,meta);}if(!this.data.world.paused&&!['lobby','results','interrupted'].includes(this.data.world.phase)){this.data.world.phase='interrupted';await this.save();}}});}
 private async save(){if(this.data)await this.ctx.storage.put('room',this.data);}
 private requireRoom(){if(!this.data)throw new ArcadeError('ROOM_NOT_FOUND','Không tìm thấy phòng.',404);if(Date.now()>=this.data.expiresAtMs)throw new ArcadeError('ROOM_EXPIRED','Phòng đã hết hạn.',410);return this.data;}
 private async identify(raw:string|null):Promise<{actor:Actor;digest:string|null}>{const d=this.requireRoom();if(!raw)return {actor:{role:'public'},digest:null};if(!validToken(raw))throw new ArcadeError('UNAUTHORIZED','Phiên không hợp lệ.',401);const digest=await hash(raw);if(digest===d.hostHash)return {actor:{role:'host'},digest};const p=d.roster.find(p=>p.hash===digest);if(!p)throw new ArcadeError('UNAUTHORIZED','Phiên đã hết quyền.',403);return {actor:{role:'player',playerId:p.playerId},digest};}
 private bearer(request:Request){const h=request.headers.get('authorization');if(!h)return null;if(!h.startsWith('Bearer '))throw new ArcadeError('UNAUTHORIZED','Phiên không hợp lệ.',401);return h.slice(7);}
 private currentActor(meta:Attachment){const d=this.requireRoom();if(!meta.actor)return null;if(meta.actor.role==='public')return meta.actor;if(meta.actor.role==='host')return meta.hash===d.hostHash?meta.actor:null;return d.roster.some(p=>p.playerId===meta.actor?.playerId&&p.hash===meta.hash)?meta.actor:null;}
 private wsUrl(request:Request){const u=new URL(request.url);const base=this.env.ARCADE_PUBLIC_WS_URL??`${u.protocol==='https:'?'wss:':'ws:'}//${u.host}`;return `${base.replace(/\/$/,'')}/rooms/${this.requireRoom().code}/socket`;}
 private snapshot(actor:Actor){return {...projectSnapshot(this.requireRoom().world,actor),serverNowMs:Date.now(),tickCostMs:this.tickCostMs};}
 private send(ws:WebSocket,value:unknown){try{ws.send(typeof value==='string'?value:JSON.stringify(value));}catch{/* Closed peer; disconnect event releases its body. */}}
 private broadcast(){if(!this.data)return;const peers=this.ctx.getWebSockets().map(ws=>({ws,actor:this.currentActor(ws.deserializeAttachment() as Attachment)})).filter((p):p is {ws:WebSocket;actor:Actor}=>!!p.actor);if(!peers.length)return;const frames=this.stream.frames(this.data.world,peers.map(p=>p.actor),{serverNowMs:Date.now(),tickCostMs:this.tickCostMs,updateSeq:++this.updateSeq});for(const peer of peers)this.send(peer.ws,frames.get(actorKey(peer.actor))!);}
 private stop(){if(this.timer)clearInterval(this.timer);this.timer=null;this.accumulator=0;}
 private touchPresence(ws:WebSocket,meta:Attachment){
  const id=meta.actor?.role==='player'?meta.actor.playerId:undefined;if(!id)return;
  let peers=this.presence.get(id);if(!peers){peers=new Map();this.presence.set(id,peers);}peers.set(ws,meta.seenAt);
 }
 private reconcilePresence(now:number){
  const world=this.data!.world;
  for(const p of Object.values(world.players)){
   const peers=this.presence.get(p.playerId);let at:number|undefined;
   if(peers)for(const seen of peers.values())at=Math.max(at??0,seen);
   if(at!==undefined&&now-at<RULES.disconnectMs){if(!p.connected){p.connected=true;constrainPlayer(world,p);}this.disconnected.delete(p.playerId);}
   else{const absentAt=this.disconnected.get(p.playerId)??at??now;this.disconnected.set(p.playerId,absentAt);if(now-absentAt>=RULES.disconnectMs){p.connected=false;this.inputs.delete(p.playerId);}}
  }
 }
 private startTimer(){this.stop();this.lastTickAt=Date.now();this.timer=setInterval(()=>this.tick(),RULES.tickMs);void this.ctx.storage.setAlarm(Date.now()+20000);}
 async alarm(){const w=this.data?.world;if(w&&!w.paused&&!['lobby','interrupted'].includes(w.phase)&&w.elapsedMs<RULES.endMs)await this.ctx.storage.setAlarm(Date.now()+20000);}
 private tick(){if(!this.data)return;const w=this.data.world;if(w.paused||w.phase==='lobby'||w.phase==='interrupted'){this.stop();return;}const now=Date.now(),gap=now-this.lastTickAt;this.lastTickAt=now;
  if(gap>3000){w.paused=true;w.events.push({id:`lag:${w.tick}`,kind:'warning',text:'Máy chủ chậm nhịp. MC có thể tiếp tục sau khi kết nối ổn định.',at:w.elapsedMs});this.stop();void this.save();this.broadcast();return;}
  this.accumulator+=gap;const started=performance.now();this.reconcilePresence(now);let changed=false,steps=0;
  while(this.accumulator>=RULES.tickMs&&steps++<60){this.accumulator-=RULES.tickMs;const frames=this.inputs.sample(now);
   const result=stepWorld(w,frames,RULES.tickMs);changed=changed||result.phaseChanged;
  }
  if(changed)void this.save();if(w.tick%2===0||changed)this.broadcast();if(w.elapsedMs>=RULES.endMs){this.stop();void this.save();}
  this.tickCostMs=performance.now()-started;
 }
 private lobbyWorld(){const d=this.requireRoom();d.world=createWorld({seed:d.code,initialCoins:20,roster:d.roster.map(p=>({playerId:p.playerId,name:p.name}))});d.world.phase='lobby';}
 private playerReply(p:Entrant){const code=this.requireRoom().code;return {code,playerId:p.playerId,playPath:`/arcade/play/${code}`};}
 private closePlayer(playerId:string){this.presence.delete(playerId);this.disconnected.set(playerId,Date.now());for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment() as Attachment;if(a.actor?.playerId===playerId)try{ws.close(4001,'Phiên đã chuyển thiết bị.');}catch{}}}
 async fetch(request:Request){try{
  const url=new URL(request.url),operation=url.pathname.split('/').pop()!,code=url.pathname.split('/')[2];
  if(operation==='create'&&request.method==='POST'){
   const b=await readBody(request);if(!validRequest(b.requestId)||!validToken(b.hostToken))throw new ArcadeError('INVALID_INPUT','Thông tin tạo phòng không hợp lệ.');const hostHash=await hash(b.hostToken);
   if(this.data&&Date.now()<this.data.expiresAtMs){if(this.data.createRequestId!==b.requestId)return new Response(null,{status:409,headers:{'X-Arcade-Collision':'1'}});if(this.data.hostHash!==hostHash)throw new ArcadeError('CREATE_CONFLICT','Yêu cầu không khớp phiên.',409);}
   else{this.stop();this.data={code,createRequestId:b.requestId,hostHash,expiresAtMs:Date.now()+86400000,roster:[],world:createWorld({seed:code,initialCoins:20,roster:[]}),receipts:{},recoveries:{}};this.data.world.phase='lobby';await this.save();}
   return json({code,hostPath:`/arcade/host/${code}`,joinPath:`/arcade?room=${code}`,expiresAtMs:this.data.expiresAtMs});
  }
  const d=this.requireRoom();
  if(operation==='socket'){
   if(request.headers.get('upgrade')?.toLowerCase()!=='websocket')throw new ArcadeError('UPGRADE','Cần kết nối WebSocket.',426);
   const allowed=(this.env.ARCADE_ALLOWED_ORIGINS??'http://127.0.0.1:5189,http://localhost:5189,http://127.0.0.1:5187,http://localhost:5187,http://127.0.0.1:5191').split(',').map(s=>s.trim());if(!allowed.includes(request.headers.get('origin')??''))throw new ArcadeError('ORIGIN','Nguồn kết nối không hợp lệ.',403);
   const pair=new WebSocketPair(),[client,server]=Object.values(pair);this.ctx.acceptWebSocket(server);const now=Date.now();server.serializeAttachment({actor:null,hash:null,createdAt:now,seenAt:now,seq:-1,rateAt:now,rateCount:0} satisfies Attachment);
   setTimeout(()=>{try{if(!(server.deserializeAttachment() as Attachment).actor)server.close(1008,'Xác thực quá hạn.');}catch{}},5000);return new Response(null,{status:101,webSocket:client});
  }
  if(operation==='join'&&request.method==='POST'){
   const b=await readBody(request);if(!validRequest(b.requestId)||!validToken(b.playerToken)||typeof b.name!=='string'||b.name.trim().length<2||b.name.trim().length>30)throw new ArcadeError('INVALID_INPUT','Tên cần từ 2 đến 30 ký tự.');
   const digest=await hash(b.playerToken),receipt=d.receipts[`join:${b.requestId}`];if(receipt&&receipt.action!==digest)throw new ArcadeError('JOIN_CONFLICT','Yêu cầu tham gia không khớp.',409);
   let p=d.roster.find(p=>p.hash===digest);if(!p){if(d.world.phase!=='lobby')throw new ArcadeError('STARTED','Ván đã bắt đầu.',409);if(d.roster.length>=128)throw new ArcadeError('ROOM_BUSY','Phòng đã đạt ngưỡng tài nguyên.',503);p={playerId:crypto.randomUUID(),name:b.name.trim(),hash:digest};d.roster.push(p);this.lobbyWorld();}
   const reply=this.playerReply(p);d.receipts[`join:${b.requestId}`]={action:digest,reply};await this.save();this.broadcast();return json(reply);
  }
  if(operation==='recover'&&request.method==='POST'){
   const b=await readBody(request);if(typeof b.recoveryCode!=='string'||!validToken(b.newPlayerToken))throw new ArcadeError('RECOVERY_INVALID','Mã phục hồi không hợp lệ.',403);const key=await hash(b.recoveryCode),replacement=await hash(b.newPlayerToken),prior=d.recoveries[key];
   if(prior){const p=d.roster.find(p=>p.playerId===prior.playerId&&p.hash===replacement);if(!p||prior.hash!==replacement)throw new ArcadeError('RECOVERY_INVALID','Mã đã được dùng.',403);return json(this.playerReply(p));}
   const p=d.roster.find(p=>p.recovery?.hash===key&&p.recovery.expires>Date.now());if(!p)throw new ArcadeError('RECOVERY_INVALID','Mã không đúng hoặc đã hết hạn.',403);if(d.roster.some(q=>q.playerId!==p.playerId&&q.hash===replacement))throw new ArcadeError('TOKEN_IN_USE','Phiên đã có người dùng.',409);
   p.hash=replacement;delete p.recovery;d.recoveries[key]={playerId:p.playerId,hash:replacement};this.closePlayer(p.playerId);this.inputs.delete(p.playerId);await this.save();return json(this.playerReply(p));
  }
  const identity=await this.identify(this.bearer(request)),actor=identity.actor;
  if(operation==='bootstrap'&&request.method==='GET'){const player=actor.role==='player'?d.roster.find(p=>p.playerId===actor.playerId):undefined;return json({role:actor.role,wsUrl:this.wsUrl(request),snapshot:this.snapshot(actor),...(player?{you:{playerId:player.playerId,name:player.name}}:{})});}
  if(operation==='export'&&request.method==='GET'){
   if(actor.role!=='host')throw new ArcadeError('HOST_ONLY','Chỉ MC được xuất kết quả.',403);if(d.world.phase!=='results')throw new ArcadeError('NOT_FINISHED','Ván chưa kết thúc.',409);
   const cell=(s:string|number)=>`"${String(s).replaceAll('"','""').replace(/^[=+@-]/,"'"+'$&')}"`,rows=[['Hạng','Tên','Xu','Đơn giao','Phí P','Góp lối chung'],...this.snapshot(actor).leaderboard.map(p=>[p.rank,p.name,p.coins,p.delivered,p.feesPaid,p.contributed])];return new Response('\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Cache-Control':'no-store','Content-Disposition':`attachment; filename="cuoc-dua-${code}.csv"`}});
  }
  if(operation==='host'&&request.method==='POST'){
   if(actor.role!=='host')throw new ArcadeError('HOST_ONLY','Chỉ MC được điều khiển phòng.',403);const b=await readBody(request);if(!validRequest(b.requestId)||typeof b.action!=='string')throw new ArcadeError('INVALID_INPUT','Lệnh điều khiển không hợp lệ.');
   const action=b.action,payload=(b.payload??{}) as Record<string,unknown>,fingerprint=JSON.stringify({action,payload});const prior=d.receipts[`host:${b.requestId}`];if(prior){if(prior.action!==fingerprint)throw new ArcadeError('REQUEST_CONFLICT','Mã thao tác đã được dùng.',409);return json(prior.reply);}
   if(b.runId!==undefined&&b.runId!==null&&b.runId!==d.world.runId)throw new ArcadeError('STALE_RUN','Lệnh thuộc ván cũ.',409);let reply:Record<string,unknown>={ok:true};
   if(action==='start'||action==='replay'){
    if(action==='start'&&d.world.phase!=='lobby')throw new ArcadeError('STARTED','Ván đã bắt đầu.',409);if(d.roster.length<3)throw new ArcadeError('MIN_PLAYERS','Cần ít nhất 3 người tham gia.',409);
    d.world=createWorld({seed:crypto.randomUUID(),initialCoins:20,roster:d.roster.map(p=>({playerId:p.playerId,name:p.name}))});this.inputs.clear();this.disconnected.clear();for(const p of d.roster)this.disconnected.set(p.playerId,Date.now());for(const ws of this.ctx.getWebSockets()){const m=ws.deserializeAttachment() as Attachment;m.seq=-1;ws.serializeAttachment(m);const a=this.currentActor(m);if(a?.playerId)this.disconnected.delete(a.playerId);}this.startTimer();reply={ok:true,runId:d.world.runId};
   }else if(action==='pause'){if(['lobby','results','interrupted'].includes(d.world.phase))throw new ArcadeError('NOT_PLAYING','Ván chưa đang diễn ra.',409);d.world.paused=true;this.inputs.clear();this.stop();}
   else if(action==='resume'){if(d.world.paused){d.world.paused=false;this.startTimer();}}
   else if(action==='rename'||action==='remove'||action==='issue-recovery'){
    const p=d.roster.find(p=>p.playerId===payload.playerId);if(!p)throw new ArcadeError('PLAYER_MISSING','Không tìm thấy người chơi.',404);
    if(action==='rename'){if(typeof payload.name!=='string'||payload.name.trim().length<2||payload.name.trim().length>30)throw new ArcadeError('INVALID_NAME','Tên cần từ 2 đến 30 ký tự.');p.name=payload.name.trim();d.world.players[p.playerId].name=p.name;}
    else if(action==='remove'){if(d.world.phase!=='lobby')throw new ArcadeError('STARTED','Chỉ loại người trong sảnh.',409);this.closePlayer(p.playerId);d.roster=d.roster.filter(q=>q!==p);this.lobbyWorld();}
    else{const recoveryCode=(await hash(`${identity.digest}:${b.requestId}`)).slice(0,16).toUpperCase();p.recovery={hash:await hash(recoveryCode),expires:Date.now()+300000};reply={ok:true,recoveryCode};}
   }else throw new ArcadeError('INVALID_ACTION','Không có thao tác này.');
   d.receipts[`host:${b.requestId}`]={action:fingerprint,reply};await this.save();this.broadcast();return json(reply);
  }
  throw new ArcadeError('NOT_FOUND','Không tìm thấy thao tác.',404);
 }catch(e){return errorResponse(e);}}
 async webSocketMessage(ws:WebSocket,raw:string|ArrayBuffer){try{
  this.requireRoom();const meta=ws.deserializeAttachment() as Attachment;
  if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>16384){this.send(ws,{type:'error',error:{code:'TOO_LARGE',message:'Gói dữ liệu quá lớn.'}});ws.close(1009,'Frame too large');return;}
  let message:Record<string,unknown>;try{message=JSON.parse(raw);}catch{throw new ArcadeError('INVALID_JSON','Gói tin không hợp lệ.');}if(!message||typeof message!=='object')throw new ArcadeError('INVALID_INPUT','Gói tin không hợp lệ.');
  if(!meta.actor){if(message.type!=='auth')throw new ArcadeError('AUTH_REQUIRED','Cần xác thực.');const identity=await this.identify(typeof message.token==='string'?message.token:null);meta.actor=identity.actor;meta.hash=identity.digest;meta.seenAt=Date.now();ws.serializeAttachment(meta);
   if(meta.actor.role==='player'&&meta.actor.playerId){const p=this.data!.world.players[meta.actor.playerId];if(p){p.connected=true;constrainPlayer(this.data!.world,p);}this.disconnected.delete(meta.actor.playerId);}
   this.touchPresence(ws,meta);this.send(ws,{type:'snapshot',snapshot:this.snapshot(meta.actor)});return;
  }
  const actor=this.currentActor(meta);if(!actor){ws.close(4001,'Phiên đã hết quyền');return;}const now=Date.now();if(now-meta.rateAt>=1000){meta.rateAt=now;meta.rateCount=0;}if(++meta.rateCount>90)throw new ArcadeError('RATE_LIMIT','Thao tác quá nhanh.',429);meta.seenAt=now;
  if(message.type==='ping'){this.send(ws,{type:'pong',id:message.id});}
  else if(message.type==='input'){
   if(actor.role!=='player'||!actor.playerId)throw new ArcadeError('PLAYER_ONLY','Cần phiên người chơi.',403);const parsed=inputSchema.safeParse(message.input);if(!parsed.success)throw new ArcadeError('INVALID_INPUT','Thao tác không hợp lệ.');const f=parsed.data,w=this.data!.world;
   if(f.runId===w.runId&&f.seq>meta.seq&&f.seq>w.players[actor.playerId].lastInputSeq&&!['lobby','results','interrupted'].includes(w.phase)&&!w.paused){meta.seq=f.seq;this.inputs.set(actor.playerId,{frame:f,at:now});w.players[actor.playerId].lastInputSeq=f.seq;}
  }else throw new ArcadeError('INVALID_MESSAGE','Không có loại thao tác này.');ws.serializeAttachment(meta);this.touchPresence(ws,meta);
 }catch(e){const err=e instanceof ArcadeError?e:new ArcadeError('SERVER_ERROR','Không xử lý được gói tin.',500);this.send(ws,{type:'error',error:{code:err.code,message:err.message}});}}
 webSocketClose(ws:WebSocket){try{const m=ws.deserializeAttachment() as Attachment;if(m.actor?.playerId){const peers=this.presence.get(m.actor.playerId);peers?.delete(ws);if(!peers?.size){this.presence.delete(m.actor.playerId);this.inputs.delete(m.actor.playerId);this.disconnected.set(m.actor.playerId,Date.now());}}}catch{}}
 webSocketError(ws:WebSocket){this.webSocketClose(ws);}
}
