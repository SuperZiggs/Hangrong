import { describe, expect, it } from 'vitest';
import { advanceRoom, buildView, createState, joinState, startRun } from '../../server/game/engine';

const NOW = 1_800_000_000_000;
function lobby(count: number) {
  const room = createState('123456', 'host-hash', NOW, 'flexible-independent');
  for (let index = 1; index <= count; index++) joinState(room, index, index % 2 ? `Người ${index}` : `Nhóm ${index}`, `capability-${index}`);
  return room;
}

describe('independent flexible participation requirements', () => {
  it.each([0, 1, 2])('refuses to start with %i entrants', count => {
    const room = lobby(count);
    expect(() => startRun(room, NOW, 'seed-independent', 'run-independent')).toThrow();
    expect(room.startedAtMs).toBeNull();
    expect(room.teams.every(team => team.rounds.length === 0)).toBe(true);
  });
  it('starts exactly three solo/group entrants without a host mode configuration', () => {
    const room = lobby(3);
    expect(() => startRun(room, NOW, 'seed-independent', 'run-independent')).not.toThrow();
    expect(room.teams.every(team => team.rounds.length === 3)).toBe(true);
  });
  it.each([26, 40])('assigns balanced independent choices to %i entrants across all three rounds and retains 90-point scoring', count => {
    const room = lobby(count);
    expect(() => startRun(room, NOW, 'seed-independent', 'run-independent')).not.toThrow();
    for (let roundIndex = 0; roundIndex < 3; roundIndex++) {
      const frequencies = new Map<string, number>();
      const orders = new Map<string, Set<string>>();
      for (const team of room.teams) {
        const mission = team.rounds[roundIndex].mission;
        expect(mission.tasks).toHaveLength(3);
        frequencies.set(mission.id, (frequencies.get(mission.id) ?? 0) + 1);
        const variants = orders.get(mission.id) ?? new Set<string>();
        variants.add(JSON.stringify(mission.tasks.map(task => task.choices.map(choice => choice.text))));
        orders.set(mission.id, variants);
        for (const task of mission.tasks) {
          expect(task.choices).toHaveLength(4);
          team.rounds[roundIndex].draft[task.id] = { choiceId: task.correctChoiceId, seq: 1 };
        }
      }
      expect(frequencies.size).toBe(6);
      expect(Math.max(...frequencies.values()) - Math.min(...frequencies.values())).toBeLessThanOrEqual(1);
      for (const variants of orders.values()) expect(variants.size).toBeGreaterThan(1);
    }
    advanceRoom(room, NOW + 540_000);
    const board = buildView(room, { role: 'host' }, NOW + 540_000).leaderboard;
    expect(board).toHaveLength(count);
    for (const row of board) expect(row).toMatchObject({ rank: 1, score: 90, correctCount: 9, roundScores: [30, 30, 30] });
  });
});
