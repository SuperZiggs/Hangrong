import type {InputFrame,PublicSnapshot} from '../../shared/arcade/types';
import {applySnapshotPatch} from '../../shared/arcade/transport';
import {predictMotion} from './prediction';
export type ConnectionStatus='connecting'|'online'|'offline'|'invalid';
export const makeToken=()=>{const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');};
export const sessionKey=(role:string,code:string)=>`cdgk:${role}:${code}`;
export function readToken(role:string,code:string){try{return localStorage.getItem(sessionKey(role,code));}catch{return null;}}
export function saveToken(role:string,code:string,token:string){localStorage.setItem(sessionKey(role,code),token);}
export async function arcadeApi<T=Record<string,unknown>>(path:string,body?:unknown,token?:string|null):Promise<T>{const r=await fetch(`/api/arcade/rooms${path}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await r.json() as {error?:{message?:string}};if(!r.ok)throw Object.assign(new Error(data.error?.message??'Không xử lý được thao tác.'),{status:r.status});return data as T;}
export class ArcadeConnection{
 private pending:{input:InputFrame;at:number}[]=[];
 predictedPlayer=()=>{const s=this.snapshot,id=this.you?.playerId;if(!s||!id)return null;const ack=s.lastInputSeq[id]??-1;this.pending=this.pending.filter(f=>f.input.runId===s.runId&&f.input.seq>ack);return predictMotion(s,id,this.pending.map((f,i)=>({input:f.input,dtMs:i===this.pending.length-1?Math.min(50,performance.now()-f.at):50})));};
 snapshot:PublicSnapshot|null=null;status:ConnectionStatus='connecting';error='';you:{playerId:string;name:string}|undefined;
 private socket:WebSocket|null=null;private listeners=new Set<()=>void>();private retry:ReturnType<typeof setTimeout>|null=null;private stopped=false;private failures=0;
 constructor(readonly code:string,readonly token:string|null){void this.open();}
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 private notify(){for(const fn of this.listeners)fn();}
 private async open(){if(this.stopped)return;this.status=this.snapshot?'offline':'connecting';this.notify();try{
  const bootstrap=await arcadeApi<{snapshot:PublicSnapshot;wsUrl:string;you?:{playerId:string;name:string}}>(`/${this.code}/bootstrap`,undefined,this.token);if(this.stopped)return;this.snapshot=bootstrap.snapshot;this.you=bootstrap.you;this.notify();
  const ws=new WebSocket(bootstrap.wsUrl);this.socket=ws;ws.onopen=()=>ws.send(JSON.stringify({type:'auth',...(this.token?{token:this.token}:{})}));
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch{return;}if(m.type==='snapshot'||m.type==='patch'){if(m.type==='snapshot')this.snapshot=m.snapshot;else if(this.snapshot)this.snapshot=applySnapshotPatch(this.snapshot,m.patch);this.status='online';this.failures=0;this.error='';this.notify();}else if(m.type==='error'){if(['UNAUTHORIZED','AUTH_REQUIRED'].includes(m.error.code)){this.status='invalid';this.error=m.error.message;this.stopped=true;ws.close();this.notify();}}};
  ws.onclose=e=>{if(this.stopped)return;if(e.code===4001){this.status='invalid';this.error='Phiên đã chuyển sang thiết bị khác.';this.stopped=true;this.notify();return;}this.status='offline';this.notify();this.schedule();};ws.onerror=()=>{this.status='offline';this.notify();};
 }catch(e){if(this.stopped)return;this.error=(e as Error).message;if([401,403,404,410].includes((e as {status:number}).status)){this.status='invalid';this.notify();}else{this.status='offline';this.notify();this.schedule();}}}
 private schedule(){if(this.stopped||this.retry)return;this.retry=setTimeout(()=>{this.retry=null;void this.open();},Math.min(3000,500*2**Math.min(3,this.failures++)));}
 sendInput(input:InputFrame){if(this.socket?.readyState===WebSocket.OPEN&&this.status==='online'){this.socket.send(JSON.stringify({type:'input',input}));this.pending.push({input,at:performance.now()});this.pending=this.pending.slice(-5);}}
 disconnect(){this.stopped=true;if(this.retry)clearTimeout(this.retry);this.socket?.close();this.listeners.clear();}
}
export const connectArcade=(options:{code:string;token:string|null})=>new ArcadeConnection(options.code,options.token);
