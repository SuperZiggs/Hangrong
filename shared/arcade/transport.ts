import type {PublicSnapshot,Player,Order} from './types';
export type SnapshotPatch={runId:string;tick:number;players?:Record<string,Partial<Player&{hasOrder:boolean}>|null>;orders?:Record<string,Partial<Order>|null>}&Partial<Omit<PublicSnapshot,'players'|'orders'>>;
const equal=(a:unknown,b:unknown)=>a===b||(typeof a==='object'&&typeof b==='object'&&JSON.stringify(a)===JSON.stringify(b));
export function recordChanges<T extends object>(before:Record<string,T>,after:Record<string,T>){
 const out:Record<string,Partial<T>|null>={};
 for(const id of Object.keys(before))if(!(id in after))out[id]=null;
 for(const [id,next] of Object.entries(after)){
  if(!before[id]){out[id]=next;continue;}
  const fields:Partial<T>={};for(const key of Object.keys(next) as (keyof T)[])if(!equal(before[id][key],next[key]))fields[key]=next[key];
  if(Object.keys(fields).length)out[id]=fields;
 }return out;
}
export function diffSnapshot(before:PublicSnapshot,after:PublicSnapshot):SnapshotPatch{
 const patch:SnapshotPatch={runId:after.runId,tick:after.tick};
 for(const key of Object.keys(after) as (keyof PublicSnapshot)[]){if(['players','orders','tick','runId'].includes(key))continue;if(!equal(before[key],after[key]))Object.assign(patch,{[key]:after[key]});}
 const players=recordChanges(before.players,after.players),orders=recordChanges(before.orders,after.orders);
 if(Object.keys(players).length)patch.players=players;if(Object.keys(orders).length)patch.orders=orders;return patch;
}
function merge<T extends object>(base:Record<string,T>,delta:Record<string,Partial<T>|null>|undefined){
 if(!delta)return base;const out={...base};for(const [id,fields] of Object.entries(delta)){if(fields===null)delete out[id];else out[id]={...out[id],...fields};}return out;
}
export function applySnapshotPatch(base:PublicSnapshot,patch:SnapshotPatch):PublicSnapshot{
 if(patch.runId!==base.runId||patch.tick<base.tick)return base;
 return {...base,...patch,players:merge(base.players,patch.players),orders:merge(base.orders,patch.orders)};
}
