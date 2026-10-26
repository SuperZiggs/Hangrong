import { test, expect } from '@playwright/test';
import { answerBody, assertNoKeys, assertNoSecrets, auth, command, createRoom, error, join, requestId, startRoom, state, submitBody, success, token } from '../support/api';

test('create contract: idempotent room and public snapshot contain no capabilities', async ({ request }) => {
  const hostToken = token();
  const data = { requestId: requestId(), hostToken };
  const first = await success(await request.post('/api/rooms', { data }));
  const second = await success(await request.post('/api/rooms', { data }));
  expect(second.code).toBe(first.code);
  expect(first).toMatchObject({ code: expect.stringMatching(/^\d{6}$/), hostPath: expect.any(String), joinPath: expect.any(String), expiresAtMs: expect.any(Number) });
  expect(first.expiresAtMs).toBeGreaterThan(Date.now());
  assertNoSecrets(first, [hostToken]);
  const publicState = await state(request, { ...first, hostToken });
  expect(publicState.role).toBe('public');
  expect(publicState.teams).toHaveLength(0);
  expect(publicState.mission).toBeUndefined();
  assertNoSecrets(publicState, [hostToken]);
  assertNoKeys(publicState);
});

test('validation: room lookup, slot/name boundaries and safe structured errors', async ({ request }) => {
  // A non-code is deliberately impossible to allocate, avoiding an accidental live-room collision.
  await error(await request.get('/api/rooms/9999999/state'), [400, 404]);
  const room = await createRoom(request);
  for (const invalid of [
    { slot: 0, name: 'Nhóm A' }, { slot: -1, name: 'Nhóm A' }, { slot: 1.5, name: 'Nhóm A' },
    { slot: 1, name: 'x' }, { slot: 1, name: '   ' }, { slot: 1, name: 'x'.repeat(31) },
  ]) {
    await error(await request.post(`/api/rooms/${room.code}/join`, { data: { requestId: requestId(), teamToken: token(), ...invalid } }), 400);
  }
  const teamToken = token();
  const joined = await success(await request.post(`/api/rooms/${room.code}/join`, { data: { requestId: requestId(), teamToken, slot: 1, name: '  Đội A  ' } }));
  expect(joined.slot).toBe(1);
  const snapshot = await state(request, room, teamToken);
  expect(snapshot.teams.find(team => team.slot === 1)?.name).toBe('Đội A');
  await error(await request.post(`/api/rooms/${room.code}/recover`, { data: { recoveryCode: room.code, newTeamToken: token() } }), [400, 401, 403, 409]);
});

test('join race: one slot owner, idempotent retry and same-token rejoin', async ({ request }) => {
  const room = await createRoom(request);
  const contenders = [token(), token()];
  const requests = contenders.map(teamToken => ({ requestId: requestId(), slot: 1, name: 'Đội đua', teamToken }));
  const replies = await Promise.all(requests.map(data => request.post(`/api/rooms/${room.code}/join`, { data })));
  expect(replies.filter(response => response.ok())).toHaveLength(1);
  const winner = replies.findIndex(response => response.ok());
  await error(replies[1 - winner], 409);
  const original = await success(replies[winner]);
  const retry = await success(await request.post(`/api/rooms/${room.code}/join`, { data: requests[winner] }));
  expect(retry.teamId).toBe(original.teamId);
  const rejoin = await success(await request.post(`/api/rooms/${room.code}/join`, { data: { ...requests[winner], requestId: requestId() } }));
  expect(rejoin.teamId).toBe(original.teamId);
  expect((await state(request, room, room.hostToken)).teams).toHaveLength(1);
});

test('start boundary and authority: one team cannot start and public/team cannot control host', async ({ request }) => {
  const room = await createRoom(request);
  const team = await join(request, room, 1);
  await error(await command(request, room, 'start'), 409);
  for (const capability of [undefined, token(), team.teamToken]) {
    await error(await request.post(`/api/rooms/${room.code}/host`, {
      headers: capability ? auth(capability) : undefined,
      data: { requestId: requestId(), action: 'start' },
    }), [401, 403]);
  }
  await error(await request.get(`/api/rooms/${room.code}/export`, { headers: auth(team.teamToken) }), [401, 403]);
  const snapshot = await state(request, room, team.teamToken);
  expect(snapshot.mission).toBeUndefined();
});

