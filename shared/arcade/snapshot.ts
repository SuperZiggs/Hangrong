import type {Actor,PublicSnapshot,World} from './types';
export function projectSnapshot(world:World,actor:Actor):PublicSnapshot{
 const ordered=Object.values(world.players).map(p=>({playerId:p.playerId,name:p.name,coins:p.coins,delivered:p.delivered,feesPaid:p.feesPaid,contributed:p.contributed,privateChannel:p.privateChannel})).sort((a,b)=>b.coins-a.coins||a.playerId.localeCompare(b.playerId));
 const leaderboard=ordered.map((p,i)=>({...p,rank:ordered.findIndex(q=>q.coins===p.coins)+1}));
 const orders=Object.fromEntries(Object.entries(world.orders).filter(([,o])=>!o.privateOwnerId||actor.role==='host'||o.privateOwnerId===actor.playerId));
 const players=Object.fromEntries(Object.entries(world.players).map(([id,p])=>{const secret=p.carriedOrderId&&world.orders[p.carriedOrderId]?.privateOwnerId&&actor.role!=='host'&&actor.playerId!==id;return [id,{...p,hasOrder:!!p.carriedOrderId,carriedOrderId:secret?null:p.carriedOrderId}];}));
 return {runId:world.runId,tick:world.tick,elapsedMs:world.elapsedMs,phase:world.phase,paused:world.paused,players,orders,map:world.map,gateFee:world.gateFee,sharedRoute:world.sharedRoute,lastInputSeq:Object.fromEntries(Object.values(world.players).map(p=>[p.playerId,p.lastInputSeq])),leaderboard,events:world.events};
}
