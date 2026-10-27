import { test, expect, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { assertNoKeys, assertNoSecrets, auth, state, type Mission, type Room, type Team } from '../support/api';

const codeInput = (page: Page) => page.getByLabel(/mã phòng/i);
const slotInput = (page: Page) => page.getByLabel(/vị trí nhóm|số nhóm|chọn nhóm/i);
const nameInput = (page: Page) => page.getByLabel(/tên hiển thị|tên.*người|tên cá nhân|tên bạn|tên.*nhóm/i);
const joinButton = (page: Page) => page.getByRole('button', { name: /vào phòng|tham gia/i });
const createButton = (page: Page) => page.getByRole('button', { name: /tạo phòng/i });
const choiceControl = (page: Page, text: string) => page.getByRole('button', { name: text, exact: true }).or(page.getByRole('radio', { name: text, exact: true })).first();

async function assertNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
}

async function assertSelected(control: Locator) {
  await expect.poll(async () => control.evaluate(element =>
    element.getAttribute('aria-pressed') === 'true' ||
    element.getAttribute('aria-checked') === 'true' ||
    (element instanceof HTMLInputElement && element.checked),
  )).toBeTruthy();
}

async function localHasToken(page: Page, capability: string) {
  return page.evaluate(value => Object.values(localStorage).some(serialized => serialized.includes(value)), capability);
}

test('landing: accessible Vietnamese room form works at 360px with keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(codeInput(page)).toBeVisible();
  await expect(slotInput(page)).toHaveCount(0);
  await expect(nameInput(page)).toBeVisible();
  await expect(joinButton(page)).toBeVisible();
  await expect(createButton(page)).toBeVisible();
  await assertNoOverflow(page);
  await expect(codeInput(page)).toBeEnabled();
  await codeInput(page).focus();
  await expect(codeInput(page)).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
});

