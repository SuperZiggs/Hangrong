import {beforeEach,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({text:'',version:0,reads:0,fail:false}));
vi.mock('cloudflare:workers',()=>({env:{DB:{prepare:()=>({bind:(...values:unknown[])=>({
 first:async()=>{db.reads++;if(db.fail)throw new Error('temporary read failure');await Promise.resolve();return{state_json:db.text,version:db.version};},
 run:async()=>{if(values[3]!==db.version)return{meta:{changes:0}};db.version=Number(values[0]);db.text=String(values[1]);return{meta:{changes:1}};},
})})}}}));
import {createState} from '../../server/game/engine';
import {currentRoom,mutateRoom} from '../../server/room-store';
beforeEach(()=>{db.text=JSON.stringify(createState('123456','host-hash',Date.now(),'read-test'));db.version=0;db.reads=0;db.fail=false;});
it('a same-room state burst needs one in-flight D1 read and returns the same committed version',async()=>{
 const rooms=await Promise.all(Array.from({length:40},()=>currentRoom('123456')));
 expect(db.reads).toBe(1);expect(rooms.every(r=>r.code==='123456'&&r.version===0)).toBe(true);
});
it('a completed write is visible to the next read instead of retaining an earlier flight',async()=>{
 expect((await currentRoom('123456')).pausedMs).toBe(0);await mutateRoom('123456',r=>{r.pausedMs=123;});expect((await currentRoom('123456')).pausedMs).toBe(123);
});
it('a rejected flight does not poison later reads',async()=>{
 db.fail=true;await expect(currentRoom('123456')).rejects.toThrow('temporary read failure');db.fail=false;expect((await currentRoom('123456')).code).toBe('123456');
});