test('six-team assignment: distinct missions, stable reconnect, no premature answer keys', async ({ request }) => {
  const { room, teams } = await startRoom(request, 6);
  const snapshots = await Promise.all(teams.map(team => state(request, room, team.teamToken)));
  expect(new Set(snapshots.map(snapshot => snapshot.mission!.id)).size).toBe(6);
  for (const [index, snapshot] of snapshots.entries()) {
    expect(snapshot.role).toBe('team');
    expect(snapshot.teams).toHaveLength(6);
    expect(snapshot.mission).toMatchObject({ id: expect.any(String), title: expect.any(String), context: expect.any(String), tasks: expect.any(Array) });
    expect(snapshot.mission!.tasks).toHaveLength(3);
    expect(new Set(snapshot.mission!.tasks.map(task => task.id)).size).toBe(3);
    for (const task of snapshot.mission!.tasks) {
      expect(task.prompt.length).toBeGreaterThan(0);
      expect(task.choices).toHaveLength(4);
      expect(new Set(task.choices.map(choice => choice.id)).size).toBe(4);
      for (const choice of task.choices) expect(choice.text.length).toBeGreaterThan(0);
    }
    assertNoSecrets(snapshot, [room.hostToken, ...teams.map(team => team.teamToken)]);
    assertNoKeys(snapshot);
    for (const other of snapshots.filter((_, otherIndex) => index !== otherIndex)) {
      expect(JSON.stringify(snapshot)).not.toContain(`"${other.mission!.id}"`);
    }
    expect((await state(request, room, teams[index].teamToken)).mission).toEqual(snapshot.mission);
  }
  for (const capability of [undefined, room.hostToken]) {
    const snapshot = await state(request, room, capability);
    expect(snapshot.role).toBe(capability ? 'host' : 'public');
    expect(snapshot.mission).toBeUndefined();
    expect(snapshot.draft).toBeUndefined();
    expect(snapshot.results).toBeUndefined();
    assertNoKeys(snapshot);
    assertNoSecrets(snapshot, [room.hostToken, ...teams.map(team => team.teamToken)]);
  }
  const before = await state(request, room, room.hostToken);
  await error(await request.post(`/api/rooms/${room.code}/join`, { data: { requestId: requestId(), slot: 6, name: 'Đến muộn', teamToken: token() } }), 409);
  // Duplicate start commands cannot reset the timer or switch the assignment/run.
  const id = requestId();
  const room2 = await createRoom(request);
  await Promise.all([join(request, room2, 1), join(request, room2, 2), join(request, room2, 3)]);
  await success(await command(request, room2, 'start', { requestId: id }));
  const once = await state(request, room2, room2.hostToken);
  await success(await command(request, room2, 'start', { requestId: id }));
  const twice = await state(request, room2, room2.hostToken);
  expect(twice.runId).toBe(once.runId);
  expect(twice.deadlineMs).toBe(once.deadlineMs);
  expect(before.deadlineMs! - before.serverNowMs).toBeGreaterThan(100_000);
  expect(before.deadlineMs! - before.serverNowMs).toBeLessThanOrEqual(120_000);
});

