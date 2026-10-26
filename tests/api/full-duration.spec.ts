import { test, expect, type APIRequestContext } from '@playwright/test';
import { answerBody, assertNoKeys, auth, command, createRoom, join, state, submitBody, success, type Snapshot, type Team } from '../support/api';

type Feedback = { roundIndex: number; score: number; answers: { points: number; correct: boolean; correctChoiceId: string; selectedChoiceId: string | null; explanation: string }[] };

test('real duration: six independent teams complete 120/45/15 × 3 and retain final board for a minute', async ({ playwright, baseURL }) => {
  test.skip(process.env.RUN_REAL_DURATION !== '1', 'Run explicitly with RUN_REAL_DURATION=1; this uses 600 real seconds and no clock/DB acceleration.');
  test.setTimeout(680_000);
  const clients: APIRequestContext[] = [];
  try {
    const host = await playwright.request.newContext({ baseURL });
    clients.push(host);
    const room = await createRoom(host);
    const players: { api: APIRequestContext; team: Team }[] = [];
    for (let slot = 1; slot <= 6; slot++) {
      const api = await playwright.request.newContext({ baseURL });
      clients.push(api);
      players.push({ api, team: await join(api, room, slot) });
    }
    await success(await command(host, room, 'start'));
    const initial = await state(host, room, room.hostToken);
    const gameStart = initial.deadlineMs! - 120_000;
    const progress = (message: string) => console.log(`[real-duration room ${room.code}, +${Math.round((Date.now() - gameStart) / 1000)}s] ${message}`);
    progress('started; six independent HTTP contexts; no fixture clock changes');

    async function phaseAfter(deadline: number, phase: string, roundIndex: number): Promise<Snapshot> {
      for (;;) {
        const view = await state(host, room, room.hostToken);
        const remaining = deadline - view.serverNowMs;
        if (remaining <= 0) {
          expect(view.phase).toBe(phase);
          expect(view.roundIndex).toBe(roundIndex);
          progress(`observed ${phase}, round ${roundIndex}`);
          return view;
        }
        progress(`waiting ${Math.ceil(remaining / 1000)}s for ${phase}, round ${roundIndex}`);
        await new Promise(resolve => setTimeout(resolve, Math.min(15_000, remaining + 100)));
      }
    }

    const expectedScores = new Map(players.map(player => [player.team.teamId, 0]));
    for (let roundIndex = 1; roundIndex <= 3; roundIndex++) {
      const views = await Promise.all(players.map(player => state(player.api, room, player.team.teamToken)));
      expect(new Set(views.map(view => view.mission!.id)).size).toBe(6);
      for (const view of views) {
        expect(view.phase).toBe('answering');
        expect(view.roundIndex).toBe(roundIndex);
        expect(view.deadlineMs).toBe(gameStart + (roundIndex - 1) * 180_000 + 120_000);
        assertNoKeys(view.mission);
      }
      await Promise.all(players.map(async (player, index) => {
        const view = views[index];
        // Acknowledged autosave plus early submit; all six teams must retain their own work.
        await success(await player.api.post(`/api/rooms/${room.code}/answer`, { headers: auth(player.team.teamToken), data: answerBody(view) }));
        await success(await player.api.post(`/api/rooms/${room.code}/submit`, { headers: auth(player.team.teamToken), data: submitBody(view) }));
      }));
      const submitted = await state(host, room, room.hostToken);
      expect(submitted.teams.filter(team => team.submitted)).toHaveLength(6);
      expect(submitted.phase).toBe('answering');
      expect(submitted.deadlineMs).toBe(views[0].deadlineMs);
      progress(`all six submitted round ${roundIndex}; original answering deadline remains`);

      const review = await phaseAfter(gameStart + (roundIndex - 1) * 180_000 + 120_000, 'review', roundIndex);
      expect(review.deadlineMs).toBe(gameStart + (roundIndex - 1) * 180_000 + 165_000);
      for (const player of players) {
        const view = await state(player.api, room, player.team.teamToken);
        const feedback = (view.results as Feedback[]).find(result => result.roundIndex === roundIndex)!;
        expect(feedback).toBeDefined();
        expect(feedback.answers).toHaveLength(3);
        let score = 0;
        for (const answer of feedback.answers) {
          const correct = answer.selectedChoiceId === answer.correctChoiceId;
          expect(answer.correct).toBe(correct);
          expect(answer.points).toBe(correct ? 10 : 0);
          expect(answer.explanation.length).toBeGreaterThan(0);
          score += answer.points;
        }
        expect(feedback.score).toBe(score);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(30);
        expectedScores.set(player.team.teamId, expectedScores.get(player.team.teamId)! + score);
      }
      const board = await phaseAfter(gameStart + (roundIndex - 1) * 180_000 + 165_000, 'leaderboard', roundIndex);
      expect(board.deadlineMs).toBe(gameStart + roundIndex * 180_000);
      for (const row of board.leaderboard) expect(row.score).toBe(expectedScores.get(row.teamId));
      await phaseAfter(gameStart + roundIndex * 180_000, roundIndex === 3 ? 'finished' : 'answering', Math.min(3, roundIndex + 1));
    }
    const finished = await state(host, room, room.hostToken);
    expect(finished.serverNowMs - gameStart).toBeGreaterThanOrEqual(540_000);
    expect(finished.serverNowMs - gameStart).toBeLessThan(545_000);
    expect(finished.leaderboard).toHaveLength(6);
    for (const row of finished.leaderboard) {
      expect(row.score).toBe(row.roundScores.reduce((sum, score) => sum + score, 0));
      expect(row.score).toBeLessThanOrEqual(90);
      expect(row.correctCount * 10).toBe(row.score);
    }
    const csv = await host.get(`/api/rooms/${room.code}/export`, { headers: auth(room.hostToken) });
    expect(csv.ok()).toBeTruthy();
    expect(csv.headers()['content-type']).toContain('text/csv');
    expect((await csv.text()).trim().split(/\r?\n/)).toHaveLength(7);
    progress('540-second game finished; checking final board stays for classroom debrief');
    await phaseAfter(gameStart + 600_000, 'finished', 3);
    const afterDebrief = await state(host, room, room.hostToken);
    expect(afterDebrief.leaderboard).toEqual(finished.leaderboard);
    expect(afterDebrief.runId).toBe(finished.runId);
    progress('final board unchanged after one-minute debrief; passed');
  } finally {
    for (const client of clients) await client.dispose();
  }
});
