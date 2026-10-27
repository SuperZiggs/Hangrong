import { test, expect } from '@playwright/test';
import { arcadeAuth, arcadeError, arcadeOK, arcadePath, arcadeRequestId, arcadeToken, bootstrapArcade, createArcade, hostArcade, inputFrame, joinArcade, noArcadeSecrets, openArcadeSocket, runningArcade, sleep, type ArcadeSnapshot, type ArcadeSocket } from '../support/arcade-independent';

test('A01 room request/capability retries are atomic and expire in 24h', async ({ request }) => {
  const requestId = arcadeRequestId(); const hostToken = arcadeToken(); const before = Date.now();
  const rooms = await Promise.all(Array.from({ length: 6 }, () => createArcade(request, { requestId, hostToken })));
  expect(new Set(rooms.map(room => room.code)).size).toBe(1);
  expect(rooms[0].expiresAtMs).toBeGreaterThanOrEqual(before + 86_400_000 - 5000);
  expect(rooms[0].expiresAtMs).toBeLessThanOrEqual(Date.now() + 86_400_000 + 5000);
  await arcadeError(await request.post(arcadePath(), { data: { requestId, hostToken: arcadeToken() } }));
  for (const data of [{}, { requestId: arcadeRequestId(), hostToken: 'short' }]) await arcadeError(await request.post(arcadePath(), { data }), [400, 422]);
});

test('A02 name-only joins: retry races preserve identity, duplicate names differ, malformed names/capabilities fail', async ({ request }) => {
  const room = await createArcade(request); const requestId = arcadeRequestId(); const playerToken = arcadeToken();
  const entrants = await Promise.all(Array.from({ length: 8 }, () => joinArcade(request, room, '  Minh  ', { requestId, playerToken })));
  expect(new Set(entrants.map(player => player.playerId)).size).toBe(1);
  expect((await joinArcade(request, room, 'Minh', { playerToken })).playerId).toBe(entrants[0].playerId);
  expect((await joinArcade(request, room, 'Minh')).playerId).not.toBe(entrants[0].playerId);
  const view = await bootstrapArcade(request, room, playerToken);
  expect(view.you).toEqual({ playerId: entrants[0].playerId, name: 'Minh' }); expect(Object.keys(view.snapshot.players)).toHaveLength(2);
  for (const name of [' ', 'x', 'x'.repeat(31)]) await arcadeError(await request.post(arcadePath(`/${room.code}/join`), { data: { requestId: arcadeRequestId(), name, playerToken: arcadeToken() } }), [400, 422]);
  await arcadeError(await request.post(arcadePath(`/${room.code}/join`), { data: { requestId: arcadeRequestId(), name: 'Minh', playerToken: 'short' } }), [400, 422]);
  await arcadeError(await request.post(arcadePath(`/${room.code}/join`), { data: { requestId, name: 'Minh', playerToken: arcadeToken() } }));
});

test('A03 minimum three, 26 same-IP entrants, no late joins, saved player reconnect remains possible', async ({ request }) => {
  const room = await createArcade(request);
  for (let i = 0; i < 3; i++) { await arcadeError(await hostArcade(request, room, 'start'), [409]); await joinArcade(request, room, `Người ${i + 1}`); }
  const extra = await Promise.all(Array.from({ length: 23 }, (_, i) => joinArcade(request, room, `Bổ sung ${i + 4}`)));
  expect(Object.keys((await bootstrapArcade(request, room, room.hostToken)).snapshot.players)).toHaveLength(26);
  await arcadeOK(await hostArcade(request, room, 'start'));
  await arcadeError(await request.post(arcadePath(`/${room.code}/join`), { data: { requestId: arcadeRequestId(), name: 'Đến muộn', playerToken: arcadeToken() } }), [409]);
  expect((await joinArcade(request, room, extra[0].name, { playerToken: extra[0].playerToken })).playerId).toBe(extra[0].playerId);
});

