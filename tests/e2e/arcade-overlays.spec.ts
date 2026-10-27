import {test,expect} from '@playwright/test';
import {createArcade,joinArcade,hostArcade,arcadeOK} from '../support/arcade-independent';
test('Escape closes local settings and Tab closes local ranking without moving the player',async({page,request})=>{
 const room=await createArcade(request);const p=await joinArcade(request,room,'Người chơi bàn phím');await joinArcade(request,room,'Hai');await joinArcade(request,room,'Ba');
 await page.goto('/arcade');await page.evaluate(({code,token})=>localStorage.setItem(`cdgk:player:${code}`,token),{code:room.code,token:p.playerToken});
 await page.goto(`/arcade/play/${room.code}`);await arcadeOK(await hostArcade(request,room,'start'));await expect(page.getByTestId('arcade-world')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Cài đặt'})).toBeVisible();await page.keyboard.press('Tab');await expect(page.getByRole('dialog',{name:'Cài đặt'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.keyboard.press('Tab');await expect(page.getByRole('dialog',{name:'Bảng xếp hạng'})).toBeVisible();await page.keyboard.press('Tab');await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('unmuting after a gesture loads licensed music; settings expose separate volume controls',async({page,request})=>{
 const room=await createArcade(request);const p=await joinArcade(request,room,'Nghe nhạc');await joinArcade(request,room,'Hai');await joinArcade(request,room,'Ba');await page.goto('/arcade');await page.evaluate(({code,token})=>localStorage.setItem(`cdgk:player:${code}`,token),{code:room.code,token:p.playerToken});await page.goto(`/arcade/play/${room.code}`);await arcadeOK(await hostArcade(request,room,'start'));await expect(page.getByTestId('arcade-world')).toBeVisible();
 const music=page.waitForResponse(r=>r.url().includes('/audio/music/city-loop.'),{timeout:5000});await page.getByRole('button',{name:/âm thanh đang tắt/i}).click();expect((await music).ok()).toBe(true);
 await page.getByRole('button',{name:'Cài đặt',exact:true}).click();for(const name of ['Âm lượng tổng','Nhạc nền','Hiệu ứng'])await expect(page.getByRole('slider',{name,exact:true})).toBeVisible();
});
