import {describe,expect,it} from 'vitest';
import {InputState} from '../../../game/arcade/input';
import {createWorld,stepWorld} from '../../../shared/arcade/world';
import {spawnOrders} from '../../../shared/arcade/orders';
import {buyUpgrade} from '../../../shared/arcade/economy';
import {carriedOrders} from '../../../shared/arcade/cargo';

function setup(){
 const world=createWorld({seed:'private-keyboard-overlap',initialCoins:100,roster:['a','b','c'].map(playerId=>({playerId,name:playerId}))});
 world.phase='stage1';world.elapsedMs=60001;spawnOrders(world,0);buyUpgrade(world,'a','private-channel');
 world.elapsedMs+=20000;spawnOrders(world,0);world.elapsedMs+=20000;spawnOrders(world,0);
 const player=world.players.a;player.x=player.home.x;player.y=player.home.y+35;
 const input=new InputState();let seq=0;
 const tick=()=>stepWorld(world,new Map([['a',input.frame(world.runId,++seq)]]),50);
 const tap=()=>{input.down('KeyE');tick();input.up('KeyE');tick();};
 return{world,player,input,tick,tap};
}
describe('real E key tap versus home abandonment',()=>{
 it('two short actual E taps collect both private parcels in the overlapping home/pickup radius',()=>{
  const s=setup();s.tap();expect(carriedOrders(s.player,s.world.orders)).toHaveLength(1);
  s.tap();expect(carriedOrders(s.player,s.world.orders)).toHaveLength(2);expect(s.player.abandonMs).toBe(0);
 });
 it('holding never repeats pickup and a later deliberate 1000ms hold abandons both without payment',()=>{
  const s=setup(),coins=s.player.coins;s.input.down('KeyE');for(let i=0;i<10;i++)s.tick();
  expect(carriedOrders(s.player,s.world.orders)).toHaveLength(1);s.input.up('KeyE');s.tick();s.tap();
  expect(carriedOrders(s.player,s.world.orders)).toHaveLength(2);
  s.input.down('KeyE');for(let i=0;i<19;i++)s.tick();expect(carriedOrders(s.player,s.world.orders)).toHaveLength(2);
  s.tick();expect(carriedOrders(s.player,s.world.orders)).toHaveLength(0);expect(s.player.coins).toBe(coins);expect(s.player.delivered).toBe(0);
 });
});
