import {it,expect} from 'vitest';import {createWorld} from '../../../shared/arcade/world';import {applyInteraction} from '../../../shared/arcade/orders';import {projectSnapshot} from '../../../shared/arcade/snapshot';
it('counts actual settled P deliveries once, separately from uncharged deliveries',()=>{
 const w=createWorld({seed:'market',initialCoins:20,roster:[{playerId:'a',name:'An'}]}),p=w.players.a;p.x=300;p.y=300;
 for(const [i,fee]of [2,0].entries()){const id=`order${i}`;w.orders[id]={id,pickup:{x:300,y:300},delivery:{x:300,y:300},value:10,ownerId:'a',privateOwnerId:null,lockedFee:fee,settled:false};p.carriedOrderId=id;applyInteraction(w,'a');applyInteraction(w,'a');}
 const row=projectSnapshot(w,{role:'public'}).leaderboard[0];expect(row.delivered).toBe(2);expect(row.platformDeliveries).toBe(1);expect(row.feesPaid).toBe(2);
});
