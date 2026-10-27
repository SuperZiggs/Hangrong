import {projectSnapshot,eventsFor,privateEventOwner} from './snapshot';
import {diffSnapshot,recordChanges} from './transport';
import {carriedOrders} from './cargo';
import type {Actor,World,PublicSnapshot,Order,GameEvent} from './types';
export const actorKey=(actor:Actor)=>`${actor.role}:${actor.playerId??''}`;
type PrivatePart={orders:Record<string,Order>;players:Record<string,{carriedOrderId:string|null;carriedOrderIds:string[]}>;events:GameEvent[]};
/** Encode the common view once, then attach only each recipient's private view. */
export class SnapshotStream{
 private previous:PublicSnapshot|null=null;private privateViews=new Map<string,PrivatePart>();
 frames(world:World,actors:readonly Actor[],extra:Record<string,number>={}){
  const current={...projectSnapshot(world,{role:'public'}),...extra},before=this.previous;
  const full=!before||before.runId!==current.runId||before.phase!==current.phase||before.paused!==current.paused||current.tick%20===0;
  if(before?.runId!==current.runId)this.privateViews.clear();
  const commonPatch=full?null:diffSnapshot(before!,current),common=JSON.stringify(full?{type:'snapshot',snapshot:current}:{type:'patch',patch:commonPatch});
  const allPrivate=Object.values(world.orders).filter(o=>!!o.privateOwnerId&&!o.settled),hasPrivateEvents=world.events.some(e=>!!privateEventOwner(world,e)),frames=new Map<string,string>();
  for(const actor of actors){const key=actorKey(actor);if(frames.has(key))continue;
   const orders=Object.fromEntries(allPrivate.filter(o=>actor.role==='host'||actor.role==='player'&&o.privateOwnerId===actor.playerId).map(o=>[o.id,{...o}]));
   const prev=this.privateViews.get(key),actorEvents=hasPrivateEvents&&actor.role!=='public'?eventsFor(world,actor):current.events;const players:PrivatePart['players']={};
   if(actor.role!=='public'&&(Object.keys(orders).length||prev||actorEvents.length!==current.events.length)){
    for(const p of Object.values(world.players))if(actor.role==='host'||p.playerId===actor.playerId){const ids=carriedOrders(p,world.orders).map(o=>o.id);players[p.playerId]={carriedOrderId:ids[0]??null,carriedOrderIds:ids};}
   }
   if(!Object.keys(orders).length&&!Object.keys(players).length){frames.set(key,common);continue;}
   if(full){const ownPlayers=Object.fromEntries(Object.entries(players).map(([id,p])=>[id,{...current.players[id],...p}]));frames.set(key,JSON.stringify({type:'snapshot',snapshot:{...current,orders:{...current.orders,...orders},players:{...current.players,...ownPlayers},events:actorEvents}}));}
   else{const playerPatch={...commonPatch!.players};for(const [id,fields]of Object.entries(recordChanges(prev?.players??{},players)))if(fields)playerPatch[id]={...playerPatch[id],...fields};const changedEvents=!prev||JSON.stringify(prev.events)!==JSON.stringify(actorEvents);frames.set(key,JSON.stringify({type:'patch',patch:{...commonPatch,orders:{...commonPatch!.orders,...recordChanges(prev?.orders??{},orders)},players:playerPatch,...(changedEvents?{events:actorEvents}:{})}}));}
   this.privateViews.set(key,{orders,players,events:actorEvents});
  }
  this.previous=current;return frames;
 }
}
