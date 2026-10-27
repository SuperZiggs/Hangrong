import {RULES} from './config';
import type {GameEvent,InputFrame,Player,PlayerId,Point,Rect,World} from './types';
export function isFree(world:World,p:Point,r=RULES.radius){
 if(p.x<r||p.y<r||p.x>world.map.width-r||p.y>world.map.height-r)return false;
 return ![...world.map.walls,...(world.sharedRoute.open?[]:[world.map.sharedBarrier])].some(w=>{
  const x=Math.max(w.x,Math.min(p.x,w.x+w.w)),y=Math.max(w.y,Math.min(p.y,w.y+w.h));return Math.hypot(p.x-x,p.y-y)<r-.01;
 });
}
function fixWall(p:Player,w:Rect){
 const r=RULES.radius,cx=Math.max(w.x,Math.min(p.x,w.x+w.w)),cy=Math.max(w.y,Math.min(p.y,w.y+w.h));
 const dx=p.x-cx,dy=p.y-cy,d=Math.hypot(dx,dy);
 if(d>=r)return;
 if(d>.0001){p.x+=dx/d*(r-d);p.y+=dy/d*(r-d);return;}
 const options=[{v:Math.abs(p.x-w.x),x:w.x-r,y:p.y},{v:Math.abs(w.x+w.w-p.x),x:w.x+w.w+r,y:p.y},{v:Math.abs(p.y-w.y),x:p.x,y:w.y-r},{v:Math.abs(w.y+w.h-p.y),x:p.x,y:w.y+w.h+r}].sort((a,b)=>a.v-b.v);p.x=options[0].x;p.y=options[0].y;
}
export function constrainPlayer(world:World,p:Player){
 for(const w of world.map.walls)fixWall(p,w);
 if(!world.sharedRoute.open)fixWall(p,world.map.sharedBarrier);
 p.x=Math.max(RULES.radius,Math.min(world.map.width-RULES.radius,p.x));p.y=Math.max(RULES.radius,Math.min(world.map.height-RULES.radius,p.y));
}
export function advanceMotion(world:World,inputs:ReadonlyMap<PlayerId,InputFrame>,dtMs:number):GameEvent[]{
 if(world.paused||world.phase==='results'||world.phase==='interrupted'||world.phase==='lobby')return [];
 const events:GameEvent[]=[],players=Object.values(world.players).filter(p=>p.connected);
 for(const p of players){const f=inputs.get(p.playerId);if(f?.runId===world.runId&&f.dashPressed&&f.seq>p.lastDashSeq){p.lastDashSeq=f.seq;if(p.dashCooldownMs<=0){
  let x=f.moveX,y=f.moveY;if(!x&&!y){x=p.direction==='E'?1:p.direction==='W'?-1:0;y=p.direction==='S'?1:p.direction==='N'?-1:0;}
  const n=Math.hypot(x,y)||1;p.dashX=x/n;p.dashY=y/n;p.dashRemainingMs=RULES.dashMs;p.dashCooldownMs=RULES.dashCooldownMs;
  events.push({id:`dash:${world.tick}:${p.playerId}`,kind:'dash',playerId:p.playerId,at:world.elapsedMs,x:p.x,y:p.y});
 }}}
 let remaining=Math.max(0,dtMs);
 while(remaining>0){const ms=Math.min(10,remaining);remaining-=ms;
  for(const p of players){const f=inputs.get(p.playerId),valid=f?.runId===world.runId,x=valid?f.moveX:0,y=valid?f.moveY:0,n=Math.hypot(x,y);
   p.moving=n>0||p.dashRemainingMs>0;
   if(n>0){if(Math.abs(x)>=Math.abs(y)&&x)p.direction=x>0?'E':'W';else if(y)p.direction=y>0?'S':'N';}
   const dashTime=Math.min(ms,p.dashRemainingMs),normalTime=ms-dashTime;
   p.x+=p.dashX*RULES.dashSpeed*dashTime/1000+(n?x/n:0)*RULES.speed*normalTime/1000;
   p.y+=p.dashY*RULES.dashSpeed*dashTime/1000+(n?y/n:0)*RULES.speed*normalTime/1000;constrainPlayer(world,p);
  }
  for(let iteration=0;iteration<3;iteration++)for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){
   const a=players[i],b=players[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),diameter=RULES.radius*2;if(d>=diameter)continue;
   const nx=d>.001?dx/d:1,ny=d>.001?dy/d:0,overlap=diameter-d;
   if(iteration===0){const attacker=a.dashRemainingMs>0?a:b.dashRemainingMs>0?b:null,target=attacker===a?b:a;
    if(attacker&&target.pushProtectionMs<=0){target.x+=attacker.dashX*18;target.y+=attacker.dashY*18;target.pushProtectionMs=RULES.pushProtectionMs;constrainPlayer(world,target);events.push({id:`bump:${world.tick}:${target.playerId}`,kind:'bump',playerId:target.playerId,at:world.elapsedMs,x:target.x,y:target.y});}
   }
   a.x-=nx*overlap/2;a.y-=ny*overlap/2;b.x+=nx*overlap/2;b.y+=ny*overlap/2;constrainPlayer(world,a);constrainPlayer(world,b);
  }
  for(const p of players){p.dashRemainingMs=Math.max(0,p.dashRemainingMs-ms);p.dashCooldownMs=Math.max(0,p.dashCooldownMs-ms);p.pushProtectionMs=Math.max(0,p.pushProtectionMs-ms);}
 }
 return events;
}
