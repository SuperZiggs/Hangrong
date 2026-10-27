import {env} from 'cloudflare:workers';
export async function proxyArcade(request:Request,suffix=''){
 const incoming=new URL(request.url),configured=(env as unknown as Record<string,string>).ARCADE_SERVICE_URL;
 const service=configured??(['127.0.0.1','localhost'].includes(incoming.hostname)?'http://127.0.0.1:5191':null);
 if(!service)return Response.json({error:{code:'REALTIME_UNAVAILABLE',message:'Dịch vụ game chưa được cấu hình.'}},{status:503});
 const origin=request.headers.get('origin');if(origin&&origin!==incoming.origin)return Response.json({error:{code:'ORIGIN',message:'Nguồn gửi không hợp lệ.'}},{status:403});
 const headers=new Headers({'Content-Type':'application/json'});const auth=request.headers.get('authorization');if(auth)headers.set('Authorization',auth);
 try{const text=request.method==='GET'?undefined:await request.text();if(text&&new TextEncoder().encode(text).length>8192)return Response.json({error:{code:'TOO_LARGE',message:'Dữ liệu quá dài.'}},{status:400});
  const response=await fetch(`${service.replace(/\/$/,'')}/rooms${suffix}`,{method:request.method,headers,body:text});
  const result=new Response(response.body,{status:response.status,headers:response.headers});result.headers.set('Cache-Control','no-store');return result;
 }catch{return Response.json({error:{code:'REALTIME_OFFLINE',message:'Chưa kết nối được máy chủ game. MC kiểm tra dịch vụ realtime.'}},{status:503});}
}
