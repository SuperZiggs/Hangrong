import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import { answerBody, auth, command, createRoom, join, state, success, type Room, type Snapshot, type Team } from '../support/api';

type LegacyFixture = { room: Room; teams: Team[]; view: Snapshot };
test('pre-change persisted room keeps its original capabilities, run, mission and acknowledged draft', async ({ request }) => {
  test.skip(process.env.PREPARE_FLEXIBLE_LEGACY !== '1' && process.env.VERIFY_FLEXIBLE_LEGACY !== '1', 'Explicit pre/post-upgrade compatibility check; local capability fixture stays under ignored .wrangler.');
  const path = resolve('.wrangler/flexible-participation-legacy.json');
  if (process.env.PREPARE_FLEXIBLE_LEGACY === '1') {
    const room = await createRoom(request);
    const teams = await Promise.all([join(request, room, 1), join(request, room, 2), join(request, room, 3)]);
    await success(await command(request, room, 'start'));
    const live = await state(request, room, teams[0].teamToken);
    await success(await request.post(`/api/rooms/${room.code}/answer`, { headers: auth(teams[0].teamToken), data: answerBody(live) }));
    await success(await command(request, room, 'pause', { runId: live.runId }));
    const view = await state(request, room, teams[0].teamToken);
    writeFileSync(path, JSON.stringify({ room, teams, view } satisfies LegacyFixture), { encoding: 'utf8', mode: 0o600 });
  }
  const fixture = JSON.parse(readFileSync(path, 'utf8')) as LegacyFixture;
  const restored = await state(request, fixture.room, fixture.teams[0].teamToken);
  expect(restored.runId).toBe(fixture.view.runId);
  expect(restored.mission).toEqual(fixture.view.mission);
  expect(restored.draft).toEqual(fixture.view.draft);
  expect(restored.teams).toEqual(fixture.view.teams);
  expect(restored.deadlineMs).toBe(fixture.view.deadlineMs);
  expect((await state(request, fixture.room, fixture.room.hostToken)).role).toBe('host');
  for (const team of fixture.teams) expect((await state(request, fixture.room, team.teamToken)).role).toBe('team');
});
