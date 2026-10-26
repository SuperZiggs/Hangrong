import { test, expect } from '@playwright/test';
import { answerBody, assertNoKeys, assertNoSecrets, auth, command, createRoom, error, join, requestId, state, submitBody, success, token } from '../support/api';
import { assertBalanced, classroomRequest, joinEntrant } from '../support/flexible';
import { localD1 } from '../support/local-d1';

test('flexible threshold: zero, one and two entrants cannot start; exactly three can', async ({ request }) => {
  const room = await createRoom(request);
  await error(await command(request, room, 'start'), 409);
  await join(request, room, 1);
  await error(await command(request, room, 'start'), 409);
  await join(request, room, 2);
  await error(await command(request, room, 'start'), 409);
  await join(request, room, 3);
  await success(await command(request, room, 'start'));
  expect((await state(request, room, room.hostToken)).teams).toHaveLength(3);
});

test('name-only joining: concurrent saved-capability retries create one stable entrant; duplicate names stay distinct', async ({ request }) => {
  const room = await createRoom(request);
  const teamToken = token();
  const id = requestId();
  const retries = await Promise.all(Array.from({ length: 8 }, () => joinEntrant(request, room, 'Minh', { teamToken, requestId: id })));
  expect(new Set(retries.map(team => team.teamId)).size).toBe(1);
  expect(new Set(retries.map(team => team.slot)).size).toBe(1);
  const reconnected = await joinEntrant(request, room, 'Minh', { teamToken });
  expect(reconnected.teamId).toBe(retries[0].teamId);
  const other = await joinEntrant(request, room, 'Minh');
  expect(other.teamId).not.toBe(reconnected.teamId);
  expect(other.slot).not.toBe(reconnected.slot);
  expect((await state(request, room, room.hostToken)).teams).toHaveLength(2);
  for (const invalid of [{ name: 'x' }, { name: '  ' }, { name: 'x'.repeat(31) }, { slot: -1, name: 'Minh' }, { slot: 1.5, name: 'Minh' }]) {
    await error(await request.post(`/api/rooms/${room.code}/join`, { data: { requestId: requestId(), teamToken: token(), ...invalid } }), 400);
  }
  await error(await request.post(`/api/rooms/${room.code}/join`, { data: { requestId: requestId(), name: 'Minh', teamToken: 'not-a-capability' } }), 400);
});

