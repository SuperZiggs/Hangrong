import {test,expect,type Page,type Browser} from '@playwright/test';
import {createArcade,joinArcade,hostArcade,arcadeOK,bootstrapArcade,type ArcadePlayer,type ArcadeRoom} from '../support/arcade-independent';
import type {PublicSnapshot} from '../../shared/arcade/types';
let browsersToClose:Browser[]=[];
test.afterEach(async({},info)=>{info.setTimeout(90000);await Promise.all(browsersToClose.map(b=>b.close()));browsersToClose=[];});
test('three real keyboard clients contest one parcel, obstruct movement and deliver across the river',async({playwright,request,baseURL},info)=>{
 test.setTimeout(180000);const room=await createArcade(request),players=await Promise.all(['Sen','Đào','Mai'].map(n=>joinArcade(request,room,n)));const browsers=await Promise.all(players.map(()=>playwright.chromium.launch({channel:'chrome',args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']})));const contexts=await Promise.all(browsers.map(b=>b.newContext({baseURL,viewport:{width:1366,height:768}})));const pages:Page[]=[];const errors:string[]=[];
 browsersToClose=browsers;
 try{
  for(let i=0;i<3;i++){await contexts[i].addInitScript(({code,token})=>localStorage.setItem(`cdgk:player:${code}`,token),{code:room.code,token:players[i].playerToken});const page=await contexts[i].newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`/arcade/play/${room.code}`);pages.push(page);}
  await arcadeOK(await hostArcade(request,room,'start'));for(const page of pages){await expect(page.getByTestId('arcade-world')).toBeVisible();await expect(page.getByTestId('arcade-world')).toHaveAttribute('data-ready','true');}
  const controls=await Promise.all(contexts.map((c,i)=>c.newCDPSession(pages[i])));
  async function pulse(index:number,code:string,duration:number){
   const key=code==='Space'?' ':code.slice(3).toLowerCase(),virtual=code==='Space'?32:key.toUpperCase().charCodeAt(0),data={code,key,windowsVirtualKeyCode:virtual,nativeVirtualKeyCode:virtual};
   // Queue trusted key-down/up at their intended interval without adding two
   // CDP round trips to the time the movement key is held.
   const down=controls[index].send('Input.dispatchKeyEvent',{type:'rawKeyDown',...data});
   const up=new Promise<void>((resolve,reject)=>setTimeout(()=>{void controls[index].send('Input.dispatchKeyEvent',{type:'keyUp',...data}).then(()=>resolve(),reject);},duration));
   await Promise.all([down,up]);
  }
  const view=async(p:ArcadePlayer)=>(await bootstrapArcade(request,room,p.playerToken)).snapshot as unknown as PublicSnapshot;
  async function walk(index:number,target:{x:number;y:number},tolerance=24){
   const page=pages[index],p=players[index],began=Date.now();
   while(Date.now()-began<30000){const pos=(await view(p)).players[p.playerId],dx=target.x-pos.x,dy=target.y-pos.y;
    if(Math.hypot(dx,dy)<=tolerance){console.log(`Stopped: ${p.name} at ${Math.round(pos.x)},${Math.round(pos.y)}`);return;}
    const horizontal=Math.abs(dx)>Math.abs(dy),distance=horizontal?Math.abs(dx):Math.abs(dy),key=horizontal?(dx>0?'KeyD':'KeyA'):(dy>0?'KeyS':'KeyW');
    await pulse(index,key,Math.min(220,Math.max(35,(distance-Math.min(12,tolerance/2))/240*1000)));await page.waitForTimeout(140);
   }throw new Error(`Player${index} could not walk to${JSON.stringify(target)} from${JSON.stringify((await view(players[index])).players[players[index].playerId])}`);
  }
  await expect.poll(async()=>(await view(players[0])).phase,{timeout:75000}).toBe('stage1');
  await expect.poll(async()=>Object.keys((await view(players[0])).orders).length).toBeGreaterThan(0);const initial=await view(players[0]),order=Object.values(initial.orders).sort((a,b)=>a.delivery.x-b.delivery.x)[0];
  // Match approach order to the authoritative spawn order. Stay well outside
  // each other's body radius while both remain within E interaction range.
  const contestants=[0,1].sort((a,b)=>initial.players[players[a].playerId].x-initial.players[players[b].playerId].x);
  await Promise.all(players.map((p,i)=>walk(i,{x:initial.players[p.playerId].x,y:order.pickup.y-(i===2?95:0)})));
  await Promise.all([walk(contestants[0],{x:order.pickup.x-36,y:order.pickup.y},10),walk(contestants[1],{x:order.pickup.x+36,y:order.pickup.y},10),walk(2,{x:order.pickup.x,y:order.pickup.y-95})]);
  await Promise.all([pages[0].keyboard.press('e'),pages[1].keyboard.press('e')]);await expect.poll(async()=>(await view(players[0])).orders[order.id]?.ownerId).not.toBeNull();
  const claimed=await view(players[0]),owner=claimed.orders[order.id].ownerId!,winner=players.findIndex(p=>p.playerId===owner);expect(players.slice(0,2).map(p=>claimed.players[p.playerId].carriedOrderId).filter(id=>id===order.id)).toHaveLength(1);
  const before=claimed.players[owner],opponent=claimed.players[players[1-winner].playerId];expect(Math.hypot(before.x-opponent.x,before.y-opponent.y)).toBeGreaterThanOrEqual(27.5);
  const keys=[...(Math.abs(opponent.x-before.x)>5?[opponent.x>before.x?'KeyD':'KeyA']:[]),...(Math.abs(opponent.y-before.y)>5?[opponent.y>before.y?'KeyS':'KeyW']:[])];await Promise.all([...keys.map(key=>pulse(winner,key,160)),pulse(winner,'Space',35)]);await pages[winner].waitForTimeout(200);const bumped=await view(players[winner]);expect(bumped.events.some(e=>e.kind==='bump')).toBe(true);expect(bumped.players[owner].carriedOrderId).toBe(order.id);
  const bridge=claimed.map.freeBridge,center=bridge.x+bridge.w/2;await walk(winner,{x:bumped.players[owner].x,y:claimed.map.riverY-45});await walk(winner,{x:center,y:claimed.map.riverY-45});await walk(winner,{x:center,y:claimed.map.riverY+claimed.map.riverHeight+40});await walk(winner,order.delivery);
  await pages[winner].keyboard.press('e');await expect.poll(async()=>(await view(players[winner])).players[owner].delivered).toBe(1);const result=await view(players[winner]);expect(result.players[owner].coins).toBe(before.coins+10);
  for(const player of players)expect((await view(player)).players[owner].coins).toBe(result.players[owner].coins);expect(errors).toEqual([]);
  await info.attach('keyboard-delivery.png',{body:await pages[winner].screenshot(),contentType:'image/png'});
  await info.attach('player-reconciliation.json',{body:Buffer.from(JSON.stringify(await Promise.all(pages.map(page=>page.getByTestId('arcade-world').getAttribute('data-reconcile-p95'))))),contentType:'application/json'});
  await info.attach('keyboard-contest-evidence.json',{body:Buffer.from(JSON.stringify({players:3,winner:players[winner].name,order:order.id,coins:result.players[owner].coins,delivered:1})),contentType:'application/json'});
 }finally{await hostArcade(request,room,'pause').catch(()=>{});}
});
