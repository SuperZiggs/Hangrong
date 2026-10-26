import {test,expect} from '@playwright/test';
import {startRoom,state} from '../support/api';

test('submit sends the latest choice while an earlier autosave response is delayed',async({page,request})=>{
 const {room,teams,snapshot}=await startRoom(request),team=teams[0],task=snapshot.mission!.tasks[0];
 await page.addInitScript(({code,token})=>localStorage.setItem(`qls:team:${code}`,JSON.stringify({token,requestId:'restore'})),{code:room.code,token:team.teamToken});
 let release!:()=>void,held=false,submitted=false;
 const gate=new Promise<void>(resolve=>release=resolve);
 await page.route(`**/api/rooms/${room.code}/answer`,async route=>{const response=await route.fetch();held=true;await gate;await route.fulfill({response});});
 page.on('request',r=>{if(new URL(r.url()).pathname.endsWith('/submit'))submitted=true;});
 try{
  await page.goto(`/play/${room.code}`);
  await page.getByRole('button',{name:task.choices[0].text,exact:true}).click();
  await expect.poll(()=>held).toBe(true);
  await page.getByRole('button',{name:task.choices[1].text,exact:true}).click();
  await page.getByRole('button',{name:'Nộp bài',exact:true}).click();
  await expect.poll(()=>submitted).toBe(true);
  await expect(page.getByText('Đã nộp bài · Đáp án đã khóa')).toBeVisible();
  const saved=await state(request,room,team.teamToken);
  expect(saved.draft?.[task.id]?.choiceId).toBe(task.choices[1].id);
  expect(saved.locked).toBe(true);
 }finally{release();}
});
