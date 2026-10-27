import {RULES} from './config';
import type {Order,Player} from './types';

/** Ownership is authoritative; the primary ID remains compatible with v1 clients. */
export function carriedOrders(player:Player,orders:Record<string,Order>):Order[]{
 const ids=[player.carriedOrderId,...(player.carriedOrderIds??[])];
 const rank=(id:string)=>{const index=ids.indexOf(id);return index<0?Number.MAX_SAFE_INTEGER:index;};
 return Object.values(orders).filter(o=>o.ownerId===player.playerId&&!o.settled).sort((a,b)=>rank(a.id)-rank(b.id));
}
export function setCargo(player:Player,orders:readonly Order[]){player.carriedOrderIds=orders.map(o=>o.id);player.carriedOrderId=player.carriedOrderIds[0]??null;}
export function canTakeOrder(player:Player,orders:Record<string,Order>,order:Order,cargo=carriedOrders(player,orders)){
 if(order.ownerId||order.settled||order.privateOwnerId&&order.privateOwnerId!==player.playerId)return false;
 return cargo.length===0||cargo.length<RULES.privateCarryLimit&&order.privateOwnerId===player.playerId&&cargo.every(o=>o.privateOwnerId===player.playerId);
}
export function nextPickup(player:Player,orders:Record<string,Order>){
 const cargo=carriedOrders(player,orders);
 return Object.values(orders).filter(o=>canTakeOrder(player,orders,o,cargo)&&Math.hypot(o.pickup.x-player.x,o.pickup.y-player.y)<=RULES.interactionRadius).sort((a,b)=>Math.hypot(a.pickup.x-player.x,a.pickup.y-player.y)-Math.hypot(b.pickup.x-player.x,b.pickup.y-player.y))[0];
}
