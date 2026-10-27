import {describe,expect,it} from 'vitest';
import * as worldApi from '../../../shared/arcade/world';
import type {World} from '../../../shared/arcade/types';

function world(){return worldApi.createWorld({seed:'v2-recovery',initialCoins:20,roster:[{playerId:'a',name:'An'},{playerId:'b',name:'Bình'},{playerId:'c',name:'Chi'}]});}
function restore(w:World){
 const fn=(worldApi as unknown as {restoreWorldForCurrentRules?:(w:World)=>boolean}).restoreWorldForCurrentRules;
 expect(fn,'Persisted old runs must be recognized before applying changed inventory rules').toBeTypeOf('function');
 return fn!(w);
}
function legacy(w:World){delete (w as unknown as {rulesVersion?:number}).rulesVersion;return w;}

describe('order flow v2 persisted-room safety',()=>{
 for(const paused of [false,true])it(`preserves old ${paused?'paused':'active'} game progress and interrupts for explicit replay`,()=>{
  const w=legacy(world());w.phase='stage2';w.elapsedMs=230000;w.paused=paused;w.players.a.coins=57;w.players.a.delivered=9;
  w.orders.receipt={id:'receipt',pickup:{x:300,y:300},delivery:{x:900,y:900},value:8,ownerId:'a',privateOwnerId:'a',lockedFee:2,settled:false};w.players.a.carriedOrderId='receipt';
  const before=structuredClone({runId:w.runId,players:w.players,orders:w.orders,elapsedMs:w.elapsedMs,sharedRoute:w.sharedRoute});
  expect(restore(w)).toBe(true);expect(w.phase).toBe('interrupted');expect(w.paused).toBe(false);
  expect({runId:w.runId,players:w.players,orders:w.orders,elapsedMs:w.elapsedMs,sharedRoute:w.sharedRoute}).toEqual(before);
  expect(w.events.some(e=>/luật|phiên bản/i.test(e.text??''))).toBe(true);expect(restore(w)).toBe(false);
 });
 it('keeps old results and lobby readable until a fresh start',()=>{
  for(const phase of ['results','lobby'] as const){const w=legacy(world());w.phase=phase;const before=structuredClone(w);expect(restore(w)).toBe(false);expect(w).toEqual(before);}
 });
 it('recognizes a new v2 run without changing it',()=>{
  const w=world();w.phase='stage1';expect((w as unknown as {rulesVersion:number}).rulesVersion).toBe(2);const before=structuredClone(w);expect(restore(w)).toBe(false);expect(w).toEqual(before);
 });
});
