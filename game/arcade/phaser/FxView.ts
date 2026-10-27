import Phaser from 'phaser';
import type {GameEvent} from '../../../shared/arcade/types';
import {assetManifest} from '../assets/manifest';
export class FxView{
 private seen=new Set<string>();
 reset(){this.seen.clear();}
 constructor(private scene:Phaser.Scene){for(const item of assetManifest.filter(a=>a.key.startsWith('fx.'))){const name=item.key.slice(3);if(!scene.anims.exists(name)&&'frames'in item&&typeof item.frames==='number')scene.anims.create({key:name,frames:Array.from({length:item.frames},(_,i)=>({key:item.key,frame:`${name}/${String(i+1).padStart(2,'0')}`})),frameRate:14,repeat:0});}}
 consume(events:GameEvent[]){for(const e of events){if(this.seen.has(e.id))continue;this.seen.add(e.id);if(e.x===undefined||e.y===undefined)continue;const name:Record<string,string>={dash:'dash-trail',bump:'bump-stars',delivery:'delivery-burst',pickup:'coin-sparkle','route-unlock':'route-unlock',promotion:'promo-confetti',gate:'gate-pulse'};const fx=name[e.kind];if(!fx)continue;const sprite=this.scene.add.sprite(e.x,e.y-20,`fx.${fx}`,`${fx}/01`).setDepth(e.y+50).setScale(.75);sprite.play(fx).once('animationcomplete',()=>sprite.destroy());}if(this.seen.size>600)this.seen=new Set(events.map(e=>e.id));}
}
