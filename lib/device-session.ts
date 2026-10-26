type DeviceSession={token:string;requestId:string};
const key=(role:string,code:string)=>`qls:${role}:${code}`;
export function readSession(role:string,code:string):DeviceSession|null{try{const value=localStorage.getItem(key(role,code));if(!value)return null;const p=JSON.parse(value);return typeof p.token==='string'&&typeof p.requestId==='string'?p:null;}catch{return null;}}
export function storeSession(role:string,code:string,value:DeviceSession){localStorage.setItem(key(role,code),JSON.stringify(value));}
export function clearSession(role:string,code:string){localStorage.removeItem(key(role,code));}
