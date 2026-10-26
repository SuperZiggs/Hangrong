import { z } from 'zod';
import { GameError } from './game/types';
export const token=z.string().regex(/^[A-Za-z0-9_-]{43}$/,'Mã phiên không hợp lệ.');
export const requestId=z.string().min(8).max(128);
export const groupName=z.string().trim().min(2).max(30);
export const slot=z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const selection=z.object({taskId:z.string().min(1).max(150),choiceId:z.string().min(1).max(150),seq:z.number().int().positive()}).strict();
export const round=z.number().int().min(1).max(3);
export function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export async function body<T extends z.ZodTypeAny>(request:Request,schema:T):Promise<z.infer<T>>{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new GameError('ORIGIN','Nguồn gửi yêu cầu không hợp lệ.',403);
 const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>8192)throw new GameError('TOO_LARGE','Yêu cầu quá dài.',400);
 let value:unknown;try{value=JSON.parse(raw);}catch{throw new GameError('INVALID_JSON','Dữ liệu JSON không hợp lệ.',400);}
 const result=schema.safeParse(value);if(!result.success)throw new GameError('INVALID_INPUT','Kiểm tra lại thông tin đã nhập.',400);
 return result.data;
}
export async function endpoint(fn:()=>Promise<Response>){try{return await fn();}catch(e){if(e instanceof GameError)return json({error:{code:e.code,message:e.message}},e.status);console.error('Game API failure',e instanceof Error?e.message:'unknown');return json({error:{code:'SERVER_ERROR',message:'Máy chủ chưa xử lý được yêu cầu. Hãy thử lại.'}},500);}}
