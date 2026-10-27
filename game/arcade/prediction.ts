import {advanceMotion} from '../../shared/arcade/motion';
import type {InputFrame,PublicSnapshot,World} from '../../shared/arcade/types';
export function predictMotion(s:PublicSnapshot,id:string,frames:{input:InputFrame;dtMs:number}[]){
 if(!s.players[id])return null;
 const world={...s,players:structuredClone(s.players)} as unknown as World;
 for(const frame of frames.slice(-5))advanceMotion(world,new Map([[id,frame.input]]),Math.min(50,Math.max(0,frame.dtMs)));
 return world.players[id];
}