test('classroom journey: one host and six isolated phones join, save, refresh and report offline honestly', async ({ browser, baseURL }) => {
  test.setTimeout(120_000);
  const contexts: BrowserContext[] = [];
  try {
    const hostContext = await browser.newContext({ baseURL, viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
    contexts.push(hostContext);
    const hostPage = await hostContext.newPage();
    await hostPage.goto('/');
    // Assert the required control before arming request waits, so a missing UI cannot leave orphan promises.
    await expect(createButton(hostPage)).toBeVisible();
    // Transparently record the real server reply before delivery: Chrome discards fetch bodies on full navigation.
    let createJson: Omit<Room, 'hostToken'> | undefined;
    await hostPage.route('**/api/rooms', async route => {
      const response = await route.fetch();
      createJson = await response.json();
      await route.fulfill({ response });
    });
    const createRequest = hostPage.waitForRequest(request => request.method() === 'POST' && /\/api\/rooms$/.test(new URL(request.url()).pathname));
    const createResponse = hostPage.waitForResponse(response => response.request().method() === 'POST' && /\/api\/rooms$/.test(new URL(response.url()).pathname))
      .then(response => ({ ok: response.ok(), body: createJson }));
    await createButton(hostPage).click();
    const created = await createResponse;
    expect(created.ok).toBeTruthy();
    const creation = (await createRequest).postDataJSON();
    expect(creation.hostToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(created.body).toBeDefined();
    const room: Room = { ...created.body!, hostToken: creation.hostToken };
    // A successful create may navigate immediately; inspect storage only in the destination document.
    await hostPage.waitForURL(new URL(room.hostPath, baseURL).href, { waitUntil: 'domcontentloaded' });
    expect(await localHasToken(hostPage, creation.hostToken)).toBeTruthy();
    await expect(hostPage.getByText(room.code, { exact: true }).first()).toBeVisible();
    await expect(hostPage.getByRole('img', { name: /QR/i }).or(hostPage.getByLabel(/QR/i)).first()).toBeVisible();
    expect(hostPage.url()).not.toContain(room.hostToken);

    const phones: { context: BrowserContext; page: Page; team: Team }[] = [];
    for (let slot = 1; slot <= 6; slot++) {
      const context = await browser.newContext({ baseURL, viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
      contexts.push(context);
      const page = await context.newPage();
      await page.goto('/');
      await codeInput(page).fill(room.code);
      await expect(slotInput(page)).toHaveCount(0);
      await nameInput(page).fill(`Nhóm ${slot}`);
      let joinJson: Omit<Team, 'teamToken' | 'name'> | undefined;
      await page.route(`**/api/rooms/${room.code}/join`, async route => {
        const response = await route.fetch();
        joinJson = await response.json();
        await route.fulfill({ response });
      });
      const joining = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/rooms/${room.code}/join`)
        .then(response => ({ ok: response.ok(), posted: response.request().postDataJSON(), body: joinJson }));
      await joinButton(page).click();
      const response = await joining;
      expect(response.ok).toBeTruthy();
      const posted = response.posted;
      expect(posted.teamToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(response.body).toBeDefined();
      const team: Team = { ...response.body!, name: `Nhóm ${slot}`, teamToken: posted.teamToken };
      await page.waitForURL(new URL(team.playPath, baseURL).href, { waitUntil: 'domcontentloaded' });
      expect(await localHasToken(page, posted.teamToken)).toBeTruthy();
      phones.push({ context, page, team });
      expect(page.url()).not.toContain(team.teamToken);
      await assertNoOverflow(page);
    }
    expect(new Set(phones.map(phone => phone.team.teamToken)).size).toBe(6);
    await expect.poll(async () => (await state(hostContext.request, room, room.hostToken)).teams.length).toBe(6);
    for (const phone of phones) await expect(hostPage.getByText(phone.team.name, { exact: true }).first()).toBeVisible();
    await hostPage.getByRole('button', { name: /bắt đầu/i }).click();

    const missions: Mission[] = [];
    for (const phone of phones) {
      await expect.poll(async () => Boolean((await state(phone.context.request, room, phone.team.teamToken)).mission)).toBeTruthy();
      const snapshot = await state(phone.context.request, room, phone.team.teamToken);
      const mission = snapshot.mission!;
      missions.push(mission);
      await expect(phone.page.getByText(mission.title, { exact: true }).first()).toBeVisible();
      await expect(phone.page.getByText(mission.tasks[0].prompt, { exact: true }).first()).toBeVisible();
      assertNoKeys(snapshot);
      assertNoSecrets(snapshot, [room.hostToken, ...phones.map(other => other.team.teamToken)]);
      for (const task of mission.tasks) for (const choice of task.choices) {
        const control = choiceControl(phone.page, choice.text);
        await expect(control).toBeVisible();
        const box = await control.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
        expect(box?.width).toBeGreaterThanOrEqual(44);
      }
      await assertNoOverflow(phone.page);
    }
    expect(new Set(missions.map(mission => mission.id)).size).toBe(6);

    const phone = phones[0];
    const task = missions[0].tasks[0];
    const firstChoice = choiceControl(phone.page, task.choices[0].text);
    await firstChoice.focus();
    await expect(firstChoice).toBeFocused();
    await phone.page.keyboard.press('Space');
    await assertSelected(firstChoice);
    await expect.poll(async () => (await state(phone.context.request, room, phone.team.teamToken)).draft?.[task.id]?.choiceId).toBe(task.choices[0].id);
    await expect(phone.page.getByText(/đã lưu|đã đồng bộ/i).first()).toBeVisible();
    await phone.page.reload();
    await expect(phone.page.getByText(missions[0].title, { exact: true }).first()).toBeVisible();
    await assertSelected(choiceControl(phone.page, task.choices[0].text));

    await phone.context.setOffline(true);
    await choiceControl(phone.page, task.choices[1].text).click();
    await expect(phone.page.getByText(/ngoại tuyến|mất kết nối|chưa lưu|chờ kết nối/i).first()).toBeVisible();
    await expect(phone.page.getByText(/đã lưu|đã đồng bộ/i)).toHaveCount(0);
    await phone.context.setOffline(false);
    // Reconnected pending work may retry automatically or remain explicit unsaved work. It must be recoverable.
    await expect(phone.page.getByText(missions[0].title, { exact: true }).first()).toBeVisible();
    await choiceControl(phone.page, task.choices[1].text).click();
    await expect.poll(async () => (await state(phone.context.request, room, phone.team.teamToken)).draft?.[task.id]?.choiceId).toBe(task.choices[1].id);

    const submitted = phone.page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/rooms/${room.code}/submit`);
    await phone.page.getByRole('button', { name: /nộp bài|nộp đáp án/i }).click();
    expect((await submitted).ok()).toBeTruthy();
    await expect(phone.page.getByText(/đã nộp|đã khóa|đã khoá/i).first()).toBeVisible();
    await expect.poll(async () => (await state(hostContext.request, room, room.hostToken)).teams.filter(team => team.submitted).length).toBe(1);
    await expect(hostPage.getByText(/1\s*\/\s*6|1 trên 6/i).first()).toBeVisible();
    await expect(hostPage.getByRole('button', { name: /tạm dừng/i })).toBeVisible();
    await phone.page.reload();
    await expect(phone.page.getByText(/đã nộp|đã khóa|đã khoá/i).first()).toBeVisible();
    expect(phone.page.url()).not.toContain(phone.team.teamToken);
    await assertNoOverflow(phone.page);
    // The public join URL/QR destination never carries the host capability.
    expect(room.joinPath).not.toContain(room.hostToken);
    const publicReply = await hostContext.request.get(`/api/rooms/${room.code}/state`);
    assertNoSecrets(await publicReply.json(), [room.hostToken, ...phones.map(other => other.team.teamToken)]);
    const ownReply = await phone.context.request.get(`/api/rooms/${room.code}/state`, { headers: auth(phone.team.teamToken) });
    expect((await ownReply.json()).role).toBe('team');
  } finally {
    for (const context of contexts) await context.close();
  }
});
