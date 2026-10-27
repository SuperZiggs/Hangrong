import Phaser from 'phaser';
import type {Player,PublicSnapshot} from '../../../shared/arcade/types';
import {courierFrames,markerShapes,playerPalette} from '../assets/manifest';
export class ActorView{
 readonly root:Phaser.GameObjects.Container;private sprite:Phaser.GameObjects.Sprite;private parcel:Phaser.GameObjects.Image;private ring:Phaser.GameObjects.Image;private label:Phaser.GameObjects.Text;private hitUntil=0;private lastTick=-1;private corrections:number[]=[];
 constructor(private scene:Phaser.Scene,p:Player,private index:number,private own:boolean){
  const color=playerPalette[index%8],shape=markerShapes[Math.floor(index/8)%4];
  const shadow=scene.add.image(0,1,'characters.shadow').setDisplaySize(40,20);
  this.ring=scene.add.image(0,3,'characters.markers',shape).setTint(color).setDisplaySize(38,22).setAlpha(own?.95:.5);
  this.sprite=scene.add.sprite(0,0,'characters.courier',`courier/S/idle/01`).setOrigin(.5,88/96).setScale(.9);
  this.parcel=scene.add.image(0,0,'characters.parcel','parcel/S').setOrigin(.5,88/96).setScale(.9).setVisible(false);
  this.label=scene.add.text(0,-79,`${own?'BẠN · ':''}${index+1} ${p.name}`,{fontFamily:'ArcadeBody,Arial',fontSize:own?'13px':'11px',fontStyle:own?'bold':'normal',color:own?'#ffffff':'#183c48',backgroundColor:own?'#183c48':'#fff4db',padding:{x:7,y:4}}).setOrigin(.5);
  this.root=scene.add.container(p.x,p.y,[shadow,this.ring,this.sprite,this.parcel,this.label]);
 }
 bump(until:number){this.hitUntil=until;}
 update(p:Player,s:PublicSnapshot,time:number,delta:number,target=p){
  if(this.own&&s.tick!==this.lastTick&&!s.paused){const gap=Math.hypot(this.root.x-target.x,this.root.y-target.y);if(gap<250){this.corrections.push(gap);if(this.corrections.length>600)this.corrections.shift();if(this.corrections.length%10===0){const sorted=[...this.corrections].sort((a,b)=>a-b);this.scene.game.canvas.dataset.reconcileP95=String(sorted[Math.floor(sorted.length*.95)]);}}this.lastTick=s.tick;}
  const a=Math.min(1,delta/(this.own?32:75));if(Math.hypot(this.root.x-target.x,this.root.y-target.y)>250)this.root.setPosition(target.x,target.y);else{this.root.x+=(target.x-this.root.x)*a;this.root.y+=(target.y-this.root.y)*a;}
  this.root.setDepth(this.root.y+30).setAlpha(p.connected?1:.35);
  this.label.setText(`${this.own?'BẠN · ':''}${this.index+1} ${p.name}`);
  const anim=s.phase==='results'?'celebrate':time<this.hitUntil?'bump':p.dashRemainingMs>0&&p.connected?'dash':p.moving&&p.connected?'run':'idle';
  const rate=anim==='run'?90:anim==='idle'?450:anim==='celebrate'?150:110;
  this.sprite.setFrame(`courier/${p.direction}/${anim}/${String(Math.floor(time/rate)%courierFrames[anim]+1).padStart(2,'0')}`);
  this.parcel.setVisible(!!p.carriedOrderId||('hasOrder'in p&&!!p.hasOrder)).setFrame(`parcel/${p.direction}`);
  this.ring.setAlpha(p.pushProtectionMs>0?.95:this.own?.9:.5);
 }
 destroy(){this.root.destroy();}
}
