# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\acceptance.spec.ts >> classroom journey: one host and six isolated phones join, save, refresh and report offline honestly
- Location: tests\e2e\acceptance.spec.ts:43:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /tạo phòng/i })
Expected: visible
Timeout: 7000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: /tạo phòng/i }) with timeout 7000ms
  - waiting for getByRole('button', { name: /tạo phòng/i })

```

```yaml
- main:
  - status:
    - paragraph: Building your site
    - heading "Your site is taking shape" [level=1]
    - paragraph: Your first version will appear here automatically when it’s ready.
```

# Test source

```ts
  1   | import { test, expect, type BrowserContext, type Locator, type Page } from '@playwright/test';
  2   | import { assertNoKeys, assertNoSecrets, auth, state, type Mission, type Room, type Team } from '../support/api';
  3   | 
  4   | const codeInput = (page: Page) => page.getByLabel(/mã phòng/i);
  5   | const slotInput = (page: Page) => page.getByLabel(/vị trí nhóm|số nhóm|chọn nhóm/i);
  6   | const nameInput = (page: Page) => page.getByLabel(/tên nhóm/i);
  7   | const joinButton = (page: Page) => page.getByRole('button', { name: /vào phòng|tham gia/i });
  8   | const createButton = (page: Page) => page.getByRole('button', { name: /tạo phòng/i });
  9   | const choiceControl = (page: Page, text: string) => page.getByRole('button', { name: text, exact: true }).or(page.getByRole('radio', { name: text, exact: true })).first();
  10  | 
  11  | async function assertNoOverflow(page: Page) {
  12  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  13  | }
  14  | 
  15  | async function assertSelected(control: Locator) {
  16  |   await expect.poll(async () => control.evaluate(element =>
  17  |     element.getAttribute('aria-pressed') === 'true' ||
  18  |     element.getAttribute('aria-checked') === 'true' ||
  19  |     (element instanceof HTMLInputElement && element.checked),
  20  |   )).toBeTruthy();
  21  | }
  22  | 
  23  | async function localHasToken(page: Page, capability: string) {
  24  |   return page.evaluate(value => Object.values(localStorage).some(serialized => serialized.includes(value)), capability);
  25  | }
  26  | 
  27  | test('landing: accessible Vietnamese room form works at 360px with keyboard focus', async ({ page }) => {
  28  |   await page.setViewportSize({ width: 360, height: 800 });
  29  |   await page.emulateMedia({ reducedMotion: 'reduce' });
  30  |   await page.goto('/');
  31  |   await expect(codeInput(page)).toBeVisible();
  32  |   await expect(slotInput(page)).toBeVisible();
  33  |   await expect(nameInput(page)).toBeVisible();
  34  |   await expect(joinButton(page)).toBeVisible();
  35  |   await expect(createButton(page)).toBeVisible();
  36  |   await assertNoOverflow(page);
  37  |   await codeInput(page).focus();
  38  |   await expect(codeInput(page)).toBeFocused();
  39  |   await page.keyboard.press('Tab');
  40  |   expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  41  | });
  42  | 
  43  | test('classroom journey: one host and six isolated phones join, save, refresh and report offline honestly', async ({ browser, baseURL }) => {
  44  |   test.setTimeout(120_000);
  45  |   const contexts: BrowserContext[] = [];
  46  |   try {
  47  |     const hostContext = await browser.newContext({ baseURL, viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  48  |     contexts.push(hostContext);
  49  |     const hostPage = await hostContext.newPage();
  50  |     await hostPage.goto('/');
  51  |     // Assert the required control before arming request waits, so a missing UI cannot leave orphan promises.
> 52  |     await expect(createButton(hostPage)).toBeVisible();
      |                                          ^ Error: expect(locator).toBeVisible() failed
  53  |     const createRequest = hostPage.waitForRequest(request => request.method() === 'POST' && /\/api\/rooms$/.test(new URL(request.url()).pathname));
  54  |     const createResponse = hostPage.waitForResponse(response => response.request().method() === 'POST' && /\/api\/rooms$/.test(new URL(response.url()).pathname));
  55  |     await createButton(hostPage).click();
  56  |     const created = await createResponse;
  57  |     expect(created.ok()).toBeTruthy();
  58  |     const creation = (await createRequest).postDataJSON();
  59  |     expect(creation.hostToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  60  |     expect(await localHasToken(hostPage, creation.hostToken)).toBeTruthy();
  61  |     const room: Room = { ...await created.json(), hostToken: creation.hostToken };
  62  |     await expect(hostPage.getByText(room.code, { exact: true }).first()).toBeVisible();
  63  |     await expect(hostPage.locator('svg,img,canvas').filter({ visible: true }).first()).toBeVisible();
  64  |     expect(hostPage.url()).not.toContain(room.hostToken);
  65  | 
  66  |     const phones: { context: BrowserContext; page: Page; team: Team }[] = [];
  67  |     for (let slot = 1; slot <= 6; slot++) {
  68  |       const context = await browser.newContext({ baseURL, viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
  69  |       contexts.push(context);
  70  |       const page = await context.newPage();
  71  |       await page.goto('/');
  72  |       await codeInput(page).fill(room.code);
  73  |       const slotField = slotInput(page);
  74  |       if (await slotField.evaluate(element => element.tagName === 'SELECT')) await slotField.selectOption(String(slot));
  75  |       else await slotField.fill(String(slot));
  76  |       await nameInput(page).fill(`Nhóm ${slot}`);
  77  |       const joining = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/rooms/${room.code}/join`);
  78  |       await joinButton(page).click();
  79  |       const response = await joining;
  80  |       expect(response.ok()).toBeTruthy();
  81  |       const posted = response.request().postDataJSON();
  82  |       expect(posted.teamToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  83  |       expect(await localHasToken(page, posted.teamToken)).toBeTruthy();
  84  |       const team: Team = { ...await response.json(), name: `Nhóm ${slot}`, teamToken: posted.teamToken };
  85  |       phones.push({ context, page, team });
  86  |       expect(page.url()).not.toContain(team.teamToken);
  87  |       await assertNoOverflow(page);
  88  |     }
  89  |     expect(new Set(phones.map(phone => phone.team.teamToken)).size).toBe(6);
  90  |     await expect.poll(async () => (await state(hostContext.request, room, room.hostToken)).teams.length).toBe(6);
  91  |     for (const phone of phones) await expect(hostPage.getByText(phone.team.name, { exact: true }).first()).toBeVisible();
  92  |     await hostPage.getByRole('button', { name: /bắt đầu/i }).click();
  93  | 
  94  |     const missions: Mission[] = [];
  95  |     for (const phone of phones) {
  96  |       await expect.poll(async () => Boolean((await state(phone.context.request, room, phone.team.teamToken)).mission)).toBeTruthy();
  97  |       const snapshot = await state(phone.context.request, room, phone.team.teamToken);
  98  |       const mission = snapshot.mission!;
  99  |       missions.push(mission);
  100 |       await expect(phone.page.getByText(mission.title, { exact: true }).first()).toBeVisible();
  101 |       await expect(phone.page.getByText(mission.tasks[0].prompt, { exact: true }).first()).toBeVisible();
  102 |       assertNoKeys(snapshot);
  103 |       assertNoSecrets(snapshot, [room.hostToken, ...phones.map(other => other.team.teamToken)]);
  104 |       for (const task of mission.tasks) for (const choice of task.choices) {
  105 |         const control = choiceControl(phone.page, choice.text);
  106 |         await expect(control).toBeVisible();
  107 |         const box = await control.boundingBox();
  108 |         expect(box?.height).toBeGreaterThanOrEqual(44);
  109 |         expect(box?.width).toBeGreaterThanOrEqual(44);
  110 |       }
  111 |       await assertNoOverflow(phone.page);
  112 |     }
  113 |     expect(new Set(missions.map(mission => mission.id)).size).toBe(6);
  114 | 
  115 |     const phone = phones[0];
  116 |     const task = missions[0].tasks[0];
  117 |     const firstChoice = choiceControl(phone.page, task.choices[0].text);
  118 |     await firstChoice.focus();
  119 |     await expect(firstChoice).toBeFocused();
  120 |     await phone.page.keyboard.press('Space');
  121 |     await assertSelected(firstChoice);
  122 |     await expect.poll(async () => (await state(phone.context.request, room, phone.team.teamToken)).draft?.[task.id]?.choiceId).toBe(task.choices[0].id);
  123 |     await expect(phone.page.getByText(/đã lưu|đã đồng bộ/i).first()).toBeVisible();
  124 |     await phone.page.reload();
  125 |     await expect(phone.page.getByText(missions[0].title, { exact: true }).first()).toBeVisible();
  126 |     await assertSelected(choiceControl(phone.page, task.choices[0].text));
  127 | 
  128 |     await phone.context.setOffline(true);
  129 |     await choiceControl(phone.page, task.choices[1].text).click();
  130 |     await expect(phone.page.getByText(/ngoại tuyến|mất kết nối|chưa lưu|chờ kết nối/i).first()).toBeVisible();
  131 |     await expect(phone.page.getByText(/đã lưu|đã đồng bộ/i)).toHaveCount(0);
  132 |     await phone.context.setOffline(false);
  133 |     // Reconnected pending work may retry automatically or remain explicit unsaved work. It must be recoverable.
  134 |     await expect(phone.page.getByText(missions[0].title, { exact: true }).first()).toBeVisible();
  135 |     await choiceControl(phone.page, task.choices[1].text).click();
  136 |     await expect.poll(async () => (await state(phone.context.request, room, phone.team.teamToken)).draft?.[task.id]?.choiceId).toBe(task.choices[1].id);
  137 | 
  138 |     const submitted = phone.page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/rooms/${room.code}/submit`);
  139 |     await phone.page.getByRole('button', { name: /nộp bài|nộp đáp án/i }).click();
  140 |     expect((await submitted).ok()).toBeTruthy();
  141 |     await expect(phone.page.getByText(/đã nộp|đã khóa|đã khoá/i).first()).toBeVisible();
  142 |     await expect.poll(async () => (await state(hostContext.request, room, room.hostToken)).teams.filter(team => team.submitted).length).toBe(1);
  143 |     await expect(hostPage.getByText(/1\s*\/\s*6|1 trên 6/i).first()).toBeVisible();
  144 |     await expect(hostPage.getByRole('button', { name: /tạm dừng/i })).toBeVisible();
  145 |     await phone.page.reload();
  146 |     await expect(phone.page.getByText(/đã nộp|đã khóa|đã khoá/i).first()).toBeVisible();
  147 |     expect(phone.page.url()).not.toContain(phone.team.teamToken);
  148 |     await assertNoOverflow(phone.page);
  149 |     // The public join URL/QR destination never carries the host capability.
  150 |     expect(room.joinPath).not.toContain(room.hostToken);
  151 |     const publicReply = await hostContext.request.get(`/api/rooms/${room.code}/state`);
  152 |     assertNoSecrets(await publicReply.json(), [room.hostToken, ...phones.map(other => other.team.teamToken)]);
```