import {it,expect} from 'vitest';
import {createState,joinState} from '../../server/game/engine';
import {slot} from '../../server/http';

it('auto-joins safely after a valid legacy identifier reaches the largest safe integer',()=>{
 const room=createState('123456','host',Date.now(),'identifier-regression');
 expect(slot.safeParse(Number.MAX_SAFE_INTEGER).success).toBe(true);
 joinState(room,Number.MAX_SAFE_INTEGER,'Phiên cũ','legacy');
 const entrant=joinState(room,undefined,'Người mới','new');
 expect(Number.isSafeInteger(entrant.slot)).toBe(true);
 expect(entrant.slot).toBeGreaterThan(0);
 expect(entrant.slot).not.toBe(Number.MAX_SAFE_INTEGER);
 expect(joinState(room,undefined,'Người mới','new').teamId).toBe(entrant.teamId);
 expect(room.teams).toHaveLength(2);
});
