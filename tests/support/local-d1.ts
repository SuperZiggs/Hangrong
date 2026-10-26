import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect } from '@playwright/test';
import type { Room } from './api';

export type StoredTask = { id: string; correctChoiceId: string; choices: { id: string; text: string }[] };
export type StoredRoom = {
  code: string; runId: string; startedAtMs: number; pausedMs: number;
  teams: { teamId: string; slot: number; recovery?: { hash: string; expiresAtMs: number }; rounds: { mission: { id: string; tasks: StoredTask[] } }[] }[];
};

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;

function execute(sql: string) {
  const result = spawnSync(process.execPath, [
    resolve('node_modules/wrangler/bin/wrangler.js'), 'd1', 'execute', 'DB', '--local',
    '--config', resolve('dist/server/wrangler.json'), '--persist-to', resolve('.wrangler/state'),
    '--command', sql, '--json',
  ], { cwd: process.cwd(), encoding: 'utf8', windowsHide: true, timeout: 30_000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  expect(result.status, `Local D1 fixture command failed: ${result.stderr || result.stdout}`).toBe(0);
  const parsed = JSON.parse(result.stdout);
  for (const item of parsed) expect(item.success).toBeTruthy();
  return parsed.at(-1);
}

/** Every query is scoped to a test-created room AND its host capability hash. No global writes. */
export function localD1(room: Room) {
  expect(room.code).toMatch(/^\d{6}$/);
  const hostHash = createHash('sha256').update(room.hostToken).digest('hex');
  const where = `code=${quote(room.code)} AND json_extract(state_json,'$.hostHash')=${quote(hostHash)}`;
  function update(jsonArguments: string, columns = '') {
    const reply = execute(`UPDATE game_rooms SET state_json=json_set(state_json,${jsonArguments}),version=version+1${columns} WHERE ${where}; SELECT changes() AS affected`);
    expect(reply.results[0].affected).toBe(1);
  }
  return {
    read(): StoredRoom {
      const reply = execute(`SELECT state_json FROM game_rooms WHERE ${where}`);
      expect(reply.results).toHaveLength(1);
      return JSON.parse(reply.results[0].state_json);
    },
    /** Uses the actual local SQLite clock; API server time remains unchanged. */
    elapsed(ms: number) {
      expect(Number.isSafeInteger(ms) && ms >= 0).toBeTruthy();
      update(`'$.startedAtMs',CAST(unixepoch('subsec')*1000 AS INTEGER)-${ms},'$.pausedAtMs',NULL,'$.pausedMs',0`);
    },
    expireRecovery(slot: number) {
      const stored = this.read();
      const index = stored.teams.findIndex(team => team.slot === slot);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(stored.teams[index].recovery).toBeDefined();
      update(`'$.teams[${index}].recovery.expiresAtMs',CAST(unixepoch('subsec')*1000 AS INTEGER)`);
    },
    expireRoom() {
      update("'$.expiresAtMs',CAST(unixepoch('subsec')*1000 AS INTEGER)", ",expires_at_ms=CAST(unixepoch('subsec')*1000 AS INTEGER)");
    },
  };
}
