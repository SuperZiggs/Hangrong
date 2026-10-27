import type {GameEvent,MatchPhase,World} from './types';
export const phaseAt=(elapsed:number):MatchPhase=>elapsed<60000?'practice':elapsed<180000?'stage1':elapsed<360000?'stage2':elapsed<540000?'stage3':'results';
export function announcements(world:World):GameEvent[]{const events:GameEvent[]=[];
 for(const [time,key,text]of [[60000,'score','10 giây nữa: bắt đầu tính xu!'],[180000,'distribution','10 giây nữa: 3 khách nhận hàng đến khu trung tâm!'],[360000,'fee','10 giây nữa: phí cổng P tăng lên 4 xu!'],[540000,'finish','10 giây cuối! Giao đơn trước khi hết giờ.']] as const){
  if(world.elapsedMs>=time-10000&&world.elapsedMs<time&&!world.announced.includes(key)){world.announced.push(key);events.push({id:`announce:${key}`,kind:'warning',text,at:world.elapsedMs});}
 }return events;
}