test('isolation: capabilities from another room cannot obtain or mutate private state', async ({ request }) => {
  const a = await startRoom(request);
  const b = await startRoom(request);
  const valid = a.snapshot;
  for (const capability of [a.room.hostToken, ...a.teams.map(team => team.teamToken)]) {
    const response = await request.get(`/api/rooms/${b.room.code}/state`, { headers: auth(capability) });
    // A foreign bearer may be rejected or downgraded to the exact public view, never a private role.
    if (response.ok()) {
      const value = await success(response);
      expect(value.role).toBe('public');
      expect(value.mission).toBeUndefined();
      expect(value.draft).toBeUndefined();
      assertNoKeys(value);
    } else await error(response, [401, 403]);
    await error(await request.post(`/api/rooms/${b.room.code}/answer`, { headers: auth(capability), data: answerBody(valid) }), [401, 403]);
    await error(await request.post(`/api/rooms/${b.room.code}/host`, { headers: auth(capability), data: { requestId: requestId(), action: 'pause' } }), [401, 403]);
  }
  const otherMission = (await state(request, a.room, a.teams[1].teamToken)).mission!;
  // Task IDs need only identify tasks within their mission; reject a pair only when it is unassigned here.
  const foreignPair = otherMission.tasks.flatMap(task => task.choices.map(choice => ({ task, choice }))).find(({ task, choice }) =>
    !valid.mission!.tasks.some(own => own.id === task.id && own.choices.some(option => option.id === choice.id)),
  );
  if (foreignPair) await error(await request.post(`/api/rooms/${a.room.code}/answer`, { headers: auth(a.teams[0].teamToken), data: answerBody(valid, foreignPair.task, foreignPair.choice) }), [400, 403, 409]);
  expect((await state(request, a.room, a.teams[0].teamToken)).draft).toEqual({});
});

test('autosave ordering: later sequence wins over retries and reordered requests', async ({ request }) => {
  const { room, teams, snapshot } = await startRoom(request);
  const task = snapshot.mission!.tasks[0];
  const older = answerBody(snapshot, task, task.choices[0], 1);
  const newer = answerBody(snapshot, task, task.choices[1], 2);
  await success(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: older }));
  await success(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: newer }));
  for (const stale of [older, { ...older, requestId: requestId() }]) {
    const response = await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: stale });
    if (response.ok()) await success(response); else await error(response, 409);
  }
  expect((await state(request, room, teams[0].teamToken)).draft?.[task.id]).toEqual({ choiceId: task.choices[1].id, seq: 2 });
  const unchanged = await state(request, room, teams[0].teamToken);
  for (const invalid of [
    { ...newer, seq: 0 }, { ...newer, seq: -1 }, { ...newer, choiceId: 'not-an-assigned-choice', seq: 3 },
    { ...newer, taskId: 'not-an-assigned-task', seq: 3 }, { ...newer, roundIndex: 4, seq: 3 },
  ]) {
    await error(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: { ...invalid, requestId: requestId() } }), [400, 409]);
  }
  expect((await state(request, room, teams[0].teamToken)).draft).toEqual(unchanged.draft);
});

test('submit atomicity: invalid choices do not partially save or lock a round', async ({ request }) => {
  const { room, teams, snapshot } = await startRoom(request);
  const body = submitBody(snapshot);
  body.answers[1].choiceId = 'invalid-choice';
  await error(await request.post(`/api/rooms/${room.code}/submit`, { headers: auth(teams[0].teamToken), data: body }), [400, 409]);
  const after = await state(request, room, teams[0].teamToken);
  expect(after.draft).toEqual({});
  expect(after.locked).toBeFalsy();
  expect(after.teams.find(team => team.teamId === teams[0].teamId)?.submitted).toBeFalsy();
});

test('submit concurrency: all six submissions persist, retries are safe and deadline remains', async ({ request }) => {
  const { room, teams } = await startRoom(request, 6);
  const snapshots = await Promise.all(teams.map(team => state(request, room, team.teamToken)));
  const bodies = snapshots.map(snapshot => submitBody(snapshot));
  const replies = await Promise.all(teams.map((team, index) => request.post(`/api/rooms/${room.code}/submit`, { headers: auth(team.teamToken), data: bodies[index] })));
  for (const response of replies) await success(response);
  for (const [index, team] of teams.entries()) {
    await success(await request.post(`/api/rooms/${room.code}/submit`, { headers: auth(team.teamToken), data: bodies[index] }));
    const snapshot = await state(request, room, team.teamToken);
    expect(snapshot.locked).toBeTruthy();
    for (const answer of bodies[index].answers) expect(snapshot.draft?.[answer.taskId]).toEqual({ choiceId: answer.choiceId, seq: answer.seq });
    await error(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(team.teamToken), data: answerBody(snapshots[index], undefined, undefined, 99) }), 409);
  }
  const host = await state(request, room, room.hostToken);
  expect(host.teams.filter(team => team.submitted)).toHaveLength(6);
  expect(host.deadlineMs).toBe(snapshots[0].deadlineMs);
  expect(host.roundIndex).toBe(1);
  expect(host.phase).toBe(snapshots[0].phase);
});

