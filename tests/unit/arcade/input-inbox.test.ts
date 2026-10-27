import {it,expect} from 'vitest';import {createWorld,stepWorld} from '../../../shared/arcade/world';import {InputInbox} from '../../../shared/arcade/input-inbox';import type {InputFrame} from '../../../shared/arcade/types';
const setup=()=>{const world=createWorld({seed:'edges',initialCoins:20,roster:[{playerId:'a',name:'An'}]});const frame:InputFrame={runId:world.runId,seq:1,moveX:1,moveY:0,interactPressed:false,dashPressed:false,abandonHeld:false};return {world,frame,inbox:new InputInbox()};};
it('a newer movement packet cannot erase a dash press received before the next server tick',()=>{
 const {world,frame,inbox}=setup();inbox.set('a',{frame:{...frame,dashPressed:true},at:0});inbox.set('a',{frame:{...frame,seq:2},at:1});stepWorld(world,inbox.sample(10),50);expect(world.players.a.dashCooldownMs).toBe(3950);
 stepWorld(world,inbox.sample(60),50);expect(world.players.a.dashCooldownMs).toBe(3900);
});
it('one E edge survives a packet burst and is consumed once, rather than picking up then auto-delivering',()=>{
 const {world,frame,inbox}=setup();world.players.a.x=300;world.players.a.y=300;world.orders.test={id:'test',pickup:{x:300,y:300},delivery:{x:300,y:300},value:10,ownerId:null,privateOwnerId:null,lockedFee:null,settled:false};
 inbox.set('a',{frame:{...frame,moveX:0,interactPressed:true},at:0});inbox.set('a',{frame:{...frame,moveX:0,seq:2},at:1});stepWorld(world,inbox.sample(10),50);expect(world.players.a.carriedOrderId).toBe('test');stepWorld(world,inbox.sample(60),50);expect(world.players.a.coins).toBe(20);expect(world.players.a.carriedOrderId).toBe('test');
});
it('expired intent still stops motion at the250ms lease',()=>{const {inbox,frame}=setup();inbox.set('a',{frame,at:0});expect(inbox.sample(251).size).toBe(0);});
it('a new idle packet cannot revive an expired action edge',()=>{const {inbox,frame}=setup();inbox.set('a',{frame:{...frame,dashPressed:true},at:0});inbox.set('a',{frame:{...frame,seq:2},at:300});expect(inbox.sample(310).get('a')?.dashPressed).toBe(false);});
