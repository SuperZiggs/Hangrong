import {RULES} from './config';
import {activateCentralCustomers,inRect} from './maps';
import {carriedOrders,nextPickup,setCargo} from './cargo';
import type {GameEvent,Order,PlayerId,Point,World} from './types';
export const near=(a:Point,b:Point,r=RULES.interactionRadius)=>Math.hypot(a.x-b.x,a.y-b.y)<=r;
export function createOrder(world:World,source:Order['source']='common',ownerId:string|null=null,pickup?:Point):Order{
 const i=world.spawnCursor++,points=world.map.pickups;
 const take=pickup??points[i%points.length];
 let deliver:Point;
 if(ownerId)deliver={x:Math.min(world.map.width-80,world.players[ownerId].home.x+120),y:world.players[ownerId].home.y+200};
 else if(world.elapsedMs>=RULES.stage2Ms){
  activateCentralCustomers(world);
  const cursor=world.publicDeliveryCounter??0;world.publicDeliveryCounter=cursor+1;
  if(Math.floor((cursor+1)*17/20)>Math.floor(cursor*17/20)){
   const central=world.map.centralDeliveries!,index=world.centralDeliveryCounter??0;
   deliver=central[index%central.length];world.centralDeliveryCounter=index+1;
  }else{
   const index=world.outerDeliveryCounter??0,side=index%2;
   const outer=world.map.deliveries.filter(p=>side?p.x>=world.map.width*.7:p.x<=world.map.width*.3);
   deliver=outer[Math.floor(index/2)%outer.length];world.outerDeliveryCounter=index+1;
  }
 }else deliver=world.map.deliveries[(i*5+3)%world.map.deliveries.length];
 const order:Order={id:`${world.runId.slice(0,8)}-o${++world.orderCounter}`,pickup:{...take},delivery:{...deliver},value:ownerId?RULES.privateValue:RULES.orderValue,ownerId:null,privateOwnerId:ownerId,lockedFee:null,settled:false,source};world.orders[order.id]=order;return order;
}
export function spawnOrders(world:World,_dtMs:number){
 if(world.paused||['lobby','results','interrupted'].includes(world.phase))return;
 const slots=world.commonSlots??=world.map.pickups.map(()=>({orderId:null,nextAt:0}));
 slots.forEach((slot,index)=>{
  if(slot.orderId||world.elapsedMs<slot.nextAt)return;
  const order=createOrder(world,'common',null,world.map.pickups[index]);order.pickupIndex=index;slot.orderId=order.id;slot.nextAt=0;
 });
 for(const p of Object.values(world.players)){
  const stock=Object.values(world.orders).filter(o=>!o.settled&&!o.ownerId&&o.privateOwnerId===p.playerId).length;
  if(p.privateChannel&&world.elapsedMs>=p.privateNextAt&&stock<RULES.privateStockLimit){
   createOrder(world,'private',p.playerId,{x:p.home.x,y:p.home.y+72});p.privateNextAt=world.elapsedMs+RULES.privateIntervalMs;
  }
 }
 for(const q of world.promotionQueue){while(q.remaining>0&&world.elapsedMs>=q.nextAt){const p=world.players[q.playerId];if(p)createOrder(world,'promotion',null,{x:p.home.x+(q.remaining-2)*36,y:p.home.y+90});q.remaining--;q.nextAt+=7000;}}
 world.promotionQueue=world.promotionQueue.filter(q=>q.remaining>0);
 const settled=Object.values(world.orders).filter(o=>o.settled);for(const o of settled.slice(0,Math.max(0,settled.length-16)))delete world.orders[o.id];
}
export function applyInteraction(world:World,playerId:PlayerId):GameEvent[]{
 const p=world.players[playerId];if(!p)return [];
 const cargo=carriedOrders(p,world.orders),o=cargo.find(order=>near(p,order.delivery));
 if(o){
  o.settled=true;setCargo(p,cargo.filter(order=>order.id!==o.id));const fee=o.lockedFee??0;p.coins+=Math.max(0,o.value-fee);p.delivered++;if(fee>0)p.platformDeliveries=(p.platformDeliveries??0)+1;p.feesPaid+=fee;
  return [{id:`delivery:${o.id}`,kind:'delivery',playerId,privateOwnerId:o.privateOwnerId??undefined,at:world.elapsedMs,x:p.x,y:p.y,text:`+${o.value-fee} xu`}];
 }
 const target=nextPickup(p,world.orders);
 if(target){
  target.ownerId=playerId;setCargo(p,[...cargo,target]);
  if(target.pickupIndex!==undefined){const slot=world.commonSlots?.[target.pickupIndex];if(slot?.orderId===target.id){slot.orderId=null;slot.nextAt=world.elapsedMs+RULES.publicRefillMs;}}
  return [{id:`pickup:${target.id}`,kind:'pickup',playerId,privateOwnerId:target.privateOwnerId??undefined,at:world.elapsedMs,x:p.x,y:p.y}];
 }return [];
}
export function abandonOrder(world:World,playerId:PlayerId):GameEvent[]{
 const p=world.players[playerId];if(!p||!near(p,p.home))return [];
 const cargo=carriedOrders(p,world.orders);setCargo(p,[]);p.abandonMs=0;
 return cargo.map(o=>{delete world.orders[o.id];return {id:`abandon:${o.id}`,kind:'abandon',playerId,privateOwnerId:o.privateOwnerId??undefined,at:world.elapsedMs};});
}
export function recordGateCrossings(world:World){for(const p of Object.values(world.players)){const inside=inRect(p,world.map.gate);if(inside&&!p.insideGate)for(const o of carriedOrders(p,world.orders))if(o.lockedFee===null)o.lockedFee=world.gateFee;p.insideGate=inside;}}
