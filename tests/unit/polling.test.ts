import {it,expect} from 'vitest';
import {pollDelay} from '../../lib/polling';
it('polls active play each second and lobby/hidden tabs each three seconds',()=>{
 expect(pollDelay('answering',false,false)).toBe(1000);
 expect(pollDelay('review',false,false)).toBe(1000);
 expect(pollDelay('answering',true,false)).toBe(3000);
 expect(pollDelay('lobby',false,false)).toBe(3000);
});
it('backs off at final board to notice replay, and stops invalid sessions',()=>{
 expect(pollDelay('finished',false,false)).toBe(15000);
 expect(pollDelay('answering',false,true)).toBeNull();
});
