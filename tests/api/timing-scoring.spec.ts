import { test, expect } from '@playwright/test';
import { answerBody, assertNoKeys, assertNoSecrets, auth, command, error, requestId, startRoom, state, submitBody, success, token } from '../support/api';
import { localD1 } from '../support/local-d1';

test('deadline: last acknowledged choices settle, blanks score zero and late packets cannot change results', async ({ request }) => {
  test.setTimeout(90_000);
  const { room, teams, snapshot } = await startRoom(request);
  const fixture = localD1(room);
  const stored = fixture.read();
  const assigned = stored.teams.find(team => team.teamId === teams[0].teamId)!.rounds[0].mission;
  const task = snapshot.mission!.tasks[0];
  const correct = task.choices.find(choice => choice.id === assigned.tasks.find(item => item.id === task.id)!.correctChoiceId)!;
  fixture.elapsed(118_000);
  const before = await state(request, room, teams[0].teamToken);
  expect(before.phase).toBe('answering');
  expect(before.deadlineMs! - before.serverNowMs).toBeGreaterThan(0);
  expect(before.deadlineMs! - before.serverNowMs).toBeLessThanOrEqual(2_000);
  const acknowledged = answerBody(snapshot, task, correct);
  await success(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: acknowledged }));
  fixture.elapsed(120_000);
  await error(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: answerBody(snapshot, snapshot.mission!.tasks[1]) }), 409);
  await error(await request.post(`/api/rooms/${room.code}/submit`, { headers: auth(teams[0].teamToken), data: submitBody(snapshot) }), 409);
  const settled = await state(request, room, teams[0].teamToken);
  expect(settled.phase).toBe('review');
  expect(settled.locked).toBeTruthy();
  expect(settled.draft).toEqual({ [task.id]: { choiceId: correct.id, seq: 1 } });
  expect(settled.leaderboard.find(row => row.teamId === teams[0].teamId)?.score).toBe(10);
  expect(settled.leaderboard.find(row => row.teamId === teams[1].teamId)?.score).toBe(0);
  const feedback = settled.results as { roundIndex: number; score: number; answers: { taskId: string; points: number; selectedChoiceId: string | null; correctChoiceId: string; explanation: string }[] }[];
  expect(feedback[0].score).toBe(10);
  expect(feedback[0].answers.filter(answer => answer.selectedChoiceId === null)).toHaveLength(2);
  for (const answer of feedback[0].answers) {
    expect(answer.points).toBe(answer.taskId === task.id ? 10 : 0);
    expect(answer.correctChoiceId.length).toBeGreaterThan(0);
    expect(answer.explanation.length).toBeGreaterThan(0);
  }
  const frozen = settled.leaderboard;
  await error(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: { ...acknowledged, seq: 99, requestId: requestId() } }), 409);
  expect((await state(request, room, teams[0].teamToken)).leaderboard).toEqual(frozen);
});

test('phase boundaries: review 45 seconds, leaderboard 15, then next round for the same sessions', async ({ request }) => {
  const { room, teams } = await startRoom(request);
  const fixture = localD1(room);
  const intervals = [
    { elapsed: 120_000, phase: 'review', roundIndex: 1, remaining: 45_000 },
    { elapsed: 165_000, phase: 'leaderboard', roundIndex: 1, remaining: 15_000 },
    { elapsed: 180_000, phase: 'answering', roundIndex: 2, remaining: 120_000 },
    { elapsed: 300_000, phase: 'review', roundIndex: 2, remaining: 45_000 },
    { elapsed: 345_000, phase: 'leaderboard', roundIndex: 2, remaining: 15_000 },
    { elapsed: 360_000, phase: 'answering', roundIndex: 3, remaining: 120_000 },
    { elapsed: 480_000, phase: 'review', roundIndex: 3, remaining: 45_000 },
    { elapsed: 525_000, phase: 'leaderboard', roundIndex: 3, remaining: 15_000 },
  ];
  for (const boundary of intervals) {
    fixture.elapsed(boundary.elapsed);
    const view = await state(request, room, teams[0].teamToken);
    expect(view.phase).toBe(boundary.phase);
    expect(view.roundIndex).toBe(boundary.roundIndex);
    expect(view.deadlineMs! - view.serverNowMs).toBeGreaterThan(boundary.remaining - 2_000);
    expect(view.deadlineMs! - view.serverNowMs).toBeLessThanOrEqual(boundary.remaining);
    assertNoKeys(view.mission);
  }
  fixture.elapsed(540_000);
  expect((await state(request, room, teams[0].teamToken)).phase).toBe('finished');
});

