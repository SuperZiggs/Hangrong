import type {Actor,GameEvent,PublicSnapshot,World} from './types';
export function privateEventOwner(world:World,event:GameEvent){return event.privateOwnerId??(['pickup','delivery','abandon'].includes(event.kind)?world.orders[event.id.slice(event.kind.length+1)]?.privateOwnerId:null);}
export function eventsFor(world:World,actor:Actor){return world.events.filter(event=>{const owner=privateEventOwner(world,event);return !owner||actor.role==='host'||actor.playerId===owner;});}
export function projectSnapshot(world:World,actor:Actor):PublicSnapshot{
 const ordered=Object.values(world.players).map(p=>({playerId:p.playerId,name:p.name,coins:p.coins,delivered:p.delivered,platformDeliveries:p.platformDeliveries??0,feesPaid:p.feesPaid,contributed:p.contributed,privateChannel:p.privateChannel})).sort((a,b)=>b.coins-a.coins||a.playerId.localeCompare(b.playerId));
 const leaderboard=ordered.map((p,i)=>({...p,rank:ordered.findIndex(q=>q.coins===p.coins)+1}));
 const orders=Object.fromEntries(Object.entries(world.orders).filter(([,o])=>!o.settled&&(!o.privateOwnerId||actor.role==='host'||o.privateOwnerId===actor.playerId)).map(([id,o])=>[id,{...o}]));
 const players=Object.fromEntries(Object.entries(world.players).map(([id,p])=>{const secret=p.carriedOrderId&&world.orders[p.carriedOrderId]?.privateOwnerId&&actor.role!=='host'&&actor.playerId!==id;return [id,{...p,platformDeliveries:p.platformDeliveries??0,hasOrder:!!p.carriedOrderId,carriedOrderId:secret?null:p.carriedOrderId}];}));
 return {runId:world.runId,tick:world.tick,elapsedMs:world.elapsedMs,phase:world.phase,paused:world.paused,players,orders,map:world.map,gateFee:world.gateFee,sharedRoute:{...world.sharedRoute},lastInputSeq:Object.fromEntries(Object.values(world.players).map(p=>[p.playerId,p.lastInputSeq])),leaderboard,events:eventsFor(world,actor)};
}
