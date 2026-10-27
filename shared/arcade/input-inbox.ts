import {RULES} from './config';import type {InputFrame} from './types';
/** Retain action edges across faster packet arrivals; motion still uses latest intent. */
export class InputInbox{
 private entries=new Map<string,{frame:InputFrame;at:number}>();
 set(id:string,next:{frame:InputFrame;at:number}){const previous=this.entries.get(id);const same=previous?.frame.runId===next.frame.runId&&next.at-previous.at<=RULES.inputLeaseMs;this.entries.set(id,{at:next.at,frame:{...next.frame,interactPressed:next.frame.interactPressed||!!(same&&previous.frame.interactPressed),dashPressed:next.frame.dashPressed||!!(same&&previous.frame.dashPressed)}});}
 sample(now:number){const frames=new Map<string,InputFrame>();for(const [id,entry]of this.entries){if(now-entry.at>RULES.inputLeaseMs){this.entries.delete(id);continue;}frames.set(id,{...entry.frame});entry.frame.interactPressed=false;entry.frame.dashPressed=false;}return frames;}
 clear(){this.entries.clear();}
 delete(id:string){this.entries.delete(id);}
}
