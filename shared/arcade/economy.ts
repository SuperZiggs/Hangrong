import {RULES} from './config';
import type {GameEvent,PlayerId,World} from './types';
export function buyUpgrade(world:World,playerId:PlayerId,kind:'promotion'|'private-channel'):GameEvent[]{const p=world.players[playerId];if(!p)return [];
 if(kind==='promotion'){if(p.coins<RULES.promotionCost||p.promotionCooldownMs>0)return [];p.coins-=RULES.promotionCost;p.promotionCooldownMs=RULES.promotionCooldownMs;world.promotionQueue.push({playerId,nextAt:world.elapsedMs,remaining:3});}
 else{if(p.privateChannel||p.coins<RULES.privateCost)return [];p.coins-=RULES.privateCost;p.privateChannel=true;p.privateNextAt=world.elapsedMs+RULES.privateIntervalMs;}
 return [{id:`upgrade:${world.tick}:${playerId}`,kind:kind==='promotion'?'promotion':'private-channel',playerId,at:world.elapsedMs,x:p.x,y:p.y,text:kind==='promotion'?'Khuyến mãi đã mở!':'Kênh riêng đã mở!'}];
}
export function contributeSharedRoute(world:World,playerId:PlayerId):GameEvent[]{const p=world.players[playerId],route=world.sharedRoute;if(!p||route.open)return [];const amount=Math.min(5,route.cost-route.contributed);if(p.coins<amount)return [];p.coins-=amount;p.contributed+=amount;route.contributed+=amount;if(route.contributed>=route.cost)route.open=true;
 return [{id:`contribute:${world.tick}:${playerId}`,kind:route.open?'route-unlock':'contribute',playerId,at:world.elapsedMs,x:p.x,y:p.y,text:route.open?'Lối chung đã mở!':`Góp ${amount} xu`}];
}
