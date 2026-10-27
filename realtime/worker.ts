import {ArcadeRoom,type RealtimeEnv} from './room';
import {ArcadeError,codeFor,errorResponse,json,readBody,validRequest,validToken} from './auth';
export {ArcadeRoom};
export default {async fetch(request:Request,env:RealtimeEnv):Promise<Response>{try{
 const url=new URL(request.url);
 if(url.pathname==='/health')return json({ok:true,game:'cuoc-dua-gianh-khach'});
 if(url.pathname==='/rooms'&&request.method==='POST'){
  const b=await readBody(request);if(!validRequest(b.requestId)||!validToken(b.hostToken))throw new ArcadeError('INVALID_INPUT','Kiểm tra thông tin tạo phòng.');
  for(let attempt=0;attempt<5;attempt++){const code=await codeFor(b.requestId,attempt),stub=env.ARCADE_ROOMS.get(env.ARCADE_ROOMS.idFromName(`arcade:${code}`));
   const result=await stub.fetch(new Request(new URL(`/rooms/${code}/create`,url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}));
   if(result.headers.get('X-Arcade-Collision')==='1')continue;return result;
  }throw new ArcadeError('CREATE_BUSY','Chưa tạo được mã phòng. Hãy thử lại.',503);
 }
 const match=url.pathname.match(/^\/rooms\/([A-Z2-7]{8})\/(\w+)$/);if(!match)throw new ArcadeError('NOT_FOUND','Không tìm thấy thao tác.',404);
 // Buffer the bounded body before crossing the actor boundary. An actor may
 // reject authorization without consuming it; forwarding the upstream stream
 // would then race response completion in workerd.
 let forwarded=request;
 if(!['GET','HEAD'].includes(request.method)){
  const text=await request.text();if(new TextEncoder().encode(text).byteLength>8192)throw new ArcadeError('TOO_LARGE','Dữ liệu quá dài.');
  forwarded=new Request(request.url,{method:request.method,headers:request.headers,body:text});
 }
 return await env.ARCADE_ROOMS.get(env.ARCADE_ROOMS.idFromName(`arcade:${match[1]}`)).fetch(forwarded);
 }catch(e){return errorResponse(e);}}};
