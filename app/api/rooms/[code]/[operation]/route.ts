import { z } from 'zod';
import { body,endpoint,json,requestId,token,groupName,slot,round,selection } from '../../../../../server/http';
import { digest,identify,requireHost,requireTeam } from '../../../../../server/capabilities';
import { currentRoom,mutateRoom } from '../../../../../server/room-store';
import { joinState,startRun,phaseOf,saveChoice,submitRound,buildView } from '../../../../../server/game/engine';
import { GameError } from '../../../../../server/game/types';
import { enforceLimit } from '../../../../../server/rate-limit';
type Context={params:Promise<{code:string;operation:string}>};
const joinSchema=z.object({requestId,slot,name:groupName,teamToken:token}).strict();
const answerSchema=selection.extend({requestId,runId:z.string(),roundIndex:round}).strict();
const submitSchema=z.object({requestId,runId:z.string(),roundIndex:round,answers:z.array(selection).max(3)}).strict();
const hostSchema=z.object({requestId,runId:z.string().nullable().optional(),action:z.enum(['start','pause','resume','rename','remove','issue-recovery','replay']),payload:z.record(z.unknown()).optional()}).strict();
async function auth(request:Request){const h=request.headers.get('authorization');if(!h)return {raw:null,hash:null};if(!h.startsWith('Bearer ')||!token.safeParse(h.slice(7)).success)throw new GameError('UNAUTHORIZED','Phiên không hợp lệ.',401);const raw=h.slice(7);return {raw,hash:await digest(raw)};}
async function params(context:Context){const p=await context.params;if(!/^\d{6}$/.test(p.code))throw new GameError('ROOM_NOT_FOUND','Mã phòng không hợp lệ.',404);return p;}
export async function GET(request:Request,context:Context){return endpoint(async()=>{
 const {code,operation}=await params(context),a=await auth(request),r=await currentRoom(code),actor=identify(r,a.hash);
 if(operation==='state')return json(buildView(r,actor,Date.now()));
 if(operation==='export'){
  requireHost(actor);if(phaseOf(r,Date.now()).phase!=='finished')throw new GameError('NOT_FINISHED','Chỉ xuất điểm khi ván đã kết thúc.');
  const rows=buildView(r,actor,Date.now()).leaderboard;
  const cell=(s:string|number)=>`"${String(s).replaceAll('"','""').replace(/^[=+@-]/,"'"+'$&')}"`;
  const text='\uFEFF'+[['Hạng','Nhóm','Tên','Điểm','Vòng 1','Vòng 2','Vòng 3'],...rows.map(x=>[x.rank,x.slot,x.name,x.score,...x.roundScores])].map(x=>x.map(cell).join(',')).join('\r\n');
  return new Response(text,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="quyen-luc-so-${code}.csv"`,'Cache-Control':'no-store'}});
 }
 throw new GameError('NOT_FOUND','Không tìm thấy thao tác.',404);
 });}
export async function POST(request:Request,context:Context){return endpoint(async()=>{
 const {code,operation}=await params(context),a=await auth(request);
 if(operation==='join'){
  const b=await body(request,joinSchema),hash=await digest(b.teamToken);await enforceLimit(request,'join');
  const {reply}=await mutateRoom(code,r=>{const t=joinState(r,b.slot,b.name,hash);return {code,slot:t.slot,teamId:t.teamId,playPath:`/play/${code}`};});return json(reply);
 }
 if(operation==='recover'){
  const b=await body(request,z.object({recoveryCode:z.string().min(8).max(128),newTeamToken:token}).strict()),recoveryHash=await digest(b.recoveryCode),newHash=await digest(b.newTeamToken);await enforceLimit(request,'recover');
  const {reply}=await mutateRoom(code,(r,now)=>{
   const key=`recover:${recoveryHash}`,receipt=r.receipts[key];
   if(receipt){
    if(receipt.action!==`recover:${newHash}`||!r.teams.some(t=>t.teamId===receipt.reply.teamId&&t.tokenHash===newHash))throw new GameError('RECOVERY_INVALID','Mã phục hồi đã được dùng.',403);
    return receipt.reply;
   }
   const t=r.teams.find(t=>t.recovery?.hash===recoveryHash);
   if(!t||!t.recovery||t.recovery.expiresAtMs<=now)throw new GameError('RECOVERY_INVALID','Mã phục hồi không đúng, hết hạn hoặc đã dùng.',403);
   if(r.teams.some(x=>x.teamId!==t.teamId&&x.tokenHash===newHash))throw new GameError('TOKEN_IN_USE','Phiên này đang thuộc nhóm khác.',409);
   t.tokenHash=newHash;delete t.recovery;
   const out={code,slot:t.slot,teamId:t.teamId,playPath:`/play/${code}`};
   r.receipts[key]={action:`recover:${newHash}`,reply:out};return out;
  });return json(reply);
 }
 if(operation==='host'){
  const b=await body(request,hostSchema);
  const recoveryCode=(await digest(`${a.raw}:recover:${code}:${b.requestId}`)).slice(0,16).toUpperCase(),recoveryHash=await digest(recoveryCode);
  const seed=crypto.randomUUID(),runId=crypto.randomUUID();
  const {reply}=await mutateRoom(code,(r,now)=>{
   requireHost(identify(r,a.hash));
   const receipt=r.receipts[b.requestId];if(receipt){if(receipt.action!==b.action)throw new GameError('REQUEST_CONFLICT','Mã thao tác đã được dùng.');return receipt.reply;}
   if(b.runId!==undefined&&b.runId!==r.runId)throw new GameError('STALE_RUN','Lệnh thuộc ván cũ.');
   const p=phaseOf(r,now);let out:Record<string,unknown>={ok:true};
   if(b.action==='start'){if(p.phase!=='lobby')throw new GameError('STARTED','Ván đã bắt đầu.');startRun(r,now,seed,runId);out={ok:true,runId:r.runId};}
   if(b.action==='pause'){if(p.phase==='lobby'||p.phase==='finished')throw new GameError('NOT_PLAYING','Ván chưa đang diễn ra.');if(r.pausedAtMs===null)r.pausedAtMs=now;}
   if(b.action==='resume'){if(r.pausedAtMs!==null){r.pausedMs+=now-r.pausedAtMs;r.pausedAtMs=null;}}
   if(b.action==='rename'||b.action==='remove'){
    if(p.phase!=='lobby')throw new GameError('STARTED','Chỉ thay đổi nhóm trong sảnh.');
    const s=slot.safeParse(b.payload?.slot);if(!s.success)throw new GameError('INVALID_INPUT','Chọn vị trí nhóm hợp lệ.',400);
    const t=r.teams.find(t=>t.slot===s.data);if(!t)throw new GameError('TEAM_NOT_FOUND','Không thấy nhóm này.',404);
    if(b.action==='remove')r.teams=r.teams.filter(x=>x.teamId!==t.teamId);
    else {const n=groupName.safeParse(b.payload?.name);if(!n.success)throw new GameError('INVALID_NAME','Tên nhóm cần 2–30 ký tự.',400);t.name=n.data;}
   }
   if(b.action==='issue-recovery'){
    const s=slot.safeParse(b.payload?.slot);if(!s.success)throw new GameError('INVALID_INPUT','Chọn nhóm hợp lệ.',400);
    const t=r.teams.find(t=>t.slot===s.data);if(!t)throw new GameError('TEAM_NOT_FOUND','Không thấy nhóm này.',404);
    t.recovery={hash:recoveryHash,expiresAtMs:now+300000};out={ok:true,slot:t.slot};
   }
   if(b.action==='replay'){if(p.phase!=='finished')throw new GameError('NOT_FINISHED','Chơi lại sau khi ván đã kết thúc.');for(const t of r.teams)delete t.recovery;startRun(r,now,seed,runId);out={ok:true,runId:r.runId};}
   r.receipts[b.requestId]={action:b.action,reply:out};return out;
  });
  return json(b.action==='issue-recovery'?{...reply,recoveryCode}:reply);
 }
 if(operation==='answer'){
  const b=await body(request,answerSchema);const {room}=await mutateRoom(code,(r,now)=>{saveChoice(r,requireTeam(r,identify(r,a.hash)),b,now);});return json(buildView(room,identify(room,a.hash),Date.now()));
 }
 if(operation==='submit'){
  const b=await body(request,submitSchema);const {room}=await mutateRoom(code,(r,now)=>{const t=requireTeam(r,identify(r,a.hash));if(b.runId!==r.runId)throw new GameError('STALE_RUN','Yêu cầu thuộc ván cũ.');const receipt=r.receipts[b.requestId];if(receipt){if(receipt.action!==`submit:${t.teamId}:${b.runId}:${b.roundIndex}`)throw new GameError('REQUEST_CONFLICT','Mã gửi không khớp.');return;}submitRound(r,t,b,now);r.receipts[b.requestId]={action:`submit:${t.teamId}:${b.runId}:${b.roundIndex}`,reply:{ok:true}};});return json(buildView(room,identify(room,a.hash),Date.now()));
 }
 throw new GameError('NOT_FOUND','Không tìm thấy thao tác.',404);
 });}
