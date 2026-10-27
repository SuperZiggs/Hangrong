import Phaser from 'phaser';
import {CityScene} from './CityScene';
import {BootScene} from './BootScene';
import type {ArcadeBridge} from '../bridge';
export async function createArcadeGame(parent:HTMLElement,bridge:ArcadeBridge):Promise<()=>void>{
 const scene=new CityScene(bridge);
 const game=new Phaser.Game({type:Phaser.AUTO,parent,width:parent.clientWidth||1280,height:parent.clientHeight||720,backgroundColor:'#f6e7c9',scene:[new BootScene(),scene],fps:{target:60,limit:60},render:{antialias:true,roundPixels:false},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
 game.canvas.setAttribute('data-testid','arcade-world');game.canvas.setAttribute('aria-label','Bản đồ Cuộc đua giành khách');game.canvas.tabIndex=0;
 const frames:number[]=[],frameAt:number[]=[];Object.defineProperty(game.canvas,'readArcadeFrameTimes',{value:(since:number,until=Infinity)=>frames.filter((_,i)=>frameAt[i]>=since&&frameAt[i]<=until)});let last=0,reported=0;game.events.on(Phaser.Core.Events.POST_RENDER,()=>{const now=performance.now();if(last){frames.push(now-last);frameAt.push(now);}last=now;if(frames.length>7200){frames.shift();frameAt.shift();}if(now-reported>1000&&frames.length){reported=now;const sorted=[...frames].sort((a,b)=>a-b);game.canvas.dataset.frameP95=String(sorted[Math.floor(sorted.length*.95)]);game.canvas.dataset.renderFps=String(1000/(frames.reduce((a,b)=>a+b,0)/frames.length));game.canvas.dataset.renderSamples=String(frames.length);}});
 return()=>game.destroy(true);
}