test('pause: mutations rejected while remaining time is frozen and resume preserves it', async ({ request }) => {
  const { room, teams, snapshot } = await startRoom(request);
  await success(await command(request, room, 'pause', { runId: snapshot.runId }));
  const paused = await state(request, room, room.hostToken);
  await error(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: answerBody(snapshot) }), 423);
  await error(await request.post(`/api/rooms/${room.code}/submit`, { headers: auth(teams[0].teamToken), data: submitBody(snapshot) }), 423);
  await new Promise(resolve => setTimeout(resolve, 1_100));
  await success(await command(request, room, 'resume', { runId: snapshot.runId }));
  const resumed = await state(request, room, teams[0].teamToken);
  // Wall time during pause must be added to the deadline, leaving the playable interval intact.
  expect(resumed.deadlineMs!).toBeGreaterThanOrEqual(snapshot.deadlineMs! + 1_000);
  expect(resumed.deadlineMs! - resumed.serverNowMs).toBeGreaterThan(snapshot.deadlineMs! - paused.serverNowMs - 500);
  expect(resumed.mission).toEqual(snapshot.mission);
  await success(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: answerBody(snapshot) }));
});

test('recovery: host-only one-use credential revokes old device and retains mission/draft', async ({ request }) => {
  const { room, teams, snapshot } = await startRoom(request);
  const answer = answerBody(snapshot);
  await success(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: answer }));
  await error(await request.post(`/api/rooms/${room.code}/host`, { headers: auth(teams[1].teamToken), data: { requestId: requestId(), runId: snapshot.runId, action: 'issue-recovery', payload: { slot: teams[0].slot } } }), [401, 403]);
  const issued = await success(await command(request, room, 'issue-recovery', { runId: snapshot.runId, payload: { slot: teams[0].slot } }));
  expect(issued.recoveryCode).toEqual(expect.any(String));
  expect(issued.recoveryCode).not.toBe(room.code);
  const replacement = token();
  await success(await request.post(`/api/rooms/${room.code}/recover`, { data: { recoveryCode: issued.recoveryCode, newTeamToken: replacement } }));
  const recovered = await state(request, room, replacement);
  expect(recovered.role).toBe('team');
  expect(recovered.mission).toEqual(snapshot.mission);
  expect(recovered.draft?.[answer.taskId]).toEqual({ choiceId: answer.choiceId, seq: answer.seq });
  await error(await request.get(`/api/rooms/${room.code}/state`, { headers: auth(teams[0].teamToken) }), [401, 403]);
  await error(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: { ...answer, seq: 2, requestId: requestId() } }), [401, 403]);
  await error(await request.post(`/api/rooms/${room.code}/recover`, { data: { recoveryCode: issued.recoveryCode, newTeamToken: token() } }), [400, 401, 403, 409]);
});

test('lobby controls: rename trims, remove revokes the removed capability', async ({ request }) => {
  const room = await createRoom(request);
  const team = await join(request, room, 1);
  await success(await command(request, room, 'rename', { payload: { slot: 1, name: '  Đội Mới  ' } }));
  expect((await state(request, room, room.hostToken)).teams[0].name).toBe('Đội Mới');
  await success(await command(request, room, 'remove', { payload: { slot: 1 } }));
  expect((await state(request, room, room.hostToken)).teams).toHaveLength(0);
  const response = await request.get(`/api/rooms/${room.code}/state`, { headers: auth(team.teamToken) });
  if (response.ok()) expect((await success(response)).role).toBe('public');
  else await error(response, [401, 403]);
  await join(request, room, 1);
});
