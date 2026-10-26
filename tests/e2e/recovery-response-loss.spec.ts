import {test,expect} from '@playwright/test';
import {createRoom,join,command,success} from '../support/api';

test('replacement phone reuses its persisted capability after the recovery response is lost',async({page,request})=>{
 const room=await createRoom(request);await join(request,room,1);
 const issued=await success(await command(request,room,'issue-recovery',{payload:{slot:1}}));
 const sent:string[]=[];
 await page.route(`**/api/rooms/${room.code}/recover`,async route=>{
  sent.push(route.request().postDataJSON().newTeamToken);
  if(sent.length===1){await route.fetch();await route.abort('failed');}else await route.continue();
 });
 await page.goto(`/?room=${room.code}`);
 await expect(page.getByLabel('Mã phòng')).toHaveValue(room.code);
 await page.getByText('Đổi điện thoại hoặc mất phiên nhóm?').click();
 await page.getByLabel('Mã phục hồi').fill(issued.recoveryCode);
 await page.getByRole('button',{name:'Khôi phục nhóm'}).click();
 await expect(page.getByRole('alert')).toBeVisible();
 await page.reload();
 await page.getByText('Đổi điện thoại hoặc mất phiên nhóm?').click();
 await page.getByLabel('Mã phục hồi').fill(issued.recoveryCode);
 await page.getByRole('button',{name:'Khôi phục nhóm'}).click();
 await expect.poll(()=>sent.length).toBe(2);
 expect(sent[1]).toBe(sent[0]);
 await expect(page).toHaveURL(new RegExp(`/play/${room.code}$`));
 await expect(page.getByText('Chờ tín hiệu từ MC.')).toBeVisible();
});

