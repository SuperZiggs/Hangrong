import Phaser from 'phaser';
import {assetManifest,assetURL} from '../assets/manifest';
export class BootScene extends Phaser.Scene{
 constructor(){super({key:'Boot'});}
 preload(){
  const label=this.add.text(this.scale.width/2,this.scale.height/2,'Đang chuẩn bị thành phố…',{fontFamily:'ArcadeTitle,Arial',fontSize:'24px',color:'#183c48'}).setOrigin(.5);
  this.load.on('progress',(p:number)=>label.setText(`Đang chuẩn bị thành phố · ${Math.round(p*100)}%`));
  this.load.on('loaderror',(file:{key:string})=>label.setText(`Không tải được ${file.key}. Hãy tải lại trang.`));
  for(const item of assetManifest){if(item.kind==='atlas'&&'atlas'in item&&item.atlas)this.load.atlas(item.key,assetURL(item.path),assetURL(item.atlas));else if(item.key==='characters.shadow')this.load.image(item.key,assetURL(item.path));}
 }
 create(){this.scene.start('City');}
}