for (const count of [26, 40]) test(`classroom cohort ${count}: shared-IP joins, balanced three-round assignments, concurrent answers/submits and replay`, async ({ request }) => {
  test.setTimeout(150_000);
  const room = await createRoom(request);
  const teams = await Promise.all(Array.from({ length: count }, (_, index) => joinEntrant(request, room, index % 2 ? `Nhóm ${index + 1}` : `Người ${index + 1}`, { ip: `198.51.100.${count}` })));
  expect(new Set(teams.map(team => team.slot)).size).toBe(count);
  expect(new Set(teams.map(team => team.teamId)).size).toBe(count);
  await success(await command(request, room, 'start'));
  const firstRun = await state(request, room, teams[0].teamToken);
  const fixture = localD1(room);
  let oldAnswer = answerBody(firstRun);
  for (let roundIndex = 1; roundIndex <= 3; roundIndex++) {
    if (roundIndex > 1) fixture.elapsed((roundIndex - 1) * 180_000 + 1_000);
    const views = await Promise.all(teams.map(team => state(request, room, team.teamToken)));
    assertBalanced(views);
    for (const [index, view] of views.entries()) {
      expect(view.roundIndex).toBe(roundIndex);
      expect(view.mission!.tasks).toHaveLength(3);
      assertNoKeys(view.mission);
      assertNoSecrets(view, [room.hostToken, ...teams.map(team => team.teamToken)]);
      expect((await state(request, room, teams[index].teamToken)).mission).toEqual(view.mission);
    }
    const answers = views.map(view => answerBody(view));
    if (roundIndex === 1) oldAnswer = answers[0];
    const replies = await Promise.all(teams.map((team, index) => classroomRequest(() => request.post(`/api/rooms/${room.code}/answer`, { headers: auth(team.teamToken), data: answers[index] }))));
    for (const reply of replies) await success(reply);
    const submissions = views.map(view => submitBody(view));
    const submitted = await Promise.all(teams.map((team, index) => classroomRequest(() => request.post(`/api/rooms/${room.code}/submit`, { headers: auth(team.teamToken), data: submissions[index] }))));
    for (const reply of submitted) await success(reply);
    const host = await state(request, room, room.hostToken);
    expect(host.teams.filter(team => team.submitted)).toHaveLength(count);
    expect(host.deadlineMs).toBe(views[0].deadlineMs);
    for (const [index, team] of teams.entries()) {
      const saved = await state(request, room, team.teamToken);
      expect(saved.locked).toBe(true);
      for (const selected of submissions[index].answers) expect(saved.draft?.[selected.taskId]).toEqual({ choiceId: selected.choiceId, seq: selected.seq });
    }
  }
  fixture.elapsed(540_000);
  const finished = await state(request, room, room.hostToken);
  expect(finished.leaderboard).toHaveLength(count);
  for (const row of finished.leaderboard) {
    expect(row.score).toBeGreaterThanOrEqual(0);
    expect(row.score).toBeLessThanOrEqual(90);
    expect(row.score).toBe(row.correctCount * 10);
  }
  await success(await command(request, room, 'replay', { runId: firstRun.runId }));
  const replayed = await Promise.all(teams.map(team => state(request, room, team.teamToken)));
  assertBalanced(replayed);
  expect(replayed[0].runId).not.toBe(firstRun.runId);
  expect(replayed[0].teams.map(team => team.teamId).sort()).toEqual(teams.map(team => team.teamId).sort());
  for (const view of replayed) { expect(view.draft).toEqual({}); expect(view.locked).toBe(false); }
  const rejoined = await joinEntrant(request, room, teams[0].name, { teamToken: teams[0].teamToken });
  expect(rejoined.teamId).toBe(teams[0].teamId);
  await error(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: oldAnswer }), 409);
  await error(await request.post(`/api/rooms/${room.code}/join`, { data: { requestId: requestId(), name: 'Đến muộn', teamToken: token() } }), 409);
});

test('entrants beyond six: host rename/remove/recover target the right identity and preserve room/role isolation', async ({ request }) => {
  const room = await createRoom(request);
  const teams = await Promise.all(Array.from({ length: 8 }, (_, index) => joinEntrant(request, room, `Người ${index + 1}`)));
  const seventh = [...teams].sort((a, b) => a.slot - b.slot)[6];
  const eighth = [...teams].sort((a, b) => a.slot - b.slot)[7];
  expect(seventh.slot).toBeGreaterThan(6);
  await success(await command(request, room, 'rename', { payload: { slot: seventh.slot, name: '  Lan và bạn  ' } }));
  expect((await state(request, room, room.hostToken)).teams.find(team => team.teamId === seventh.teamId)?.name).toBe('Lan và bạn');
  for (const action of ['rename', 'remove', 'issue-recovery']) await error(await request.post(`/api/rooms/${room.code}/host`, { headers: auth(seventh.teamToken), data: { requestId: requestId(), action, payload: { slot: eighth.slot, name: 'Chiếm quyền' } } }), [401, 403]);
  await success(await command(request, room, 'remove', { payload: { slot: eighth.slot } }));
  await error(await request.get(`/api/rooms/${room.code}/state`, { headers: auth(eighth.teamToken) }), [401, 403]);
  const issued = await success(await command(request, room, 'issue-recovery', { payload: { slot: seventh.slot } }));
  const replacement = token();
  await success(await request.post(`/api/rooms/${room.code}/recover`, { data: { recoveryCode: issued.recoveryCode, newTeamToken: replacement } }));
  expect(await state(request, room, replacement)).toMatchObject({ role: 'team', you: { teamId: seventh.teamId, slot: seventh.slot, name: 'Lan và bạn' } });
  await error(await request.get(`/api/rooms/${room.code}/state`, { headers: auth(seventh.teamToken) }), [401, 403]);
  const otherRoom = await createRoom(request);
  await error(await request.post(`/api/rooms/${otherRoom.code}/host`, { headers: auth(replacement), data: { requestId: requestId(), action: 'start' } }), [401, 403]);
  await success(await command(request, room, 'start'));
  const live = await state(request, room, replacement);
  await success(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(replacement), data: answerBody(live) }));
  expect((await state(request, room, replacement)).teams).toHaveLength(7);
});
