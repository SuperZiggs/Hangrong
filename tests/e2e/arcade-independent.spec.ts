import { test, expect, type Page } from '@playwright/test';
import { arcadeOK, bootstrapArcade, createArcade, hostArcade, joinArcade, noArcadeSecrets, type ArcadePlayer, type ArcadeRoom } from '../support/arcade-independent';

async function lobby(page: Page) {
  const response = await page.goto('/arcade');
  expect(response?.status(), 'Missing arcade behavior: /arcade must be a rendered game lobby, not HTTP 404').toBe(200);
  await expect(page.getByRole('heading', { name: /cuộc đua giành khách/i }).first()).toBeVisible();
}

async function joinFromUI(page: Page, room: ArcadeRoom, name: string): Promise<ArcadePlayer> {
  await lobby(page);
  await page.getByLabel(/mã phòng/i).fill(room.code);
  await page.getByLabel(/tên.*(bạn|người|nhóm|hiển thị)|tên của bạn/i).fill(name);
  const joined = page.waitForResponse(response => response.url().endsWith(`/api/arcade/rooms/${room.code}/join`) && response.request().method() === 'POST');
  await page.getByRole('button', { name: /tham gia|vào phòng/i }).click();
  const response = await joined;
  expect(response.ok()).toBe(true);
  const capability = response.request().postDataJSON().playerToken;
  const data = await response.json();
  expect(capability).toMatch(/^[A-Za-z0-9_-]{43}$/);
  noArcadeSecrets(data, [capability, room.hostToken]);
  await page.waitForURL(`**/arcade/play/${room.code}`);
  expect(page.url()).not.toContain(capability);
  return { ...data, name, playerToken: capability };
}

test('E01 Vietnamese arcade lobby has accessible create/join controls and fits small screens', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await lobby(page);
  await expect(page.getByRole('button', { name: /tạo phòng/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /tham gia|vào phòng/i })).toBeVisible();
  await expect(page.getByLabel(/mã phòng/i)).toBeVisible();
  await expect(page.getByLabel(/tên.*(bạn|người|nhóm|hiển thị)|tên của bạn/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('body').innerText()).not.toMatch(/\b[0-9]+\s*\/\s*6\b/);
});

test('E02 real create/join/start/play/pause/replay flow renders a readable canvas and captures actual browser metrics', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  const hostContext = await browser.newContext({ baseURL, viewport: { width: 1366, height: 768 } });
  const playerContext = await browser.newContext({ baseURL, viewport: { width: 1366, height: 768 } });
  try {
    const host = await hostContext.newPage(); await lobby(host);
    const createResponse = host.waitForResponse(response => response.url().endsWith('/api/arcade/rooms') && response.request().method() === 'POST');
    await host.getByRole('button', { name: /tạo phòng/i }).click();
    const created = await createResponse;
    expect(created.ok()).toBe(true);
    const hostToken = created.request().postDataJSON().hostToken;
    const room: ArcadeRoom = { ...await created.json(), hostToken };
    await host.waitForURL(`**/arcade/host/${room.code}`);
    expect(host.url()).not.toContain(hostToken);
    const start = host.getByRole('button', { name: /bắt đầu/i }); await expect(start).toBeDisabled();
    const playerPage = await playerContext.newPage(); const began = Date.now();
    const player = await joinFromUI(playerPage, room, 'Minh');
    await expect(start).toBeDisabled();
    await joinArcade(hostContext.request, room, 'Nhóm Sen'); await expect(start).toBeDisabled();
    await joinArcade(hostContext.request, room, 'Minh'); await expect(start).toBeEnabled();
    await start.click();
    const world = playerPage.getByTestId('arcade-world'); await expect(world).toBeVisible();
    expect(await world.evaluate(element => element.tagName.toLowerCase())).toBe('canvas');
    for (const text of [/xu|coins?/i, /đơn/i, /phí/i, /\d{1,2}:\d{2}/, /\bE\b/, /Space|dấu cách|lướt/i]) await expect(playerPage.getByText(text).first()).toBeVisible();
    const audio = playerPage.getByRole('button', { name: /âm thanh|bật tiếng|tắt tiếng|sound|audio/i });
    await expect(audio).toBeVisible();
    expect(await audio.getAttribute('aria-label') ?? await audio.innerText()).toMatch(/tắt|mute|bật.*(?:âm thanh|tiếng)/i);
    await expect(host.getByRole('button', { name: /tạm dừng/i })).toBeVisible();
    await host.getByRole('button', { name: /tạm dừng/i }).click();
    await expect(playerPage.getByText(/tạm dừng/i).first()).toBeVisible();
    const paused = await bootstrapArcade(hostContext.request, room, player.playerToken); expect(paused.snapshot.paused).toBe(true);
    await host.getByRole('button', { name: /tiếp tục/i }).click();
    await expect.poll(async () => (await bootstrapArcade(hostContext.request, room, player.playerToken)).snapshot.paused).toBe(false);
    const previousRun = paused.snapshot.runId;
    await host.getByRole('button', { name: /chơi lại/i }).click();
    const confirmation = host.getByRole('button', { name: /xác nhận|đồng ý/i });
    if (await confirmation.count()) await confirmation.click();
    await expect.poll(async () => (await bootstrapArcade(hostContext.request, room, room.hostToken)).snapshot.runId).not.toBe(previousRun);
    await playerPage.evaluate(() => { document.documentElement.style.zoom = '1.25'; });
    await expect(world).toBeVisible(); expect(await playerPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach('arcade-playfield-1366x768-css125.png', { body: await playerPage.screenshot(), contentType: 'image/png' });
    const metrics = await playerPage.evaluate(() => ({ navigation: performance.getEntriesByType('navigation').map(entry => entry.toJSON()), paint: performance.getEntriesByType('paint').map(entry => entry.toJSON()), canvas: document.querySelector('[data-testid="arcade-world"]')?.getBoundingClientRect().toJSON() }));
    await testInfo.attach('actual-browser-render-metrics.json', { body: Buffer.from(JSON.stringify({ uiFlowToCanvasMs: Date.now() - began, zoomMethod: 'CSS zoom 1.25; native browser zoom requires separate visual QA', ...metrics })), contentType: 'application/json' });
  } finally { await playerContext.close(); await hostContext.close(); }
});

