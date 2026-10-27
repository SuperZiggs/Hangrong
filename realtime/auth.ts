export class ArcadeError extends Error{constructor(public code:string,message:string,public status=400){super(message);}}
export async function hash(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');}
export const validToken=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v);
export const validRequest=(v:unknown):v is string=>typeof v==='string'&&v.length>=8&&v.length<=128;
export function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export function errorResponse(e:unknown){return e instanceof ArcadeError?json({error:{code:e.code,message:e.message}},e.status):json({error:{code:'SERVER_ERROR',message:'Máy chủ chưa xử lý được thao tác.'}},500);}
export async function readBody(request:Request){const text=await request.text();if(new TextEncoder().encode(text).byteLength>8192)throw new ArcadeError('TOO_LARGE','Dữ liệu quá dài.');try{const b=JSON.parse(text);if(!b||typeof b!=='object'||Array.isArray(b))throw 0;return b as Record<string,unknown>;}catch{throw new ArcadeError('INVALID_JSON','Dữ liệu không hợp lệ.');}}
export async function codeFor(requestId:string,attempt:number){const digest=await hash(`${requestId}:${attempt}`),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let result='';for(let i=0;i<8;i++)result+=alphabet[parseInt(digest.slice(i*2,i*2+2),16)%32];return result;}