test('A04 every host action/export enforces roles and room boundaries, public snapshots contain no capabilities', async ({ request }) => {
  const { room, players } = await runningArcade(request); const foreign = await createArcade(request);
  const secrets = [room.hostToken, foreign.hostToken, ...players.map(player => player.playerToken)];
  for (const token of [undefined, room.hostToken, ...players.map(player => player.playerToken)]) {
    const view = await bootstrapArcade(request, room, token);
    noArcadeSecrets(view, secrets);
    expect(view.role).toBe(!token ? 'public' : token === room.hostToken ? 'host' : 'player');
    if (view.role !== 'player') expect(view.you).toBeUndefined();
  }
  for (const capability of [players[0].playerToken, foreign.hostToken, arcadeToken()]) {
    for (const action of ['start', 'pause', 'resume', 'replay', 'rename', 'remove', 'issue-recovery']) {
      await arcadeError(await hostArcade(request, room, action, { payload: { playerId: players[1].playerId, name: 'Chiếm quyền' } }, capability), [401, 403]);
    }
    await arcadeError(await request.get(arcadePath(`/${room.code}/export`), { headers: arcadeAuth(capability) }), [401, 403]);
  }
  await arcadeError(await request.post(arcadePath(`/${room.code}/host`), { data: { requestId: arcadeRequestId(), action: 'pause' } }), [401, 403]);
  await arcadeError(await request.get(arcadePath(`/${room.code}/export`), { headers: arcadeAuth(room.hostToken) }), [409]);
});

test('A05 host retries do not double-apply; pause freezes time; replay retains roster and rejects stale run', async ({ request }) => {
  const { room, players, view } = await runningArcade(request); const runId = view.snapshot.runId;
  const requestId = arcadeRequestId();
  await Promise.all(Array.from({ length: 5 }, async () => arcadeOK(await hostArcade(request, room, 'pause', { requestId, runId }))));
  const paused = await bootstrapArcade(request, room, room.hostToken); expect(paused.snapshot.paused).toBe(true);
  await sleep(350);
  const frozen = await bootstrapArcade(request, room, room.hostToken);
  expect(frozen.snapshot.elapsedMs).toBe(paused.snapshot.elapsedMs); expect(frozen.snapshot.players).toEqual(paused.snapshot.players); expect(frozen.snapshot.orders).toEqual(paused.snapshot.orders);
  await arcadeOK(await hostArcade(request, room, 'resume', { runId }));
  await sleep(100);
  expect((await bootstrapArcade(request, room, room.hostToken)).snapshot.elapsedMs - paused.snapshot.elapsedMs).toBeLessThan(300);
  await arcadeOK(await hostArcade(request, room, 'rename', { payload: { playerId: players[0].playerId, name: 'Tên mới' } }));
  expect((await bootstrapArcade(request, room, players[0].playerToken)).you?.name).toBe('Tên mới');
  await arcadeOK(await hostArcade(request, room, 'replay', { runId }));
  const replay = await bootstrapArcade(request, room, room.hostToken);
  expect(replay.snapshot.runId).not.toBe(runId);
  expect(Object.keys(replay.snapshot.players).sort()).toEqual(players.map(player => player.playerId).sort());
  for (const player of Object.values(replay.snapshot.players)) { expect(player.coins).toBe(20); expect(player.carriedOrderId).toBeNull(); }
  await arcadeError(await hostArcade(request, room, 'pause', { runId }), [409]);
});

test('A06 recovery response-loss retry succeeds only for same replacement capability; old token loses control', async ({ request }) => {
  const { room, players } = await runningArcade(request); const player = players[0];
  const before = await bootstrapArcade(request, room, player.playerToken);
  const issued = await arcadeOK(await hostArcade(request, room, 'issue-recovery', { payload: { playerId: player.playerId } }));
  expect(issued.recoveryCode).toEqual(expect.any(String));
  const replacement = arcadeToken(); const data = { recoveryCode: issued.recoveryCode, newPlayerToken: replacement };
  const recovered = await Promise.all(Array.from({ length: 5 }, () => request.post(arcadePath(`/${room.code}/recover`), { data }).then(arcadeOK)));
  for (const value of recovered) expect(value.playerId).toBe(player.playerId);
  const after = await bootstrapArcade(request, room, replacement);
  expect(after.you?.playerId).toBe(player.playerId);
  expect(after.snapshot.players[player.playerId].coins).toBe(before.snapshot.players[player.playerId].coins);
  expect(after.snapshot.players[player.playerId].carriedOrderId).toBe(before.snapshot.players[player.playerId].carriedOrderId);
  expect(after.snapshot.players[player.playerId].x).toBeCloseTo(before.snapshot.players[player.playerId].x, 0);
  expect(after.snapshot.players[player.playerId].y).toBeCloseTo(before.snapshot.players[player.playerId].y, 0);
  await arcadeError(await request.get(arcadePath(`/${room.code}/bootstrap`), { headers: arcadeAuth(player.playerToken) }), [401, 403]);
  await arcadeError(await request.post(arcadePath(`/${room.code}/recover`), { data: { ...data, newPlayerToken: arcadeToken() } }));
  await arcadeError(await request.post(arcadePath(`/${room.code}/recover`), { data: { ...data, recoveryCode: 'not-a-code' } }));
});

