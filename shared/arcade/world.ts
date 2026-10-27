import {generateMap} from './maps';
import {advanceMotion} from './motion';
import type {InputFrame,MatchOptions,Player,PlayerId,StepResult,World} from './types';
export function createWorld(options:MatchOptions):World{
 const map=generateMap(options.roster.length,options.seed),players:Record<string,Player>={};
 options.roster.forEach((entry,i)=>{const home=map.shops[i],point=map.spawns[i];players[entry.playerId]={...entry,...point,home:{...home},coins:options.initialCoins,carriedOrderId:null,dashRemainingMs:0,dashCooldownMs:0,pushProtectionMs:0,connected:true,direction:'S',dashX:0,dashY:1,lastActionSeq:-1,lastDashSeq:-1,abandonMs:0,privateChannel:false,privateNextAt:0,promotionCooldownMs:0,delivered:0,feesPaid:0,contributed:0,moving:false,insideGate:false,lastInputSeq:0};});
 for(const station of map.stations)if(station.ownerIndex!==undefined)station.ownerId=options.roster[station.ownerIndex]?.playerId;
 return {runId:crypto.randomUUID(),seed:options.seed,tick:0,elapsedMs:0,phase:'practice',paused:false,players,orders:{},map,sharedRoute:{cost:12*options.roster.length,contributed:0,open:false},gateFee:2,orderCounter:0,spawnCursor:0,nextCommonSpawnAt:0,promotionQueue:[],events:[],announced:[],initialCoins:options.initialCoins};
}
export function stepWorld(world:World,inputs:ReadonlyMap<PlayerId,InputFrame>,dtMs:number):StepResult{
 if(world.paused)return {events:[],phaseChanged:false};
 world.elapsedMs+=dtMs;world.tick++;const events=advanceMotion(world,inputs,dtMs);world.events=[...world.events,...events].slice(-32);return {events,phaseChanged:false};
}
