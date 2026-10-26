import { randomBytes, randomUUID } from 'node:crypto';
import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';

export type Choice = { id: string; text: string };
export type Task = { id: string; prompt: string; choices: Choice[] };
export type Mission = { id: string; title: string; context: string; tasks: Task[] };
export type Draft = Record<string, { choiceId: string; seq: number }>;
export type Snapshot = {
  role: 'public' | 'host' | 'team'; code: string; roomVersion: number; runId: string;
  serverNowMs: number; phase: string; roundIndex: number; deadlineMs: number | null;
  teams: { slot: number; teamId: string; name: string; submitted: boolean }[];
  leaderboard: { rank: number; teamId: string; slot: number; name: string; score: number; roundScores: number[]; correctCount: number }[];
  mission?: Mission; draft?: Draft; locked?: boolean; results?: unknown;
};
export type Room = { code: string; hostToken: string; hostPath: string; joinPath: string; expiresAtMs: number };
export type Team = { slot: number; teamId: string; teamToken: string; name: string; playPath: string };

export const token = () => randomBytes(32).toString('base64url');
export const requestId = () => randomUUID();
export const auth = (capability: string) => ({ Authorization: `Bearer ${capability}` });

export async function success(response: APIResponse) {
  expect(response.ok(), `${response.url()} must succeed; status=${response.status()}, body=${(await response.text()).slice(0, 500)}`).toBeTruthy();
  expect(response.headers()['content-type']).toContain('application/json');
  return response.json();
}

export async function error(response: APIResponse, statuses: number | number[]) {
  expect(Array.isArray(statuses) ? statuses : [statuses]).toContain(response.status());
  expect(response.headers()['content-type']).toContain('application/json');
  const value = await response.json();
  expect(value).toEqual(expect.objectContaining({ error: expect.objectContaining({ code: expect.any(String), message: expect.any(String) }) }));
  expect(value.error.code.length).toBeGreaterThan(0);
  expect(value.error.message.length).toBeGreaterThan(0);
  expect(JSON.stringify(value)).not.toMatch(/\b(?:stack|stackTrace)\b|at [\w.$]+ \([^\n]*:\d+:\d+\)/);
  return value;
}

export async function createRoom(api: APIRequestContext): Promise<Room> {
  const hostToken = token();
  const body = await success(await api.post('/api/rooms', { data: { requestId: requestId(), hostToken } }));
  expect(body.code).toMatch(/^\d{6}$/);
  return { ...body, hostToken };
}

export async function join(api: APIRequestContext, room: Room, slot: number, teamToken = token()): Promise<Team> {
  const name = `Nhóm ${slot}`;
  const body = await success(await api.post(`/api/rooms/${room.code}/join`, { data: { requestId: requestId(), slot, name, teamToken } }));
  expect(body).toMatchObject({ code: room.code, slot, teamId: expect.any(String), playPath: expect.any(String) });
  return { ...body, teamToken, name };
}

export async function state(api: APIRequestContext, room: Room, capability?: string): Promise<Snapshot> {
  const value = await success(await api.get(`/api/rooms/${room.code}/state`, { headers: capability ? auth(capability) : undefined }));
  expect(value).toEqual(expect.objectContaining({
    role: expect.any(String), code: room.code, roomVersion: expect.any(Number),
    serverNowMs: expect.any(Number), phase: expect.any(String), roundIndex: expect.any(Number),
    teams: expect.any(Array), leaderboard: expect.any(Array),
  }));
  expect(Object.hasOwn(value, 'runId')).toBeTruthy();
  expect(Object.hasOwn(value, 'deadlineMs')).toBeTruthy();
  for (const team of value.teams) expect(team).toEqual(expect.objectContaining({ slot: expect.any(Number), teamId: expect.any(String), name: expect.any(String), submitted: expect.any(Boolean) }));
  for (const entry of value.leaderboard) expect(entry).toEqual(expect.objectContaining({ rank: expect.any(Number), teamId: expect.any(String), slot: expect.any(Number), name: expect.any(String), score: expect.any(Number), roundScores: expect.any(Array), correctCount: expect.any(Number) }));
  return value;
}

export async function command(api: APIRequestContext, room: Room, action: string, options: { runId?: string; payload?: unknown; requestId?: string } = {}) {
  return api.post(`/api/rooms/${room.code}/host`, { headers: auth(room.hostToken), data: { requestId: requestId(), ...options, action } });
}

export async function startRoom(api: APIRequestContext, count = 2) {
  const room = await createRoom(api);
  const teams = await Promise.all(Array.from({ length: count }, (_, index) => join(api, room, index + 1)));
  await success(await command(api, room, 'start'));
  const snapshot = await state(api, room, teams[0].teamToken);
  expect(snapshot.runId).toEqual(expect.any(String));
  expect(snapshot.roundIndex).toBe(1);
  expect(snapshot.deadlineMs).toBeGreaterThan(snapshot.serverNowMs);
  expect(snapshot.mission).toBeDefined();
  return { room, teams, snapshot };
}

export function answerBody(snapshot: Snapshot, task = snapshot.mission!.tasks[0], choice = task.choices[0], seq = 1) {
  return { requestId: requestId(), runId: snapshot.runId, roundIndex: snapshot.roundIndex, taskId: task.id, choiceId: choice.id, seq };
}

export function submitBody(snapshot: Snapshot, answers = snapshot.mission!.tasks.map(task => ({ taskId: task.id, choiceId: task.choices[0].id, seq: 1 }))) {
  return { requestId: requestId(), runId: snapshot.runId, roundIndex: snapshot.roundIndex, answers };
}

export function assertNoSecrets(value: unknown, capabilities: string[]) {
  const json = JSON.stringify(value);
  for (const capability of capabilities) expect(json).not.toContain(capability);
  expect(json).not.toMatch(/"(?:hostToken|teamToken|tokenHash|recoveryCode|recoveryHash)"\s*:/i);
}

export function assertNoKeys(value: unknown) {
  expect(JSON.stringify(value)).not.toMatch(/"(?:correctChoiceId|correctAnswer|isCorrect|correct|explanation|answerKey|answerBank)"\s*:/i);
}
