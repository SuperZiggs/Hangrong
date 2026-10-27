import {RULES} from './config';
import {inRect} from './maps';
import type {GameEvent,Order,PlayerId,Point,World} from './types';
export const near=(a:Point,b:Point,r=RULES.interactionRadius)=>Math.hypot(a.x-b.x,a.y-b.y)<=r;
export function createOrder(world:World,source:Order['source']='common',ownerId:string|null=null,pickup?:Point):Order{
 const i=world.spawnCursor++,points=world.map.pickups;
 const biased=(world.phase==='stage2'||world.phase==='stage3')&&i%3!==0;
 const take=pickup??points[biased?Math.floor(points.length/2):i%points.length];
 const deliver=ownerId?{x:Math.min(world.map.width-80,world.players[ownerId].home.x+120),y:world.players[ownerId].home.y+200}:world.map.deliveries[(i*5+3)%world.map.deliveries.length];
 const order:Order={id:`${world.runId.slice(0,8)}-o${++world.orderCounter}`,pickup:{...take},delivery:{...deliver},value:ownerId?RULES.privateValue:RULES.orderValue,ownerId:null,privateOwnerId:ownerId,lockedFee:null,settled:false,source};world.orders[order.id]=order;return order;
}
export function spawnOrders(world:World,_dtMs:number){
 const count=Object.keys(world.players).length;
 const waiting=Object.values(world.orders).filter(o=>!o.settled&&!o.ownerId&&!o.privateOwnerId&&(o.source==='common'||!o.source)).length;
 if(world.elapsedMs>=world.nextCommonSpawnAt&&waiting<count){const opening=world.orderCounter===0&&Object.keys(world.orders).length===0;for(let i=0;i<(opening?count:1);i++)createOrder(world);world.nextCommonSpawnAt=world.elapsedMs+750;}
 for(const p of Object.values(world.players)){
  if(p.privateChannel&&world.elapsedMs>=p.privateNextAt&&!Object.values(world.orders).some(o=>!o.settled&&!o.ownerId&&o.privateOwnerId===p.playerId)){
   createOrder(world,'private',p.playerId,{x:p.home.x,y:p.home.y+72});p.privateNextAt=world.elapsedMs+RULES.privateIntervalMs;
  }
 }
 for(const q of world.promotionQueue){while(q.remaining>0&&world.elapsedMs>=q.nextAt){const p=world.players[q.playerId];if(p)createOrder(world,'promotion',null,{x:p.home.x+(q.remaining-2)*36,y:p.home.y+90});q.remaining--;q.nextAt+=7000;}}
 world.promotionQueue=world.promotionQueue.filter(q=>q.remaining>0);
 const settled=Object.values(world.orders).filter(o=>o.settled);for(const o of settled.slice(0,Math.max(0,settled.length-16)))delete world.orders[o.id];
}
export function applyInteraction(world:World,playerId:PlayerId):GameEvent[]{
 const p=world.players[playerId];if(!p)return [];
 if(p.carriedOrderId){const o=world.orders[p.carriedOrderId];if(o&&!o.settled&&o.ownerId===playerId&&near(p,o.delivery)){
  o.settled=true;p.carriedOrderId=null;const fee=o.lockedFee??0;p.coins+=Math.max(0,o.value-fee);p.delivered++;if(fee>0)p.platformDeliveries=(p.platformDeliveries??0)+1;p.feesPaid+=fee;
  return [{id:`delivery:${o.id}`,kind:'delivery',playerId,privateOwnerId:o.privateOwnerId??undefined,at:world.elapsedMs,x:p.x,y:p.y,text:`+${o.value-fee} xu`}];
 }return [];}
 const target=Object.values(world.orders).filter(o=>!o.settled&&!o.ownerId&&(!o.privateOwnerId||o.privateOwnerId===playerId)&&near(p,o.pickup)).sort((a,b)=>Math.hypot(a.pickup.x-p.x,a.pickup.y-p.y)-Math.hypot(b.pickup.x-p.x,b.pickup.y-p.y))[0];
 if(target){target.ownerId=playerId;p.carriedOrderId=target.id;return [{id:`pickup:${target.id}`,kind:'pickup',playerId,privateOwnerId:target.privateOwnerId??undefined,at:world.elapsedMs,x:p.x,y:p.y}];}return [];
}
export function abandonOrder(world:World,playerId:PlayerId):GameEvent[]{const p=world.players[playerId];if(!p?.carriedOrderId||!near(p,p.home))return [];const id=p.carriedOrderId,privateOwnerId=world.orders[id]?.privateOwnerId??undefined;delete world.orders[id];p.carriedOrderId=null;p.abandonMs=0;return [{id:`abandon:${id}`,kind:'abandon',playerId,privateOwnerId,at:world.elapsedMs}];}
export function recordGateCrossings(world:World){for(const p of Object.values(world.players)){const inside=inRect(p,world.map.gate);if(inside&&!p.insideGate&&p.carriedOrderId){const o=world.orders[p.carriedOrderId];if(o&&o.lockedFee===null)o.lockedFee=world.gateFee;}p.insideGate=inside;}}
