import {test,expect} from '@playwright/test';
import {createRoom,join,state} from '../support/api';
import {joinEntrant} from '../support/flexible';

test('legacy maximum identifier cannot block slotless joining',async({request})=>{
 const room=await createRoom(request);
 const legacy=await join(request,room,Number.MAX_SAFE_INTEGER);
 const next=await joinEntrant(request,room,'Minh');
 expect(next.slot).not.toBe(legacy.slot);
 expect(Number.isSafeInteger(next.slot)).toBe(true);
 const again=await joinEntrant(request,room,'Minh',{teamToken:next.teamToken});
 expect(again.teamId).toBe(next.teamId);
 expect((await state(request,room,room.hostToken)).teams).toHaveLength(2);
});
