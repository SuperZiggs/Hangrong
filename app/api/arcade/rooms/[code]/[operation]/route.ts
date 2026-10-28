import {proxyArcade} from '../../../../../../server/arcade/proxy';
import {discardRejectedBody} from '../../../../../../worker/gateway';
type Context={params:Promise<{code:string;operation:string}>};
async function route(request:Request,context:Context){const {code,operation}=await context.params;if(!/^[A-Z2-7]{8}$/.test(code)||!['join','bootstrap','host','recover','export'].includes(operation)){await discardRejectedBody(request);return Response.json({error:{code:'NOT_FOUND',message:'Không tìm thấy thao tác.'}},{status:404,headers:{'Cache-Control':'no-store'}});}return proxyArcade(request,`/${code}/${operation}`);}
export const POST=route;export const GET=route;
