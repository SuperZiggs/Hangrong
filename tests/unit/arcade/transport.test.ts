import {it,expect} from 'vitest';
import {createWorld} from '../../../shared/arcade/world';
import {projectSnapshot} from '../../../shared/arcade/snapshot';
import {diffSnapshot,applySnapshotPatch} from '../../../shared/arcade/transport';
it('reconstructs motion/order removal without resending static map or unchanged economy',()=>{
 const w=createWorld({seed:'transport',initialCoins:20,roster:[{playerId:'a',name:'An'}]});
 const a=projectSnapshot(w,{role:'player',playerId:'a'});const b=structuredClone(a);b.tick++;b.players.a.x+=10;delete b.orders[Object.keys(b.orders)[0]];b.elapsedMs+=50;
 const patch=diffSnapshot(a,b);expect(patch).not.toHaveProperty('map');expect(patch.players?.a).toEqual({x:b.players.a.x});
 expect(applySnapshotPatch(a,patch)).toEqual(b);expect(a.players.a.x).not.toBe(b.players.a.x);
 expect(JSON.stringify(patch).length).toBeLessThan(JSON.stringify(b).length/3);
});
it('keeps settled receipts on the server while dropping completed parcels from live snapshots',()=>{
 const w=createWorld({seed:'s',initialCoins:20,roster:[]});w.orders.done={id:'done',pickup:{x:1,y:2},delivery:{x:3,y:4},value:10,ownerId:'a',privateOwnerId:null,lockedFee:2,settled:true};expect(projectSnapshot(w,{role:'host'}).orders).not.toHaveProperty('done');expect(w.orders.done.settled).toBe(true);
});
it('retains a stable prior projection for delta encoding without cloning the immutable map',()=>{
 const w=createWorld({seed:'s',initialCoins:20,roster:[]});w.orders.o={id:'o',pickup:{x:1,y:2},delivery:{x:3,y:4},value:10,ownerId:null,privateOwnerId:null,lockedFee:null,settled:false};const a=projectSnapshot(w,{role:'host'});w.orders.o.ownerId='new';w.sharedRoute.contributed=5;
 expect(a.orders.o.ownerId).toBeNull();expect(a.sharedRoute.contributed).toBe(0);expect(projectSnapshot(w,{role:'host'}).map).toBe(a.map);
});
it('rejects patches from another run or an out-of-order tick',()=>{
 const a=projectSnapshot(createWorld({seed:'s',initialCoins:20,roster:[]}),{role:'host'});
 expect(applySnapshotPatch(a,{runId:'old',tick:a.tick+1})).toBe(a);expect(applySnapshotPatch(a,{runId:a.runId,tick:a.tick-1})).toBe(a);
});
