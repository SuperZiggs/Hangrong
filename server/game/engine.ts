import type { Room, Team, Actor, TeamRound } from './types';
import { GameError } from './types';
import { getCatalog } from '../content';
import type { RoomView, Phase, Feedback } from '../../shared/game-contracts';
import { ROUND_TITLES } from '../../shared/game-contracts';
export function createState(code:string,hostHash:string,now:number,requestId:string):Room{return {id:crypto.randomUUID(),code,hostHash,createRequestId:requestId,createdAtMs:now,expiresAtMs:now+86400000,version:0,runId:null,seed:null,startedAtMs:null,pausedAtMs:null,pausedMs:0,teams:[],receipts:{}};}
export function joinState(r:Room,slot:number|undefined,name:string,hash:string):Team {
  const rejoining=r.teams.find(t=>t.tokenHash===hash);
  if(rejoining){if(slot!==undefined&&slot!==rejoining.slot)throw new GameError('SLOT_TAKEN','Phiên này đã có lượt tham gia.');return rejoining;}
  if(r.startedAtMs!==null)throw new GameError('STARTED','Ván đã bắt đầu, không thể thêm lượt tham gia.');
  const occupied=new Set(r.teams.map(t=>t.slot));
  let assigned=slot??1;
  if(slot===undefined)while(occupied.has(assigned))assigned++;
  if(!Number.isSafeInteger(assigned)||assigned<1)throw new GameError('INVALID_SLOT','Mã lượt tham gia không hợp lệ.',400);
  if(r.teams.some(t=>t.slot===assigned))throw new GameError('SLOT_TAKEN','Vị trí đã có người tham gia.');
  const team:Team={teamId:crypto.randomUUID(),slot:assigned,name,tokenHash:hash,rounds:[]};
  r.teams.push(team);r.teams.sort((a,b)=>a.slot-b.slot);return team;
}
function random(seed:string){let n=2166136261;for(const c of seed)n=Math.imul(n^c.charCodeAt(0),16777619);return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};}
function shuffle<T>(values:T[],rng:()=>number):T[]{const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function startRun(r:Room,now:number,seed:string,runId:string){
  if(r.teams.length<3)throw new GameError('TEAM_COUNT','Cần ít nhất 3 lượt tham gia để bắt đầu.');
  const rng=random(seed),catalog=getCatalog();
  r.runId=runId;r.seed=seed;r.startedAtMs=now;r.pausedAtMs=null;r.pausedMs=0;
  for(const t of r.teams)t.rounds=[];
  for(let round=1;round<=3;round++){
    const bank=shuffle(catalog.filter(m=>m.roundIndex===round),rng);
    r.teams.forEach((team,i)=>{
      const m=structuredClone(bank[i%bank.length]);
      for(const task of m.tasks){
        const correct=task.correctChoiceId;
        for(const choice of task.choices){const old=choice.id;choice.id=`o-${Math.floor(rng()*0xffffffff).toString(16)}-${Math.floor(rng()*0xffffffff).toString(16)}`;if(old===correct)task.correctChoiceId=choice.id;}
        task.choices=shuffle(task.choices,rng);
      }
      team.rounds.push({mission:m,draft:{},locked:false,graded:false,score:0,correctCount:0});
    });
  }
}
export function phaseOf(r:Room,now:number):{phase:Phase;roundIndex:number;remainingMs:number;deadlineMs:number|null;elapsedMs:number}{
  if(r.startedAtMs===null)return {phase:'lobby',roundIndex:0,remainingMs:0,deadlineMs:null,elapsedMs:0};
  const base=r.pausedAtMs??now,elapsedMs=Math.max(0,base-r.startedAtMs-r.pausedMs);
  if(elapsedMs>=540000)return {phase:'finished',roundIndex:3,remainingMs:0,deadlineMs:null,elapsedMs};
  const roundIndex=Math.floor(elapsedMs/180000)+1,offset=elapsedMs%180000;
  const phase:Phase=offset<120000?'answering':offset<165000?'review':'leaderboard';
  const end=phase==='answering'?120000:phase==='review'?165000:180000;
  const remainingMs=end-offset;
  return {phase,roundIndex,remainingMs,deadlineMs:base+remainingMs,elapsedMs};
}
export function advanceRoom(r:Room,now:number){
  const p=phaseOf(r,now);let changed=false;
  for(const t of r.teams)for(let i=0;i<t.rounds.length;i++){
    const x=t.rounds[i];
    if(!x.graded&&p.elapsedMs>=i*180000+120000){x.locked=true;x.graded=true;x.correctCount=x.mission.tasks.filter(q=>x.draft[q.id]?.choiceId===q.correctChoiceId).length;x.score=x.correctCount*10;changed=true;}
  }
  return changed;
}
type SaveInput={runId:string;roundIndex:number;taskId:string;choiceId:string;seq:number};
function writable(r:Room,t:Team,runId:string,round:number,now:number,allowLocked=false):TeamRound{
  if(r.runId!==runId)throw new GameError('STALE_RUN','Yêu cầu thuộc ván cũ. Hãy tải trạng thái mới.');
  if(r.pausedAtMs!==null)throw new GameError('PAUSED','MC đang tạm dừng.',423);
  const p=phaseOf(r,now),x=t.rounds[round-1];
  if(p.phase!=='answering'||p.roundIndex!==round||!x||x.graded||(!allowLocked&&x.locked))throw new GameError('LOCKED','Vòng này đã khóa đáp án.');
  return x;
}
function validateChoice(x:TeamRound,input:Pick<SaveInput,'taskId'|'choiceId'|'seq'>){
  if(!Number.isSafeInteger(input.seq)||input.seq<1)throw new GameError('INVALID_SEQ','Lần lưu không hợp lệ.',400);
  const task=x.mission.tasks.find(q=>q.id===input.taskId);
  if(!task?.choices.some(c=>c.id===input.choiceId))throw new GameError('INVALID_CHOICE','Lựa chọn không thuộc nhiệm vụ của nhóm.',400);
}
export function saveChoice(r:Room,t:Team,input:SaveInput,now:number){
  const x=writable(r,t,input.runId,input.roundIndex,now);validateChoice(x,input);
  const old=x.draft[input.taskId];
  if(old&&old.seq>input.seq)return;
  if(old&&old.seq===input.seq&&old.choiceId!==input.choiceId)throw new GameError('SEQ_CONFLICT','Lựa chọn mới có cùng số thứ tự với bản cũ.');
  x.draft[input.taskId]={choiceId:input.choiceId,seq:input.seq};
}
export function submitRound(r:Room,t:Team,input:{runId:string;roundIndex:number;answers:{taskId:string;choiceId:string;seq:number}[]},now:number){
  const x=writable(r,t,input.runId,input.roundIndex,now,true);
  if(x.locked)return;
  if(new Set(input.answers.map(a=>a.taskId)).size!==input.answers.length)throw new GameError('DUPLICATE_TASK','Một nhiệm vụ không được gửi nhiều lần.',400);
  for(const a of input.answers)validateChoice(x,a);
  const draft=structuredClone(x.draft);
  for(const a of input.answers){const old=draft[a.taskId];if(old&&old.seq===a.seq&&old.choiceId!==a.choiceId)throw new GameError('SEQ_CONFLICT','Bản trả lời không khớp lần lưu.');if(!old||a.seq>=old.seq)draft[a.taskId]={choiceId:a.choiceId,seq:a.seq};}
  x.draft=draft;x.locked=true;
}
export function buildView(r:Room,actor:Actor,now:number):RoomView{
  const p=phaseOf(r,now);
  const rows=r.teams.map(t=>({rank:0,teamId:t.teamId,slot:t.slot,name:t.name,score:t.rounds.reduce((s,x)=>s+(x.graded?x.score:0),0),roundScores:[0,1,2].map(i=>t.rounds[i]?.graded?t.rounds[i].score:0),correctCount:t.rounds.reduce((s,x)=>s+(x.graded?x.correctCount:0),0)})).sort((a,b)=>b.score-a.score||a.slot-b.slot);
  rows.forEach((x,i)=>x.rank=i>0&&x.score===rows[i-1].score?rows[i-1].rank:i+1);
  const view:RoomView={role:actor.role,code:r.code,roomVersion:r.version,runId:r.runId,serverNowMs:now,phase:p.phase,roundIndex:p.roundIndex,deadlineMs:p.deadlineMs,remainingMs:p.remainingMs,paused:r.pausedAtMs!==null,roundTitle:ROUND_TITLES[p.roundIndex-1]??'Sẵn sàng vào cuộc',expiresAtMs:r.expiresAtMs,teams:r.teams.map(t=>({teamId:t.teamId,slot:t.slot,name:t.name,submitted:!!t.rounds[p.roundIndex-1]?.locked})),leaderboard:rows};
  if(actor.role==='team'){
    const t=r.teams.find(t=>t.teamId===actor.teamId)!;
    view.you={teamId:t.teamId,slot:t.slot,name:t.name};
    const x=t.rounds[p.roundIndex-1];
    if(x){
      const m=x.mission;
      view.mission={id:m.id,title:m.title,context:m.context,fictional:true,tasks:m.tasks.map(q=>({id:q.id,prompt:q.prompt,choices:q.choices.map(c=>({...c}))}))};
      view.draft=structuredClone(x.draft);view.locked=x.locked;
    }
    const results:Feedback[]=t.rounds.flatMap((x,i)=>x.graded?[{roundIndex:i+1,missionTitle:x.mission.title,score:x.score,answers:x.mission.tasks.map(q=>({taskId:q.id,prompt:q.prompt,selectedChoiceId:x.draft[q.id]?.choiceId??null,correctChoiceId:q.correctChoiceId,correctChoiceText:q.choices.find(c=>c.id===q.correctChoiceId)!.text,explanation:q.explanation,points:x.draft[q.id]?.choiceId===q.correctChoiceId?10:0,correct:x.draft[q.id]?.choiceId===q.correctChoiceId}))}]:[]);
    if(results.length)view.results=results;
  }
  return view;
}
