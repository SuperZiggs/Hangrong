import { env } from 'cloudflare:workers';
import type { Room } from './game/types';
import { GameError } from './game/types';
import { advanceRoom } from './game/engine';
export function database(){if(!env.DB)throw new GameError('DATABASE_UNAVAILABLE','Kho dữ liệu chưa sẵn sàng.',503);return env.DB;}
type Row={state_json:string;version:number};
export async function loadRoom(code:string):Promise<Room>{
 const row=await database().prepare('SELECT state_json,version FROM game_rooms WHERE code=?').bind(code).first<Row>();
 if(!row)throw new GameError('ROOM_NOT_FOUND','Không tìm thấy phòng này.',404);
 const r=JSON.parse(row.state_json) as Room;r.version=row.version;
 if(Date.now()>=r.expiresAtMs)throw new GameError('ROOM_EXPIRED','Phòng đã hết hạn. Hãy tạo phòng mới.',410);
 return r;
}
export async function insertRoom(r:Room){
 const text=JSON.stringify(r);await database().prepare('INSERT INTO game_rooms (id,code,create_request_id,version,state_json,created_at_ms,expires_at_ms) VALUES (?,?,?,0,?,?,?)').bind(r.id,r.code,r.createRequestId,text,r.createdAtMs,r.expiresAtMs).run();
}
export async function findCreated(id:string){const row=await database().prepare('SELECT state_json,version FROM game_rooms WHERE create_request_id=?').bind(id).first<Row>();if(!row)return null;const r=JSON.parse(row.state_json) as Room;r.version=row.version;return r;}
export async function mutateRoom<T>(code:string,fn:(r:Room,now:number)=>T):Promise<{room:Room;reply:T}>{
 for(let attempt=0;attempt<8;attempt++){
  const r=await loadRoom(code),version=r.version,now=Date.now();advanceRoom(r,now);
  const reply=fn(r,now);r.version=version+1;
  const text=JSON.stringify(r);if(new TextEncoder().encode(text).byteLength>524288)throw new GameError('ROOM_TOO_LARGE','Dữ liệu phòng vượt giới hạn.',503);
  const saved=await database().prepare('UPDATE game_rooms SET version=?,state_json=? WHERE code=? AND version=?').bind(r.version,text,code,version).run();
  if(saved.meta.changes===1)return {room:r,reply};
 }
 throw new GameError('BUSY','Phòng đang nhận nhiều thao tác. Hãy thử lại.',409);
}
export async function currentRoom(code:string){const r=await loadRoom(code);if(!advanceRoom(r,Date.now()))return r;return(await mutateRoom(code,()=>null)).room;}
