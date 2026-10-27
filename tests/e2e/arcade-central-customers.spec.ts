import {test,expect,type WebSocketRoute} from '@playwright/test';
import {createWorld,stepWorld} from '../../shared/arcade/world';
import {projectSnapshot} from '../../shared/arcade/snapshot';

test('new central customers are drawn when an already-running city reaches minute three',async({page},info)=>{
 // Browser/component boundary: real shell, Phaser, fonts and assets; snapshots
 // are network fixtures, not a test endpoint or a mutation of a live room.
 const w=createWorld({seed:'central-arrival-ui',initialCoins:20,roster:['a','b','c'].map(playerId=>({playerId,name:playerId}))});
 w.elapsedMs=179999;w.phase='stage1';const before=projectSnapshot(w,{role:'host'});
 stepWorld(w,new Map(),1);const after=projectSnapshot(w,{role:'host'}),code='CENTERAA';
 let peer:WebSocketRoute|undefined;
 await page.addInitScript(()=>{
  const state=window as typeof window&{drawnWords?:string[]};state.drawnWords=[];
  const original=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(...args:Parameters<typeof original>){state.drawnWords!.push(String(args[0]));return original.apply(this,args);};
 });
 await page.route(`**/api/arcade/rooms/${code}/bootstrap`,route=>route.fulfill({json:{role:'host',wsUrl:'ws://127.0.0.1:5187/central-arrival-fixture',snapshot:before}}));
 await page.routeWebSocket('**/central-arrival-fixture',socket=>{peer=socket;socket.onMessage(()=>socket.send(JSON.stringify({type:'snapshot',snapshot:before})));});
 await page.goto('/arcade');await page.evaluate(code=>localStorage.setItem(`cdgk:host:${code}`,'A'.repeat(43)),code);
 await page.goto(`/arcade/host/${code}`);await expect(page.getByTestId('arcade-world')).toHaveAttribute('data-ready','true');
 const labels=()=>page.evaluate(()=>[...new Set((window as typeof window&{drawnWords?:string[]}).drawnWords?.filter(t=>/^KHÁCH TRUNG TÂM [123]$/.test(t)))].sort());
 expect(await labels()).toEqual([]);expect(peer).toBeDefined();peer!.send(JSON.stringify({type:'snapshot',snapshot:after}));
 await expect.poll(labels,{timeout:5000}).toEqual(['KHÁCH TRUNG TÂM 1','KHÁCH TRUNG TÂM 2','KHÁCH TRUNG TÂM 3']);
 const awaitingLabels=await page.evaluate(()=>(window as typeof window&{drawnWords?:string[]}).drawnWords?.filter(t=>/^GIAO CÔNG KHAI/.test(t))??[]);
 expect(awaitingLabels,'The MC must see waiting public stock as pickup parcels, not as their own deliveries').toEqual([]);
 await expect(page.getByRole('status').filter({hasText:/3 khách trung tâm đã đến/i})).toBeVisible();
 await info.attach('central-customers-arrive.png',{body:await page.screenshot(),contentType:'image/png'});
});