test('A07 socket input cannot forge money/time/position, remote pickup, another player, or host control', async ({ request }) => {
  const { room, players, view } = await runningArcade(request);
  const socket = await openArcadeSocket(view.wsUrl, players[0].playerToken);
  try {
    await socket.next();
    const before = (await bootstrapArcade(request, room, players[0].playerToken)).snapshot;
    socket.send({ type: 'input', input: inputFrame(before.runId, 1, { interactPressed: true, playerId: players[1].playerId, x: 999999, y: 999999, coins: 999999, elapsedMs: 540000 }) });
    socket.send({ type: 'host', action: 'replay', token: room.hostToken });
    await sleep(150);
    const after = (await bootstrapArcade(request, room, players[0].playerToken)).snapshot;
    expect(after.runId).toBe(before.runId); expect(after.elapsedMs).toBeLessThan(5000);
    for (const player of Object.values(after.players)) expect(player.coins).toBe(20);
    expect(after.players[players[0].playerId].x).not.toBe(999999);
    expect(after.players[players[1].playerId]).toEqual(before.players[players[1].playerId]);
    noArcadeSecrets(socket.messages, [room.hostToken, ...players.map(player => player.playerToken)]);
  } finally { socket.close(); }
});

test('A08 stale run/sequence ignored, input expires at 250ms, disconnect releases blocking body around 3s', async ({ request }) => {
  const { room, players, view } = await runningArcade(request); const player = players[0];
  const socket = await openArcadeSocket(view.wsUrl, player.playerToken);
  try {
    await socket.next();
    socket.send({ type: 'input', input: inputFrame(view.snapshot.runId, 20, { moveX: 1 }) });
    await sleep(400);
    const expired = (await bootstrapArcade(request, room, player.playerToken)).snapshot;
    socket.send({ type: 'input', input: inputFrame(view.snapshot.runId, 19, { moveX: -1 }) });
    socket.send({ type: 'input', input: inputFrame('stale-run', 21, { moveX: -1 }) });
    await sleep(200);
    const stale = (await bootstrapArcade(request, room, player.playerToken)).snapshot;
    expect(stale.players[player.playerId].x).toBeCloseTo(expired.players[player.playerId].x, 3);
    expect(stale.players[player.playerId].y).toBeCloseTo(expired.players[player.playerId].y, 3);
    socket.close(); await sleep(3400);
    const disconnected = (await bootstrapArcade(request, room, room.hostToken)).snapshot;
    expect(disconnected.players[player.playerId].connected).toBe(false);
    const restored = await joinArcade(request, room, player.name, { playerToken: player.playerToken }); expect(restored.playerId).toBe(player.playerId);
    expect((await bootstrapArcade(request, room, player.playerToken)).snapshot.players[player.playerId].x).toBeCloseTo(stale.players[player.playerId].x, 3);
  } finally { socket.close(); }
});

test('A09 26 actual sockets share one IP, make activity, validate origin/auth timeout and bound malformed frames', async ({ request }, testInfo) => {
  test.setTimeout(60_000);
  const { room, players } = await runningArcade(request, 26);
  const views = await Promise.all(players.map(player => bootstrapArcade(request, room, player.playerToken)));
  const sockets: ArcadeSocket[] = [];
  try {
    for (let i = 0; i < 26; i++) sockets.push(await openArcadeSocket(views[i].wsUrl, players[i].playerToken));
    await Promise.all(sockets.map(socket => socket.next()));
    const tickBefore = views[0].snapshot.tick;
    for (let seq = 1; seq <= 30; seq++) {
      sockets.forEach((socket, i) => socket.send({ type: 'input', input: inputFrame(views[i].snapshot.runId, seq, { moveX: seq % 2 ? 1 : -1, moveY: i % 2, dashPressed: seq === 1 }) }));
      await sleep(50);
    }
    for (const socket of sockets) { expect(socket.closed).toBe(false); expect(socket.messages.filter(message => message.type === 'snapshot').length).toBeGreaterThan(1); }
    expect((await bootstrapArcade(request, room, room.hostToken)).snapshot.tick).toBeGreaterThan(tickBefore);
    await testInfo.attach('26-real-socket-activity.json', { body: Buffer.from(JSON.stringify({ clients: sockets.length, perClientSnapshots: sockets.map(socket => socket.messages.filter(message => message.type === 'snapshot').length) })), contentType: 'application/json' });
    await expect(openArcadeSocket(views[0].wsUrl, undefined, { origin: 'https://untrusted.example' })).rejects.toThrow();
    const unauthenticated = await openArcadeSocket(views[0].wsUrl, undefined, { authenticate: false });
    try { await sleep(5500); expect(unauthenticated.closed).toBe(true); } finally { unauthenticated.close(); }
    const attacker = await openArcadeSocket(views[0].wsUrl, players[0].playerToken);
    try {
      await attacker.next(); attacker.send({ type: 'input', input: inputFrame(views[0].snapshot.runId, 200, { moveX: 9 }) });
      attacker.send({ type: 'input', padding: 'x'.repeat(262144), input: inputFrame(views[0].snapshot.runId, 201) });
      await sleep(200); expect(attacker.closed || attacker.messages.some(message => message.type === 'error')).toBe(true);
    } finally { attacker.close(); }
    expect((await bootstrapArcade(request, room, room.hostToken)).role).toBe('host');
  } finally { sockets.forEach(socket => socket.close()); }
});