test('scoring: 10 per correct task, 90 maximum, no speed bonus, shared ranks and host-only final CSV', async ({ request }) => {
  test.setTimeout(120_000);
  const { room, teams } = await startRoom(request, 6);
  const fixture = localD1(room);
  const privateAssignments = fixture.read();
  const correctPerRound = [3, 3, 2, 1, 0, 0];
  for (let roundIndex = 1; roundIndex <= 3; roundIndex++) {
    fixture.elapsed((roundIndex - 1) * 180_000 + 1_000);
    const views = await Promise.all(teams.map(team => state(request, room, team.teamToken)));
    const bodies = teams.map((team, index) => {
      const assigned = privateAssignments.teams.find(item => item.teamId === team.teamId)!.rounds[roundIndex - 1].mission;
      const answers = assigned.tasks.flatMap((task, taskIndex) => {
        if (index === 4) return []; // Blank and wrong have the same knowledge score.
        const choiceId = taskIndex < correctPerRound[index] ? task.correctChoiceId : task.choices.find(choice => choice.id !== task.correctChoiceId)!.id;
        return [{ taskId: task.id, choiceId, seq: 1 }];
      });
      return submitBody(views[index], answers);
    });
    await success(await request.post(`/api/rooms/${room.code}/submit`, { headers: auth(teams[0].teamToken), data: bodies[0] }));
    fixture.elapsed((roundIndex - 1) * 180_000 + 118_000);
    await Promise.all(teams.slice(1).map(async (team, index) => success(await request.post(`/api/rooms/${room.code}/submit`, { headers: auth(team.teamToken), data: bodies[index + 1] }))));
    // Retry while still answering cannot duplicate points or change the time window.
    await success(await request.post(`/api/rooms/${room.code}/submit`, { headers: auth(teams[0].teamToken), data: bodies[0] }));
    fixture.elapsed((roundIndex - 1) * 180_000 + 120_000);
    const board = (await state(request, room, room.hostToken)).leaderboard;
    for (const [index, team] of teams.entries()) {
      const row = board.find(item => item.teamId === team.teamId)!;
      expect(row.score).toBe(correctPerRound[index] * 10 * roundIndex);
      expect(row.correctCount).toBe(correctPerRound[index] * roundIndex);
      expect(row.roundScores.slice(0, roundIndex)).toEqual(Array(roundIndex).fill(correctPerRound[index] * 10));
    }
    expect(board.map(row => row.rank)).toEqual([1, 1, 3, 4, 5, 5]);
  }
  fixture.elapsed(540_000);
  const finished = await state(request, room, room.hostToken);
  expect(finished.phase).toBe('finished');
  expect(finished.leaderboard.map(row => row.score)).toEqual([90, 90, 60, 30, 0, 0]);
  for (const capability of [undefined, teams[0].teamToken, token()]) await error(await request.get(`/api/rooms/${room.code}/export`, { headers: capability ? auth(capability) : undefined }), [401, 403]);
  const csv = await request.get(`/api/rooms/${room.code}/export`, { headers: auth(room.hostToken) });
  expect(csv.ok()).toBeTruthy();
  expect(csv.headers()['content-type']).toContain('text/csv');
  const text = await csv.text();
  expect(text).toContain('Hạng');
  expect(text.trim().split(/\r?\n/)).toHaveLength(7);
  for (const team of teams) expect(text).toContain(team.name);
  assertNoSecrets(text, [room.hostToken, ...teams.map(team => team.teamToken)]);
  expect(text).not.toMatch(/correctChoiceId|explanation|tokenHash/);
});

