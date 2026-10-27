import {it,expect} from 'vitest';import {createWorld} from '../../../shared/arcade/world';import {isFree} from '../../../shared/arcade/motion';
it('storefronts are solid and every spawn/upgrade/parcel point stays reachable on foot at26 players',()=>{
 const w=createWorld({seed:'city',initialCoins:20,roster:Array.from({length:26},(_,i)=>({playerId:String(i),name:`Người ${i}`}))});
 for(const shop of w.map.shops)expect(isFree(w,{x:shop.x,y:shop.y-25})).toBe(false);
 for(const p of [...w.map.spawns,...w.map.stations,...w.map.pickups,...w.map.deliveries])expect(isFree(w,p),JSON.stringify(p)).toBe(true);
});
