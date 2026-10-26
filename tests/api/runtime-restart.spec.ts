import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from '@playwright/test';
import { answerBody, auth, command, createRoom, join, state, success } from '../support/api';
import { localD1 } from '../support/local-d1';

test('persistence: acknowledged draft and settled points survive two actual worker restarts', async ({ playwright }) => {
  test.skip(process.env.RUN_RESTART !== '1', 'Run explicitly with RUN_RESTART=1 to launch/restart an isolated local worker on port 5188.');
  test.setTimeout(120_000);
  const api = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:5188' });
  let runtime: ChildProcess | undefined;
  let logs = '';
  async function boot() {
    logs = '';
    runtime = spawn(process.execPath, [
      '--import', pathToFileURL(resolve('scripts/sites-env.mjs')).href, resolve('node_modules/wrangler/bin/wrangler.js'), 'dev',
      '--config', resolve('dist/server/wrangler.json'), '--local', '--persist-to', resolve('.wrangler/state'),
      '--ip', '127.0.0.1', '--port', '5188', '--inspector-port', '0',
    ], { cwd: process.cwd(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
    runtime.stdout?.on('data', chunk => { logs += String(chunk); });
    runtime.stderr?.on('data', chunk => { logs += String(chunk); });
    await expect.poll(async () => {
      if (runtime?.exitCode !== null) throw new Error(`Isolated worker exited before readiness: ${logs.slice(-1500)}`);
      try { return (await api.get('/', { timeout: 1_000 })).status(); } catch { return 0; }
    }, { timeout: 25_000, intervals: [250, 500, 1_000] }).toBe(200);
    console.log('[runtime-restart] isolated worker ready at 5188');
  }
  async function stop() {
    if (!runtime?.pid) return;
    const owned = runtime;
    if (owned.exitCode !== null) { runtime = undefined; return; }
    if (process.platform === 'win32') {
      // Only the process tree spawned by this test is stopped; the primary 5187 server stays running.
      const killed = spawnSync('taskkill.exe', ['/PID', String(owned.pid), '/T', '/F'], { encoding: 'utf8', windowsHide: true });
      expect(killed.status, killed.stderr || killed.stdout).toBe(0);
    } else owned.kill('SIGTERM');
    await expect.poll(async () => {
      try { await api.get('/', { timeout: 500 }); return false; } catch { return true; }
    }, { timeout: 10_000 }).toBeTruthy();
    runtime = undefined;
    console.log('[runtime-restart] owned worker stopped; persistent D1 retained');
  }
  try {
    let portOccupied = false;
    try { await api.get('/', { timeout: 500 }); portOccupied = true; } catch { /* expected: isolated port is free */ }
    expect(portOccupied, 'Port 5188 must be free before this test starts its own worker.').toBe(false);
    await boot();
    const room = await createRoom(api);
    const teams = await Promise.all([join(api, room, 1), join(api, room, 2)]);
    await success(await command(api, room, 'start'));
    const before = await state(api, room, teams[0].teamToken);
    const fixture = localD1(room);
    const stored = fixture.read();
    const task = before.mission!.tasks[0];
    const correctId = stored.teams.find(team => team.teamId === teams[0].teamId)!.rounds[0].mission.tasks.find(item => item.id === task.id)!.correctChoiceId;
    const answer = answerBody(before, task, task.choices.find(choice => choice.id === correctId)!);
    await success(await api.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: answer }));
    const acknowledged = await state(api, room, teams[0].teamToken);
    await stop();
    await boot();
    const restored = await state(api, room, teams[0].teamToken);
    expect(restored.runId).toBe(acknowledged.runId);
    expect(restored.mission).toEqual(acknowledged.mission);
    expect(restored.draft).toEqual(acknowledged.draft);
    expect(restored.deadlineMs).toBe(acknowledged.deadlineMs);
    fixture.elapsed(120_000);
    const graded = await state(api, room, teams[0].teamToken);
    expect(graded.leaderboard.find(row => row.teamId === teams[0].teamId)?.score).toBe(10);
    await stop();
    await boot();
    const settled = await state(api, room, teams[0].teamToken);
    expect(settled.leaderboard).toEqual(graded.leaderboard);
    expect(settled.draft).toEqual(graded.draft);
    expect(settled.results).toEqual(graded.results);
    console.log(`[runtime-restart] room ${room.code}: acknowledged draft and settled 10 points survived actual restarts`);
  } finally {
    await stop();
    await api.dispose();
  }
});
