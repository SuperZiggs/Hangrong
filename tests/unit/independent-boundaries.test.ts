import { describe, expect, it } from 'vitest';
import { createState, joinState, phaseOf, saveChoice, startRun, submitRound } from '../../server/game/engine';

function running() {
  const room = createState('123456', 'host-hash', 1_000_000, 'independent-boundary-room');
  const team = joinState(room, 1, 'Nhóm Một', 'team-hash-one');
  joinState(room, 2, 'Nhóm Hai', 'team-hash-two');
  joinState(room, 3, 'Người Ba', 'team-hash-three');
  startRun(room, 1_000_000, 'independent-boundary-seed', 'independent-boundary-run');
  const task = team.rounds[0].mission.tasks[0];
  const answer = { runId: room.runId!, roundIndex: 1, taskId: task.id, choiceId: task.choices[0].id, seq: 1 };
  return { room, team, answer };
}

describe('independent exact millisecond boundaries from the frozen 120/45/15 requirements', () => {
  it('accepts an answer at deadline minus one millisecond and rejects at or after the deadline', () => {
    const { room, team, answer } = running();
    expect(() => saveChoice(room, team, answer, 1_119_999)).not.toThrow();
    const saved = structuredClone(team.rounds[0].draft);
    for (const now of [1_120_000, 1_120_001]) {
      expect(() => saveChoice(room, team, { ...answer, seq: 2 }, now)).toThrow();
      expect(team.rounds[0].draft).toEqual(saved);
    }
  });
  it('accepts submit immediately before deadline and rejects fresh submits exactly at deadline', () => {
    const before = running();
    expect(() => submitRound(before.room, before.team, { ...before.answer, answers: [before.answer] }, 1_119_999)).not.toThrow();
    expect(before.team.rounds[0].locked).toBe(true);
    for (const now of [1_120_000, 1_120_001]) {
      const at = running();
      expect(() => submitRound(at.room, at.team, { ...at.answer, answers: [at.answer] }, now)).toThrow();
      expect(at.team.rounds[0].draft).toEqual({});
      expect(at.team.rounds[0].locked).toBe(false);
    }
  });
  it('changes phases at 120000, 165000 and 180000ms each round, finishing exactly at 540000ms', () => {
    const { room } = running();
    for (let round = 1; round <= 3; round++) {
      const offset = (round - 1) * 180_000;
      for (const [elapsed, phase] of [[0, 'answering'], [119_999, 'answering'], [120_000, 'review'], [164_999, 'review'], [165_000, 'leaderboard'], [179_999, 'leaderboard']] as const) {
        expect(phaseOf(room, 1_000_000 + offset + elapsed)).toMatchObject({ phase, roundIndex: round });
      }
    }
    expect(phaseOf(room, 1_540_000)).toMatchObject({ phase: 'finished', roundIndex: 3, deadlineMs: null });
  });
});
