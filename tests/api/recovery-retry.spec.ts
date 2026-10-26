import {test,expect} from '@playwright/test';
import {createRoom,join,command,success,token,state,auth,error} from '../support/api';

test('lost recovery response can be retried only by the same replacement capability',async({request})=>{
 const room=await createRoom(request),team=await join(request,room,1);
 const issued=await success(await command(request,room,'issue-recovery',{payload:{slot:1}}));
 const replacement=token(),data={recoveryCode:issued.recoveryCode,newTeamToken:replacement};
 const first=await success(await request.post(`/api/rooms/${room.code}/recover`,{data}));
 const retry=await success(await request.post(`/api/rooms/${room.code}/recover`,{data}));
 expect(retry).toEqual(first);
 expect(await state(request,room,replacement)).toMatchObject({role:'team',you:{teamId:team.teamId}});
 await error(await request.get(`/api/rooms/${room.code}/state`,{headers:auth(team.teamToken)}),403);
 await error(await request.post(`/api/rooms/${room.code}/recover`,{data:{...data,newTeamToken:token()}}),403);
});

