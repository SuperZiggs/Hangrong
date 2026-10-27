import Phaser from 'phaser';
import type {ArcadeBridge} from '../bridge';
import type {PublicSnapshot,Point} from '../../../shared/arcade/types';
import {ActorView} from './ActorView';
import {FxView} from './FxView';
import {canTakeOrder,carriedOrders} from '../../../shared/arcade/cargo';
import {near} from '../../../shared/arcade/orders';
export class CityScene extends Phaser.Scene{
 private state:PublicSnapshot|null=null;private off:(()=>void)|undefined;private actors=new Map<string,ActorView>();private initialized=false;private orderViews=new Map<string,Phaser.GameObjects.Container>();private shared:Phaser.GameObjects.Image|null=null;private fx!:FxView;private runId='';private targetArrow!:Phaser.GameObjects.Image;private targetLabel!:Phaser.GameObjects.Text;private mini!:Phaser.GameObjects.Graphics;
 private customerViews=new Map<string,Phaser.GameObjects.Container>();private slotViews=new Map<number,Phaser.GameObjects.Container>();
 constructor(private bridge:ArcadeBridge){super({key:'City'});}
 create(){this.off=this.bridge.subscribe(()=>{this.state=this.bridge.read();});this.state=this.bridge.read();this.fx=new FxView(this);this.game.canvas.dataset.ready='true';this.events.once('shutdown',()=>this.off?.());this.targetArrow=this.add.image(0,0,'ui.icons','delivery').setScrollFactor(0).setDepth(100000).setDisplaySize(38,38).setVisible(false);this.targetLabel=this.add.text(0,0,'',{fontFamily:'ArcadeBody,Arial',fontSize:'11px',color:'#183c48',backgroundColor:'#fff4db',padding:{x:6,y:3}}).setScrollFactor(0).setDepth(100001).setOrigin(.5);this.mini=this.add.graphics().setScrollFactor(0).setDepth(99999);}
 private tile(key:string){const name=`tile:${key}`;if(!this.textures.exists(name)){const f=this.textures.get('environment.tiles').get(key),canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;canvas.getContext('2d')!.drawImage(f.source.image as HTMLImageElement,f.cutX,f.cutY,64,64,0,0,64,64);this.textures.addCanvas(name,canvas);}return name;}
 private floor(x:number,y:number,w:number,h:number,key:string,depth=-100){return this.add.tileSprite(x,y,w,h,this.tile(key)).setOrigin(0).setDepth(depth);}
 private sign(x:number,y:number,label:string,color='#183c48',size=14){return this.add.text(x,y,label,{fontFamily:'ArcadeTitle,Arial',fontSize:`${size}px`,color,backgroundColor:'#fff4db',padding:{x:9,y:5},align:'center'}).setOrigin(.5).setDepth(y+10);}
 private drawMap(s:PublicSnapshot){
  const m=s.map;this.cameras.main.setBounds(0,0,m.width,m.height);this.floor(0,0,m.width,m.height,'ground/01');
  this.floor(0,m.riverY-80,m.width,64,'roads/08',-90);this.floor(0,m.riverY+m.riverHeight+55,m.width,64,'roads/08',-90);
  this.floor(0,m.riverY,m.width,m.riverHeight,'water/01',-80);
  this.floor(0,m.riverY-15,m.width,16,'curbs/01',-75);this.floor(0,m.riverY+m.riverHeight,m.width,16,'curbs/01',-75);
  for(const bridge of [m.freeBridge,m.gate,m.sharedRouteRect]){this.floor(bridge.x,bridge.y,bridge.w,bridge.h,'bridges/03',-70);this.floor(bridge.x,Math.max(250,bridge.y-190),bridge.w,180,'ground/08',-92);this.floor(bridge.x,bridge.y+bridge.h,bridge.w,160,'ground/08',-92);}
  this.sign(m.freeBridge.x+m.freeBridge.w/2,m.riverY-35,'ĐƯỜNG VÒNG · MIỄN PHÍ','#137e73',12);
  this.add.image(m.gate.x+m.gate.w/2,m.riverY+20,'environment.structures','p-gate/open').setOrigin(.5,.94).setDisplaySize(108,108).setDepth(m.riverY+24);
  this.add.image(m.gate.x+160,m.riverY-25,'environment.structures','p-tower').setOrigin(.5,.94).setScale(.55).setDepth(m.riverY-40);
  this.sign(m.gate.x+24,m.riverY-110,'CỔNG P','#5964d8',19);
  this.shared=this.add.image(m.sharedRouteRect.x+72,m.riverY+105,'environment.structures','shared-bridge/closed').setOrigin(.5,.94).setDisplaySize(150,158).setDepth(m.riverY+145);
  this.sign(m.sharedRouteRect.x+72,m.riverY-145,'LỐI CHUNG','#137e73',14);
  m.shops.forEach((p,i)=>{this.add.image(p.x,p.y+14,'environment.structures',`storefront/${i%4}`).setOrigin(.5,.95).setDisplaySize(144,144).setDepth(p.y+14);this.sign(p.x,p.y+28,`TIỆM ${i+1}`,undefined,11);});
  for(const station of m.stations){const key=station.kind==='promotion'?'promotion/closed':station.kind==='private-channel'?'private-channel/closed':null;
   if(key)this.add.image(station.x,station.y+16,'environment.structures',key).setOrigin(.5,.94).setDisplaySize(47,47).setDepth(station.y+12);
   else this.add.image(station.x,station.y,'ui.icons','contribution').setDisplaySize(48,48).setDepth(station.y);
   this.sign(station.x,station.y+35,station.kind==='promotion'?'KM 8':station.kind==='private-channel'?'RIÊNG 40':'GÓP 5',undefined,9);
  }
  for(let y=70;y<m.height;y+=195)for(const x of [35,m.width-35])this.add.image(x,y,'environment.props',`trees/${Math.floor(y/195)%4}`).setOrigin(.5,.93).setDepth(y).setScale(.72);
  for(let x=80;x<m.width;x+=340){this.add.image(x,m.riverY-35,'environment.props','lamps/0').setOrigin(.5,.94).setScale(.6).setDepth(m.riverY-35);this.add.image(x+110,m.riverY+m.riverHeight+48,'environment.props','planters/1').setOrigin(.5,.94).setScale(.7).setDepth(m.riverY+m.riverHeight+48);}
  this.syncCustomers(s);
  this.initialized=true;
 }
 private syncCustomers(s:PublicSnapshot){
  const alive=new Set<string>();
  s.map.deliveries.forEach((p,i)=>{
   const key=`${p.x}:${p.y}`;alive.add(key);if(this.customerViews.has(key))return;
   const center=s.map.centralDeliveries?.findIndex(c=>c.x===p.x&&c.y===p.y)??-1;
   const customer=this.add.image(34,10,'characters.customers',`customer/${i%4}/01`).setOrigin(.5,88/96).setScale(.85);
   const umbrella=this.add.image(75,-30,'environment.props',`umbrellas/${i%4}`).setOrigin(.5,.94).setScale(.8);
   const view=this.add.container(p.x,p.y,[umbrella,customer]).setDepth(p.y+12);
   if(center>=0){
    const marker=this.add.image(0,-18,'ui.icons','delivery').setDisplaySize(34,34);
    const label=this.add.text(32,-104,`KHÁCH TRUNG TÂM ${center+1}`,{fontFamily:'ArcadeTitle,Arial',fontSize:'13px',color:'#ffffff',backgroundColor:'#137e73',padding:{x:8,y:5}}).setOrigin(.5);
    view.add([marker,label]);
   }
   this.customerViews.set(key,view);
  });
  for(const [key,view]of this.customerViews)if(!alive.has(key)){view.destroy();this.customerViews.delete(key);}
 }
 private syncSlots(s:PublicSnapshot){
  (s.commonSlots??[]).forEach((slot,index)=>{
   const point=s.map.pickups[index];if(!point)return;let view=this.slotViews.get(index);
   if(!view){const icon=this.add.image(0,-5,'ui.icons','cooldown').setDisplaySize(30,30);const label=this.add.text(0,27,'',{fontFamily:'ArcadeTitle,Arial',fontSize:'14px',color:'#5964d8',backgroundColor:'#fff4db',padding:{x:7,y:4}}).setOrigin(.5);view=this.add.container(point.x,point.y,[icon,label]);this.slotViews.set(index,view);}
   view.setPosition(point.x,point.y).setDepth(point.y+20).setVisible(!slot.orderId&&slot.nextAt>0);
   const seconds=Math.max(0,Math.ceil((slot.nextAt-s.elapsedMs)/1000));(view.list[1] as Phaser.GameObjects.Text).setText(`HÀNG MỚI · ${seconds}s`);
  });
 }
 private navigation(s:PublicSnapshot){
  const self=this.bridge.playerId?s.players[this.bridge.playerId]:null;if(!self||this.bridge.projector){this.targetArrow.setVisible(false);this.targetLabel.setVisible(false);return;}
  const cargo=carriedOrders(self,s.orders),order=cargo.find(o=>near(self,o.delivery))??cargo[0];const open=Object.values(s.orders).filter(o=>canTakeOrder(self,s.orders,o,cargo)).sort((a,b)=>Phaser.Math.Distance.BetweenPoints(a.pickup,self)-Phaser.Math.Distance.BetweenPoints(b.pickup,self));const target:Point|undefined=order?.delivery??open[0]?.pickup;
  const c=this.cameras.main;this.targetArrow.setVisible(!!target);this.targetLabel.setVisible(!!target);
  if(target){const screen={x:(target.x-c.worldView.x)*c.zoom,y:(target.y-c.worldView.y)*c.zoom},x=Phaser.Math.Clamp(screen.x,55,c.width-55),y=Phaser.Math.Clamp(screen.y,135,c.height-160);
   this.targetArrow.setPosition(x,y).setFrame(order?'delivery':'pickup');this.targetLabel.setPosition(x,y+30).setText(`${order?'GIAO':'NHẬN'} · ${Math.round(Math.hypot(target.x-self.x,target.y-self.y))}m`);
  }
  const w=160,h=100,left=20,top=c.height-200,g=this.mini;g.clear().fillStyle(0xfff4db,.93).fillRoundedRect(left,top,w,h,10).lineStyle(1,0x183c48,.4).strokeRoundedRect(left,top,w,h,10);
  g.fillStyle(0x73c6d3).fillRect(left+4,top+s.map.riverY/s.map.height*h,w-8,s.map.riverHeight/s.map.height*h);
  for(const b of [s.map.freeBridge,s.map.gate,...(s.sharedRoute.open?[s.map.sharedRouteRect]:[])])g.fillStyle(0xc49d6a).fillRect(left+b.x/s.map.width*w,top+b.y/s.map.height*h,Math.max(4,b.w/s.map.width*w),b.h/s.map.height*h);
  g.fillStyle(0xffc857).fillRect(left+self.home.x/s.map.width*w-3,top+self.home.y/s.map.height*h-3,6,6);
  for(const p of Object.values(s.players))g.fillStyle(p.playerId===self.playerId?0x18a999:0x5964d8).fillCircle(left+p.x/s.map.width*w,top+p.y/s.map.height*h,p.playerId===self.playerId?4:2);
  if(target)g.fillStyle(order?0xf26b5e:0xffc857).fillCircle(left+target.x/s.map.width*w,top+target.y/s.map.height*h,4);
 }
 update(time:number,delta:number){const s=this.state;if(!s)return;if(!this.initialized)this.drawMap(s);
  if(this.runId!==s.runId){this.runId=s.runId;this.fx.reset();for(const view of this.orderViews.values())view.destroy();this.orderViews.clear();}
  this.shared?.setFrame(s.sharedRoute.open?'shared-bridge/open':'shared-bridge/closed');
  this.syncCustomers(s);this.syncSlots(s);
  for(const [index,p]of Object.values(s.players).entries()){let view=this.actors.get(p.playerId);if(!view){view=new ActorView(this,p,index,p.playerId===this.bridge.playerId);this.actors.set(p.playerId,view);}for(const e of s.events)if(e.kind==='bump'&&e.playerId===p.playerId&&s.elapsedMs-e.at<300)view.bump(time+300-(s.elapsedMs-e.at));const predicted=p.playerId===this.bridge.playerId?this.bridge.predict?.():null;view.update(p,s,time,delta,predicted??p);
   if(p.playerId===this.bridge.playerId&&!this.bridge.projector){this.cameras.main.setZoom(.96);this.cameras.main.centerOn(view.root.x,view.root.y+55);}}
  if(this.bridge.projector){const c=this.cameras.main;c.removeBounds();c.setZoom(Math.min(c.width/s.map.width,c.height/s.map.height)*.94);c.centerOn(s.map.width/2,s.map.height/2);}
  const alive=new Set<string>(),stockIndex=new Map<string,number>(),deliveryIndex=new Map<string,number>();
  for(const o of Object.values(s.orders)){
   if(o.settled)continue;const own=!!o.ownerId&&o.ownerId===this.bridge.playerId;if(o.ownerId&&!own)continue;alive.add(o.id);const point=o.ownerId?o.delivery:o.pickup;
   let offset=0;
   if(o.privateOwnerId&&!own){const index=stockIndex.get(o.privateOwnerId)??0;stockIndex.set(o.privateOwnerId,index+1);offset=index*30-15;}
   if(own){const key=`${point.x}:${point.y}`,index=deliveryIndex.get(key)??0;deliveryIndex.set(key,index+1);offset=index*44;}
   const kind=o.privateOwnerId?'RIÊNG':o.source==='promotion'?'KHUYẾN MÃI':'CÔNG KHAI',color=o.privateOwnerId?'#137e73':o.source==='promotion'?'#a14133':'#805500';
   let v=this.orderViews.get(o.id);if(!v){const ring=this.add.image(0,0,'fx.spawn-marker','spawn-marker/01').setDisplaySize(70,70);const box=this.add.image(0,-12,own?'ui.icons':'characters.parcel',own?'delivery':'parcel/S').setDisplaySize(own?38:96,own?38:96);const label=this.add.text(0,34,'',{fontFamily:'ArcadeTitle,Arial',fontSize:'11px',color,backgroundColor:'#fff4db',padding:{x:6,y:3}}).setOrigin(.5);v=this.add.container(point.x,point.y,[ring,box,label]);this.orderViews.set(o.id,v);}
   v.setPosition(point.x+offset,point.y).setDepth(point.y+20);(v.list[1] as Phaser.GameObjects.Image).setTexture(own?'ui.icons':'characters.parcel',own?'delivery':'parcel/S').setDisplaySize(own?38:96,own?38:96);
   (v.list[2] as Phaser.GameObjects.Text).setColor(color).setText(`${own?'GIAO ':''}${kind} · ${Math.max(0,o.value-(own?o.lockedFee??0:0))} XU`);
   (v.list[0] as Phaser.GameObjects.Image).setFrame(`spawn-marker/${String(Math.floor((s.paused?s.elapsedMs:time)/180)%4+1).padStart(2,'0')}`);
  }
  for(const [id,v]of this.orderViews)if(!alive.has(id)){v.destroy();this.orderViews.delete(id);}
  if(!this.bridge.reducedMotion?.())this.fx.consume(s.events);this.navigation(s);
 }
}
