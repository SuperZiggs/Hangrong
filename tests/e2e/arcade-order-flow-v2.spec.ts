import { test, expect, type Page } from '@playwright/test';
import { arcadeOK, bootstrapArcade, createArcade, hostArcade, joinArcade } from '../support/arcade-independent';
import { createWorld } from '../../shared/arcade/world';
import { projectSnapshot } from '../../shared/arcade/snapshot';
import type { Order } from '../../shared/arcade/types';

// Observe real text drawing, including Phaser text surfaces. This does not
// alter game state/clock or require production globals or testing endpoints.
async function observeCanvasText(page: Page) {
  await page.addInitScript(() => {
    const readback = window as typeof window & { __acceptanceCanvasText?: string[] };
    readback.__acceptanceCanvasText = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof original>) {
      readback.__acceptanceCanvasText!.push(String(args[0]));
      if (readback.__acceptanceCanvasText!.length > 4000) readback.__acceptanceCanvasText!.splice(0, 1000);
      return original.apply(this, args);
    };
  });
}
async function visibleText(page: Page) {
  return page.evaluate(() => `${document.body.innerText}\n${(window as typeof window & { __acceptanceCanvasText?: string[] }).__acceptanceCanvasText?.join('\n') ?? ''}`);
}

test('V2-E01 R1/R7 actual keyboard pickup exposes an ordinary cooldown and keeps local overlays usable', async ({ page, request }, info) => {
  test.setTimeout(60_000); await observeCanvasText(page);
  const room = await createArcade(request), player = await joinArcade(request, room, 'Người chơi bàn phím');
  await joinArcade(request, room, 'Nhóm Hai'); await joinArcade(request, room, 'Nhóm Ba');
  await page.goto('/arcade'); await page.evaluate(({ code, token }) => localStorage.setItem(`cdgk:player:${code}`, token), { code: room.code, token: player.playerToken });
  await page.goto(`/arcade/play/${room.code}`); await arcadeOK(await hostArcade(request, room, 'start'));
  const world = page.getByTestId('arcade-world'); await expect(world).toBeVisible(); await expect(world).toHaveAttribute('data-ready', 'true');
  await expect.poll(async () => Object.keys((await bootstrapArcade(request, room, player.playerToken)).snapshot.orders).length).toBeGreaterThan(0);
  // Opening spawn is 120 units directly above this player's ordinary parcel.
  // Ordinary keyboard movement, then a single E edge, covers the real client.
  await page.keyboard.down('s'); await page.waitForTimeout(400); await page.keyboard.up('s'); await page.waitForTimeout(100); await page.keyboard.press('e');
  await expect.poll(async () => (await bootstrapArcade(request, room, player.playerToken)).snapshot.players[player.playerId].carriedOrderId).not.toBeNull();
  try {
    await expect.poll(() => visibleText(page), { timeout: 3000 }).toMatch(/\b4[0-5]\s*(?:s\b|giây)/i);
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog', { name: 'Cài đặt' })).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.keyboard.press('Tab'); await expect(page.getByRole('dialog', { name: 'Bảng xếp hạng' })).toBeVisible();
    await page.keyboard.press('Tab'); await expect(page.getByRole('dialog')).toHaveCount(0);
  } finally {
    await info.attach('real-keyboard-order-cooldown.png', { body: await page.screenshot(), contentType: 'image/png' });
    await arcadeOK(await hostArcade(request, room, 'pause'));
  }
});

test('V2-E02 R7 actual shell renders both private parcels, each net amount and separate waiting stock', async ({ page }, info) => {
  // Component/browser boundary: only network responses are fixtures. The actual
  // ArcadeShell, input, HUD, Phaser scene and bundled assets execute in Chrome.
  await observeCanvasText(page);
  const w = createWorld({ seed: 'v2-ui-fixture', initialCoins: 100, roster: ['p1', 'p2', 'p3'].map(playerId => ({ playerId, name: playerId })) });
  w.elapsedMs = 200_000; w.phase = 'stage2'; w.gateFee = 9; w.players.p1.privateChannel = true;
  const make = (id: string, changes: Partial<Order>): Order => ({ id, pickup: { x: 200, y: 320 }, delivery: { x: 900, y: 1000 }, value: 8, ownerId: null, privateOwnerId: null, lockedFee: null, settled: false, source: 'common', ...changes });
  const a = make('ui-private-cargo-a', { ownerId: 'p1', privateOwnerId: 'p1', lockedFee: 2, source: 'private' });
  const b = make('ui-private-cargo-b', { ownerId: 'p1', privateOwnerId: 'p1', lockedFee: 4, source: 'private' });
  const waiting = make('ui-private-waiting', { privateOwnerId: 'p1', source: 'private' });
  const common = make('ui-ordinary', { value: 10, source: 'common' });
  const promotion = make('ui-promotion', { value: 10, source: 'promotion', pickup: { x: 300, y: 320 } });
  w.orders = Object.fromEntries([a, b, waiting, common, promotion].map(o => [o.id, o])); w.players.p1.carriedOrderId = a.id;
  const snapshot = projectSnapshot(w, { role: 'player', playerId: 'p1' }), code = 'V2UIAAAA';
  await page.route(`**/api/arcade/rooms/${code}/bootstrap`, route => route.fulfill({ json: { role: 'player', wsUrl: 'ws://127.0.0.1:5187/acceptance-order-flow-v2-socket', snapshot, you: { playerId: 'p1', name: 'p1' } } }));
  await page.routeWebSocket('**/acceptance-order-flow-v2-socket', socket => { socket.onMessage(() => socket.send(JSON.stringify({ type: 'snapshot', snapshot }))); });
  await page.goto('/arcade'); await page.evaluate(code => localStorage.setItem(`cdgk:player:${code}`, 'A'.repeat(43)), code);
  await page.goto(`/arcade/play/${code}`); const world = page.getByTestId('arcade-world'); await expect(world).toBeVisible(); await expect(world).toHaveAttribute('data-ready', 'true');
  try {
    await expect.poll(() => visibleText(page)).toMatch(/6\s*xu/i);
    await expect.poll(() => visibleText(page), { message: 'R7: the second parcel must show its own 4-xu net proceeds' }).toMatch(/4\s*xu/i);
    const text = await visibleText(page);
    expect(text, 'R7: visible two-parcel cargo count').toMatch(/(?:mang|kiện|đơn)[^\n]{0,30}2|2[^\n]{0,30}(?:kiện|đơn)/i);
    expect(text, 'R7: one waiting private parcel is separate from two carried parcels').toMatch(/(?:chờ|tồn)[^\n]{0,40}1|1[^\n]{0,40}(?:chờ|tồn)/i);
    expect(text, 'R7: ordinary parcel type is visible').toMatch(/thường|công khai/i);
    expect(text, 'R7: promotion parcel type is visible').toMatch(/khuyến mãi|khuyến mại/i);
    expect(text, 'R7: private parcel type is visible').toMatch(/riêng/i);
  } finally { await info.attach('authorized-two-private-cargo-ui.png', { body: await page.screenshot(), contentType: 'image/png' }); }
});
