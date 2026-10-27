import {generateMap} from './maps';
import {advanceMotion} from './motion';
import {announcements,phaseAt} from './clock';
import {abandonOrder,applyInteraction,near,recordGateCrossings,spawnOrders} from './orders';
import {buyUpgrade,contributeSharedRoute} from './economy';
import type {InputFrame,MatchOptions,Player,PlayerId,StepResult,World} from './types';
export function createWorld(options:MatchOptions):World{
 const map=generateMap(options.roster.length,options.seed),players:Record<string,Player>={};
 options.roster.forEach((entry,i)=>{const home=map.shops[i],point=map.spawns[i];players[entry.playerId]={...entry,...point,home:{...home},coins:options.initialCoins,carriedOrderId:null,dashRemainingMs:0,dashCooldownMs:0,pushProtectionMs:0,connected:true,direction:'S',dashX:0,dashY:1,lastActionSeq:-1,lastDashSeq:-1,abandonMs:0,privateChannel:false,privateNextAt:0,promotionCooldownMs:0,delivered:0,feesPaid:0,contributed:0,moving:false,insideGate:false,lastInputSeq:0};});
 for(const station of map.stations)if(station.ownerIndex!==undefined)station.ownerId=options.roster[station.ownerIndex]?.playerId;
 return {runId:crypto.randomUUID(),seed:options.seed,tick:0,elapsedMs:0,phase:'practice',paused:false,players,orders:{},map,sharedRoute:{cost:12*options.roster.length,contributed:0,open:false},gateFee:2,orderCounter:0,spawnCursor:0,nextCommonSpawnAt:0,promotionQueue:[],events:[],announced:[],initialCoins:options.initialCoins};
}
export function stepWorld(world:World,inputs:ReadonlyMap<PlayerId,InputFrame>,dtMs:number):StepResult{
 if(world.paused)return {events:[],phaseChanged:false};
 if(['lobby','interrupted'].includes(world.phase))return {events:[],phaseChanged:false};
 const before=world.phase,elapsed=Math.min(600000,world.elapsedMs+Math.max(0,dtMs));world.elapsedMs=elapsed;world.tick++;world.phase=phaseAt(elapsed);
 if(before==='practice'&&elapsed>=60000){
  const fresh=createWorld({seed:world.seed,initialCoins:world.initialCoins,roster:Object.values(world.players).map(p=>({playerId:p.playerId,name:p.name}))});
  for(const [id,p]of Object.entries(fresh.players)){p.connected=world.players[id].connected;p.lastInputSeq=world.players[id].lastInputSeq;p.lastActionSeq=world.players[id].lastActionSeq;p.lastDashSeq=world.players[id].lastDashSeq;}
  Object.assign(world,{...fresh,runId:world.runId,tick:world.tick,elapsedMs:elapsed,phase:'stage1'});
 }
 if(before!==world.phase&&world.phase==='stage3')world.gateFee=4;
 if(world.phase==='results'){for(const p of Object.values(world.players))p.moving=false;return {events:[],phaseChanged:before!==world.phase};}
 const events=[...announcements(world),...advanceMotion(world,inputs,dtMs)];recordGateCrossings(world);
 for(const p of Object.values(world.players)){
  p.promotionCooldownMs=Math.max(0,p.promotionCooldownMs-dtMs);const f=inputs.get(p.playerId);if(!f||f.runId!==world.runId||!p.connected){p.abandonMs=0;continue;}
  if(f.abandonHeld&&p.carriedOrderId&&near(p,p.home)){p.abandonMs+=dtMs;if(p.abandonMs>=1000)events.push(...abandonOrder(world,p.playerId));p.lastActionSeq=f.seq;continue;}p.abandonMs=0;
  if(f.interactPressed&&f.seq>p.lastActionSeq){p.lastActionSeq=f.seq;const action=applyInteraction(world,p.playerId);events.push(...action);
   if(action.length===0&&!p.carriedOrderId){const station=world.map.stations.find(s=>(!s.ownerId||s.ownerId===p.playerId)&&near(p,s));if(station)events.push(...(station.kind==='contribution'?contributeSharedRoute(world,p.playerId):buyUpgrade(world,p.playerId,station.kind)));}
  }
 }
 spawnOrders(world,dtMs);world.events=[...world.events,...events].slice(-32);return {events,phaseChanged:before!==world.phase};
}
