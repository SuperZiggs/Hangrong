import {it,expect} from 'vitest';
import {createWorld} from '../../../shared/arcade/world';
import {projectSnapshot} from '../../../shared/arcade/snapshot';
import {predictMotion} from '../../../game/arcade/prediction';
it('predicts a short motion locally while preserving authoritative coins and walls',()=>{
 const w=createWorld({seed:'prediction',initialCoins:20,roster:[{playerId:'a',name:'An'}]});const s=projectSnapshot(w,{role:'player',playerId:'a'}),x=s.players.a.x;
 const p=predictMotion(s,'a',[{input:{runId:s.runId,seq:1,moveX:1,moveY:0,dashPressed:false,interactPressed:false,abandonHeld:false},dtMs:50}]);
 expect(p!.x).toBeCloseTo(x+12);expect(s.players.a.x).toBe(x);expect(p!.coins).toBe(20);
 const edge=structuredClone(s);edge.players.a.x=edge.map.width-14;expect(predictMotion(edge,'a',[{input:{runId:s.runId,seq:1,moveX:1,moveY:0,dashPressed:false,interactPressed:false,abandonHeld:false},dtMs:50}])!.x).toBe(edge.map.width-14);
});
