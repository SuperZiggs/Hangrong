import { z } from 'zod';
import { body,endpoint,json,requestId,token } from '../../../server/http';
import { digest } from '../../../server/capabilities';
import { findCreated,insertRoom,database } from '../../../server/room-store';
import { createState } from '../../../server/game/engine';
import { GameError } from '../../../server/game/types';
import { enforceLimit } from '../../../server/rate-limit';
const schema=z.object({requestId,hostToken:token}).strict();
function result(r:{code:string;expiresAtMs:number}){return json({code:r.code,hostPath:`/host/${r.code}`,joinPath:`/?room=${r.code}`,expiresAtMs:r.expiresAtMs});}
export async function POST(request:Request){return endpoint(async()=>{
 const b=await body(request,schema),hash=await digest(b.hostToken),prior=await findCreated(b.requestId);
 if(prior){if(prior.hostHash!==hash)throw new GameError('CREATE_CONFLICT','Yêu cầu tạo phòng không khớp.',403);return result(prior);}
 await enforceLimit(request,'create');
 for(let i=0;i<5;i++){
  const random=new Uint32Array(1);crypto.getRandomValues(random);const code=String(100000+random[0]%900000);
  const room=createState(code,hash,Date.now(),b.requestId);
  try{await insertRoom(room);await database().prepare('DELETE FROM game_rooms WHERE id IN (SELECT id FROM game_rooms WHERE expires_at_ms<? LIMIT 20)').bind(Date.now()).run();return result(room);}catch(e){const duplicate=await findCreated(b.requestId);if(duplicate){if(duplicate.hostHash!==hash)throw new GameError('CREATE_CONFLICT','Yêu cầu không khớp.',403);return result(duplicate);}if(!(e instanceof Error)||!e.message.toLowerCase().includes('unique'))throw e;}
 }
 throw new GameError('CREATE_BUSY','Chưa tạo được mã phòng. Hãy thử lại.',503);
 });}