test('A10 real 600s run reaches results, stops scoring at 540s, retains scoreboard and exports host CSV', async ({ request }, testInfo) => {
  test.setTimeout(660_000);
  const { room, players, view } = await runningArcade(request); const startedAt = Date.now();
  const observed: { wallMs: number; elapsedMs: number; phase: string }[] = [];
  let finalCoins: Record<string, number> | undefined;
  for (const target of [10_000, 50_000, 60_200, 170_000, 180_200, 350_000, 360_200, 530_000, 540_200, 600_200]) {
    while (Date.now() - startedAt < target) await sleep(Math.min(1000, target - (Date.now() - startedAt)));
    const current = (await bootstrapArcade(request, room, room.hostToken)).snapshot;
    observed.push({ wallMs: Date.now() - startedAt, elapsedMs: current.elapsedMs, phase: current.phase });
    const expected = current.elapsedMs < 60_000 ? 'practice' : current.elapsedMs < 180_000 ? 'stage1' : current.elapsedMs < 360_000 ? 'stage2' : current.elapsedMs < 540_000 ? 'stage3' : 'results';
    expect(current.phase).toBe(expected); expect(Math.abs(current.elapsedMs - (Date.now() - startedAt))).toBeLessThan(3000);
    if (target === 540_200) finalCoins = Object.fromEntries(Object.entries(current.players).map(([id, player]) => [id, player.coins]));
    if (target === 600_200) expect(Object.fromEntries(Object.entries(current.players).map(([id, player]) => [id, player.coins]))).toEqual(finalCoins);
  }
  expect(Date.now() - startedAt).toBeGreaterThanOrEqual(600_000);
  expect((await bootstrapArcade(request, room, players[0].playerToken)).snapshot.runId).toBe(view.snapshot.runId);
  const exported = await request.get(arcadePath(`/${room.code}/export`), { headers: arcadeAuth(room.hostToken) });
  expect(exported.ok()).toBe(true); expect(exported.headers()['content-type']).toContain('text/csv');
  const csv = await exported.text(); for (const player of players) expect(csv).toContain(player.name);
  noArcadeSecrets(csv, [room.hostToken, ...players.map(player => player.playerToken)]);
  await testInfo.attach('real-600s-observations.json', { body: Buffer.from(JSON.stringify(observed)), contentType: 'application/json' });
});

test('A11 original quiz API and security isolation survive arcade creation', async ({ request }) => {
  const arcade = await createArcade(request); const quizToken = arcadeToken();
  const quizResponse = await request.post('/api/rooms', { data: { requestId: arcadeRequestId(), hostToken: quizToken } });
  const quiz = await arcadeOK(quizResponse); expect(quiz.code).toMatch(/^\d{6}$/);
  const publicQuiz = await arcadeOK(await request.get(`/api/rooms/${quiz.code}/state`)); expect(publicQuiz.role).toBe('public');
  await arcadeError(await request.post(`/api/rooms/${quiz.code}/host`, { headers: arcadeAuth(arcade.hostToken), data: { requestId: arcadeRequestId(), action: 'start' } }), [401, 403]);
  await arcadeError(await hostArcade(request, arcade, 'start', {}, quizToken), [401, 403]);
});
