import { test, expect, type APIRequestContext } from '@playwright/test';
import { cpSync, mkdirSync } from 'node:fs';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { arcadeToken, inputFrame, openArcadeSocket, sleep, type ArcadeSocket } from '../support/arcade-independent';
import type { Order, Point, PublicSnapshot } from '../../shared/arcade/types';

test.describe('independent order-flow v2 real Worker boundary', () => {
  test.setTimeout(110_000);
  const base = 'http://127.0.0.1:5193', origin = 'http://127.0.0.1:5187';
  const ownedRoot = resolve('work', `order-flow-v2-worker-${randomUUID()}`);
  let api: APIRequestContext, runtime: ChildProcess | undefined, logs = '';
  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: base });
    let occupied = false; try { await api.get('/health', { timeout: 500 }); occupied = true; } catch { /* Port must be free. */ }
    expect(occupied, 'Dedicated 5193 must be free; never stop another process').toBe(false);
    // Copy ordinary production sources once, so editing while this test runs
    // cannot hot-reload its runtime. RED can select a pre-change source copy.
    mkdirSync(ownedRoot, { recursive: true });
    const source = process.env.ORDER_FLOW_V2_WORKER_SOURCE ?? process.cwd();
    for (const dir of ['shared', 'realtime']) cpSync(resolve(source, dir), resolve(ownedRoot, dir), { recursive: true });
    runtime = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--local', '--config', resolve(ownedRoot, 'realtime/wrangler.jsonc'), '--persist-to', resolve(ownedRoot, 'state'), '--port', '5193', '--ip', '127.0.0.1', '--inspector-port', '0'], {
      cwd: process.cwd(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, XDG_CONFIG_HOME: resolve(ownedRoot, 'config'), WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG_PATH: resolve(ownedRoot, 'wrangler.log') },
    });
    runtime.stdout?.on('data', chunk => { logs += String(chunk); }); runtime.stderr?.on('data', chunk => { logs += String(chunk); });
    await expect.poll(async () => {
      if (runtime?.exitCode !== null) throw new Error(logs.slice(-2000));
      try { return (await api.get('/health', { timeout: 1000 })).status(); } catch { return 0; }
    }, { timeout: 35_000, intervals: [250, 500] }).toBe(200);
  });
  test.afterAll(async () => {
    if (runtime?.pid && runtime.exitCode === null) {
      if (process.platform === 'win32') {
        const result = spawnSync('taskkill.exe', ['/PID', String(runtime.pid), '/T', '/F'], { windowsHide: true, encoding: 'utf8' });
        expect(result.status, result.stderr || result.stdout).toBe(0);
      } else runtime.kill('SIGTERM');
    }
    await api?.dispose();
  });

  test('V2-A01 R1/R8 legal pickup has a 45s same-point refill, frozen pause and preserved cargo on reconnect', async ({}, info) => {
    const hostToken = arcadeToken();
    const created = await api.post('/rooms', { data: { requestId: randomUUID(), hostToken } }); expect(created.ok()).toBe(true);
    const { code } = await created.json();
    const players: { playerId: string; token: string }[] = [];
    for (const name of ['Vận chuyển', 'Nhóm Hai', 'Nhóm Ba']) {
      const token = arcadeToken(), r = await api.post(`/rooms/${code}/join`, { data: { requestId: randomUUID(), playerToken: token, name } });
      expect(r.ok()).toBe(true); players.push({ ...await r.json(), token });
    }
    async function command(action: string) {
      const r = await api.post(`/rooms/${code}/host`, { headers: { Authorization: `Bearer ${hostToken}` }, data: { requestId: randomUUID(), action } }); expect(r.ok()).toBe(true);
    }
    async function view(token = players[0].token) {
      const r = await api.get(`/rooms/${code}/bootstrap`, { headers: { Authorization: `Bearer ${token}` } }); expect(r.ok()).toBe(true);
      return await r.json() as { snapshot: PublicSnapshot; wsUrl: string };
    }
    await command('start'); const initial = await view(), id = players[0].playerId;
    let socket: ArcadeSocket = await openArcadeSocket(initial.wsUrl, players[0].token, { origin }), seq = 0;
    const send = (changes: Record<string, unknown> = {}) => socket.send({ type: 'input', input: inputFrame(initial.snapshot.runId, ++seq, changes) });
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const observations: unknown[] = [];
    try {
      await socket.next();
      await expect.poll(async () => Object.keys((await view()).snapshot.orders).length).toBeGreaterThan(0);
      let current = (await view()).snapshot;
      const target = Object.values(current.orders).find(o => !o.privateOwnerId && (!o.source || o.source === 'common'))!;
      expect(target).toBeTruthy(); const pickup = target.pickup;
      const distance = (p: Point) => Math.hypot(p.x - pickup.x, p.y - pickup.y);
      const began = Date.now();
      while (distance(current.players[id]) > 30 && Date.now() - began < 5000) {
        const p = current.players[id];
        send({ moveX: Math.abs(p.x - pickup.x) > 15 ? Math.sign(pickup.x - p.x) : 0, moveY: Math.abs(p.y - pickup.y) > 15 ? Math.sign(pickup.y - p.y) : 0 });
        await sleep(70); current = (await view()).snapshot;
      }
      expect(distance(current.players[id]), 'Player must reach parcel using legal movement only').toBeLessThanOrEqual(42);
      send({ interactPressed: true });
      await expect.poll(async () => (await view()).snapshot.orders[target.id]?.ownerId).toBe(id);
      send(); const taken = (await view()).snapshot;
      heartbeat = setInterval(() => send(), 100);
      const stockAtPoint = (s: PublicSnapshot) => Object.values(s.orders).filter((o: Order) => !o.ownerId && !o.privateOwnerId && !o.settled && (!o.source || o.source === 'common') && o.pickup.x === pickup.x && o.pickup.y === pickup.y);
      expect(stockAtPoint(taken)).toHaveLength(0);
      await command('pause'); const paused = (await view()).snapshot;
      await sleep(1200); const stillPaused = (await view()).snapshot;
      expect(stillPaused.elapsedMs).toBe(paused.elapsedMs); expect(stockAtPoint(stillPaused)).toHaveLength(0);
      clearInterval(heartbeat); heartbeat = undefined; socket.close(); socket = await openArcadeSocket(initial.wsUrl, players[0].token, { origin });
      const restored = await socket.next();
      expect((restored.snapshot as PublicSnapshot).runId).toBe(initial.snapshot.runId);
      expect((restored.snapshot as PublicSnapshot).players[id].carriedOrderId).toBe(target.id);
      await command('resume'); heartbeat = setInterval(() => send(), 100);
      await sleep(1300); const early = (await view()).snapshot;
      observations.push({ pickupAtMs: taken.elapsedMs, pausedAtMs: paused.elapsedMs, afterResumeMs: early.elapsedMs });
      expect(stockAtPoint(early), 'R1: ordinary stock must remain empty two seconds after pickup; old 750ms global spawning is invalid').toHaveLength(0);
      // Wait on authoritative game time, never mutate server time. The lower
      // bound allows only the <=100ms snapshot observation uncertainty.
      while (true) {
        current = (await view()).snapshot;
        if (current.elapsedMs >= taken.elapsedMs + 44_750) break;
        expect(stockAtPoint(current), `No refill at elapsed=${current.elapsedMs}`).toHaveLength(0);
        await sleep(250);
      }
      await expect.poll(async () => {
        current = (await view()).snapshot; return stockAtPoint(current).length;
      }, { timeout: 2500, intervals: [50, 100] }).toBe(1);
      expect(current.elapsedMs).toBeGreaterThanOrEqual(taken.elapsedMs + 44_750);
      expect(current.elapsedMs).toBeLessThanOrEqual(taken.elapsedMs + 46_000);
      expect(current.orders[target.id]).toMatchObject({ ownerId: id, settled: false }); expect(current.players[id].carriedOrderId).toBe(target.id);
      expect(current.players[id].coins).toBe(20); observations.push({ refillAtMs: current.elapsedMs, pickup });
    } finally {
      if (heartbeat) clearInterval(heartbeat); socket.close(); await command('pause');
      await info.attach('order-flow-v2-worker-observations.json', { body: Buffer.from(JSON.stringify(observations)), contentType: 'application/json' });
    }
  });
});