test('replay: new run retains sessions, changes assignments and rejects queued old-run answer/submit/host packets', async ({ request }) => {
  test.setTimeout(90_000);
  const { room, teams, snapshot } = await startRoom(request, 6);
  const fixture = localD1(room);
  const oldAssignments = await Promise.all(teams.map(team => state(request, room, team.teamToken)));
  const oldAnswer = answerBody(snapshot);
  const oldSubmit = submitBody(snapshot);
  await success(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: oldAnswer }));
  await success(await request.post(`/api/rooms/${room.code}/submit`, { headers: auth(teams[0].teamToken), data: oldSubmit }));
  fixture.elapsed(540_000);
  expect((await state(request, room, room.hostToken)).phase).toBe('finished');
  const id = requestId();
  await success(await command(request, room, 'replay', { requestId: id, runId: snapshot.runId }));
  const next = await state(request, room, teams[0].teamToken);
  expect(next.runId).not.toBe(snapshot.runId);
  expect(next.phase).toBe('answering');
  expect(next.roundIndex).toBe(1);
  expect(next.draft).toEqual({});
  expect(next.locked).toBeFalsy();
  expect(next.leaderboard.every(row => row.score === 0 && row.correctCount === 0 && row.roundScores.every(score => score === 0))).toBeTruthy();
  expect(next.teams.map(team => team.teamId)).toEqual(snapshot.teams.map(team => team.teamId));
  const nextAssignments = await Promise.all(teams.map(team => state(request, room, team.teamToken)));
  expect(new Set(nextAssignments.map(view => view.mission!.id)).size).toBe(6);
  // Ignore newly minted opaque IDs: actual mission assignment/choice-text order must be randomized.
  const assignmentOrder = (views: typeof nextAssignments) => views.map(view => ({ missionId: view.mission!.id, choices: view.mission!.tasks.map(task => task.choices.map(choice => choice.text)) }));
  expect(assignmentOrder(nextAssignments)).not.toEqual(assignmentOrder(oldAssignments));
  await success(await command(request, room, 'replay', { requestId: id, runId: snapshot.runId }));
  const duplicate = await state(request, room, room.hostToken);
  expect(duplicate.runId).toBe(next.runId);
  expect(duplicate.deadlineMs).toBe(next.deadlineMs);
  for (const body of [oldAnswer, { ...oldAnswer, requestId: requestId() }]) await error(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: body }), 409);
  for (const body of [oldSubmit, { ...oldSubmit, requestId: requestId() }]) await error(await request.post(`/api/rooms/${room.code}/submit`, { headers: auth(teams[0].teamToken), data: body }), 409);
  await error(await command(request, room, 'pause', { runId: snapshot.runId }), 409);
  expect((await state(request, room, teams[0].teamToken)).draft).toEqual({});
});

test('expiry: recovery has five-minute validity and an expired code cannot replace the live device', async ({ request }) => {
  const { room, teams, snapshot } = await startRoom(request);
  const before = Date.now();
  const issued = await success(await command(request, room, 'issue-recovery', { runId: snapshot.runId, payload: { slot: teams[0].slot } }));
  const after = Date.now();
  const fixture = localD1(room);
  const stored = fixture.read();
  const expiry = stored.teams.find(team => team.teamId === teams[0].teamId)!.recovery!.expiresAtMs;
  expect(expiry).toBeGreaterThanOrEqual(before + 300_000);
  expect(expiry).toBeLessThanOrEqual(after + 300_000);
  fixture.expireRecovery(teams[0].slot);
  const replacement = token();
  await error(await request.post(`/api/rooms/${room.code}/recover`, { data: { recoveryCode: issued.recoveryCode, newTeamToken: replacement } }), [400, 401, 403, 409]);
  expect((await state(request, room, teams[0].teamToken)).role).toBe('team');
  await error(await request.get(`/api/rooms/${room.code}/state`, { headers: auth(replacement) }), [401, 403]);
});

test('expiry: an expired room returns 410 and rejects queued mutations', async ({ request }) => {
  const { room, teams, snapshot } = await startRoom(request);
  localD1(room).expireRoom();
  await error(await request.get(`/api/rooms/${room.code}/state`), 410);
  await error(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: answerBody(snapshot) }), 410);
  await error(await command(request, room, 'pause', { runId: snapshot.runId }), 410);
});

test('recovery after grading: new device retains points and current assignment while old device is revoked', async ({ request }) => {
  const { room, teams, snapshot } = await startRoom(request);
  const fixture = localD1(room);
  const stored = fixture.read();
  const assigned = stored.teams.find(team => team.teamId === teams[0].teamId)!.rounds[0].mission;
  const answers = assigned.tasks.slice(0, 2).map(task => ({ taskId: task.id, choiceId: task.correctChoiceId, seq: 1 }));
  await success(await request.post(`/api/rooms/${room.code}/submit`, { headers: auth(teams[0].teamToken), data: submitBody(snapshot, answers) }));
  fixture.elapsed(180_000);
  const before = await state(request, room, teams[0].teamToken);
  expect(before.roundIndex).toBe(2);
  expect(before.leaderboard.find(row => row.teamId === teams[0].teamId)?.score).toBe(20);
  const secondRoundAnswer = answerBody(before);
  await success(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: secondRoundAnswer }));
  const acknowledged = await state(request, room, teams[0].teamToken);
  const issued = await success(await command(request, room, 'issue-recovery', { runId: before.runId, payload: { slot: teams[0].slot } }));
  const replacement = token();
  await success(await request.post(`/api/rooms/${room.code}/recover`, { data: { recoveryCode: issued.recoveryCode, newTeamToken: replacement } }));
  const after = await state(request, room, replacement);
  expect(after.mission).toEqual(acknowledged.mission);
  expect(after.draft).toEqual(acknowledged.draft);
  expect(after.leaderboard).toEqual(acknowledged.leaderboard);
  expect(after.results).toEqual(acknowledged.results);
  expect(after.runId).toBe(acknowledged.runId);
  await error(await request.get(`/api/rooms/${room.code}/state`, { headers: auth(teams[0].teamToken) }), [401, 403]);
});