test('E03 held keys generate one E/Space edge; blur/typing stop movement and reconnect keeps identity', async ({ page, request }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  const room = await createArcade(request);
  const sent: { input?: { moveX: number; moveY: number; interactPressed: boolean; dashPressed: boolean } }[] = [];
  page.on('websocket', socket => socket.on('framesent', event => {
    try { const value = JSON.parse(event.payload.toString()); if (value.type === 'input') sent.push(value); } catch { /* Binary/control frames are not game input. */ }
  }));
  const player = await joinFromUI(page, room, 'Người thử phím');
  await joinArcade(request, room, 'Người Hai'); await joinArcade(request, room, 'Nhóm Ba'); await arcadeOK(await hostArcade(request, room, 'start'));
  const world = page.getByTestId('arcade-world'); await expect(world).toBeVisible(); await world.click();
  let start = sent.length;
  await page.keyboard.down('e'); await page.waitForTimeout(600); await page.keyboard.up('e');
  await expect.poll(() => sent.slice(start).filter(message => message.input?.interactPressed).length).toBe(1);
  start = sent.length;
  await page.keyboard.down('Space'); await page.waitForTimeout(600); await page.keyboard.up('Space');
  await expect.poll(() => sent.slice(start).filter(message => message.input?.dashPressed).length).toBe(1);
  await page.keyboard.down('d'); await page.waitForTimeout(150);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(350); start = sent.length; await page.waitForTimeout(200); await page.keyboard.up('d');
  expect(sent.slice(start).filter(message => message.input && (message.input.moveX || message.input.moveY))).toHaveLength(0);
  // Native editable focus tests the documented typing guard without inventing an app-specific modal name.
  await page.evaluate(() => { const input = document.createElement('input'); input.setAttribute('aria-label', 'Acceptance editable focus'); document.body.appendChild(input); input.focus(); });
  start = sent.length; await page.keyboard.type('wasd e '); await page.waitForTimeout(250);
  expect(sent.slice(start).filter(message => message.input && (message.input.moveX || message.input.moveY || message.input.interactPressed || message.input.dashPressed))).toHaveLength(0);
  const before = await bootstrapArcade(request, room, player.playerToken);
  await page.reload(); await expect(world).toBeVisible();
  const after = await bootstrapArcade(request, room, player.playerToken);
  expect(after.you?.playerId).toBe(before.you?.playerId); expect(Object.keys(after.snapshot.players)).toHaveLength(3);
  expect(after.snapshot.players[player.playerId].coins).toBe(before.snapshot.players[player.playerId].coins);
  expect(after.snapshot.players[player.playerId].carriedOrderId).toBe(before.snapshot.players[player.playerId].carriedOrderId);
  expect(page.url()).not.toContain(player.playerToken);
});
