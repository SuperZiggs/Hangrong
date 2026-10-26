export class ApiError extends Error {constructor(message:string,public status:number,public code:string){super(message);}}
export async function gameApi<T>(path:string,token?:string|null,data?:unknown):Promise<T>{
 const response=await fetch(path,{method:data===undefined?'GET':'POST',cache:'no-store',signal:AbortSignal.timeout(12000),headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});
 const value=await response.json().catch(()=>({error:{message:'Máy chủ chưa trả lời được. Hãy thử lại.',code:'BAD_RESPONSE'}}));
 if(!response.ok){const error=(value&&typeof value==='object'&&'error' in value?value.error:null) as {message?:string;code?:string}|null;throw new ApiError(error?.message??'Chưa xử lý được yêu cầu.',response.status,error?.code??'UNKNOWN');}
 return value as T;
}
export function capability(){const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
export function requestId(){return crypto.randomUUID();}
