import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { auth, state, type Room, type Team } from '../support/api';
import { joinEntrant } from '../support/flexible';

const nameField = (page: Page) => page.getByLabel(/tên hiển thị|tên.*người|tên cá nhân|tên bạn|tên.*nhóm/i);
const oldPositionField = (page: Page) => page.getByLabel(/vị trí nhóm|số nhóm|chọn nhóm/i);

test('flexible phone form: 360px solo/group display name and code only, no fixed position selection', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await expect(page.getByLabel(/mã phòng/i)).toBeVisible();
  await expect(oldPositionField(page)).toHaveCount(0);
  await expect(nameField(page)).toBeVisible();
  await expect(page.getByText(/cá nhân|một mình|một người|người chơi|tên hiển thị|tên bạn/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /vào phòng|tham gia/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('flexible lobby: solo/groups coexist, three are required, seventh entrant appears and refresh never duplicates', async ({ browser, baseURL }) => {
  test.setTimeout(120_000);
  const contexts: BrowserContext[] = [];
  try {
    const hostContext = await browser.newContext({ baseURL, viewport: { width: 1200, height: 850 } });
    contexts.push(hostContext);
    const host = await hostContext.newPage();
    await host.goto('/');
    let created: Room | undefined;
    await host.route('**/api/rooms', async route => {
      const response = await route.fetch();
      created = { ...await response.json(), hostToken: route.request().postDataJSON().hostToken };
      await route.fulfill({ response });
    });
    await host.getByRole('button', { name: /tạo phòng/i }).click();
    await expect.poll(() => created?.code).toMatch(/^\d{6}$/);
    const room = created!;
    await host.waitForURL(new URL(room.hostPath, baseURL).href, { waitUntil: 'domcontentloaded' });
    const start = host.getByRole('button', { name: /bắt đầu/i });
    await expect(start).toBeDisabled();
    expect(await host.locator('body').innerText()).not.toMatch(/\b\d+\s*\/\s*6\b|sáu góc nhìn|6 góc nhìn/i);
    expect(await host.locator('body').innerText()).not.toMatch(/Vị trí nhóm [1-6]|Đang chờ đồng đội/i);
    const phones: { page: Page; team: Team }[] = [];
    for (const name of ['Minh', 'Nhóm Sen', 'Minh']) {
      const context = await browser.newContext({ baseURL, viewport: { width: 360, height: 800 } });
      contexts.push(context);
      const page = await context.newPage();
      await page.goto('/');
      await expect(oldPositionField(page)).toHaveCount(0);
      await page.getByLabel(/mã phòng/i).fill(room.code);
      await nameField(page).fill(name);
      let joined: Team | undefined;
      await page.route(`**/api/rooms/${room.code}/join`, async route => {
        const data = route.request().postDataJSON();
        expect(data).not.toHaveProperty('slot');
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        joined = { ...await response.json(), name, teamToken: data.teamToken };
        await route.fulfill({ response });
      });
      await page.getByRole('button', { name: /vào phòng|tham gia/i }).click();
      await expect.poll(() => joined?.teamId).toBeTruthy();
      await page.waitForURL(new URL(joined!.playPath, baseURL).href, { waitUntil: 'domcontentloaded' });
      phones.push({ page, team: joined! });
      if (phones.length < 3) await expect(start).toBeDisabled();
    }
    await expect(start).toBeEnabled();
    expect(new Set(phones.map(phone => phone.team.teamId)).size).toBe(3);
    const extras = await Promise.all(Array.from({ length: 4 }, (_, index) => joinEntrant(hostContext.request, room, `Bổ sung ${index + 1}`)));
    await expect(host.getByText(extras[3].name, { exact: true }).first()).toBeVisible();
    await expect.poll(async () => (await state(hostContext.request, room, room.hostToken)).teams.length).toBe(7);
    expect(await host.locator('body').innerText()).not.toMatch(/\b\d+\s*\/\s*6\b/);
    const phone = phones[0];
    await phone.page.reload();
    await expect.poll(async () => (await state(hostContext.request, room, room.hostToken)).teams.length).toBe(7);
    const restored = await phone.page.request.get(`/api/rooms/${room.code}/state`, { headers: auth(phone.team.teamToken) });
    expect(await restored.json()).toMatchObject({ role: 'team', you: { teamId: phone.team.teamId, name: 'Minh' } });
    await start.click();
    await expect.poll(async () => Boolean((await state(hostContext.request, room, phone.team.teamToken)).mission)).toBe(true);
    const mission = (await state(hostContext.request, room, phone.team.teamToken)).mission!;
    await expect(phone.page.getByText(mission.title, { exact: true }).first()).toBeVisible();
    expect(await phone.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally {
    for (const context of contexts) await context.close();
  }
});
