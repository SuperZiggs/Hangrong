import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { requestId, success, token, type Room, type Snapshot, type Team } from './api';

/** Only the documented transient CAS conflict is retried, with the same request and capability. */
export async function classroomRequest(send: () => Promise<APIResponse>): Promise<APIResponse> {
  for (let attempt = 0; ; attempt++) {
    const response = await send();
    if (response.status() !== 409 || attempt === 6) return response;
    const body = await response.json();
    if (body.error?.code !== 'BUSY') return response;
    await new Promise(resolve => setTimeout(resolve, 40 * (attempt + 1)));
  }
}

export async function joinEntrant(api: APIRequestContext, room: Room, name: string, options: { teamToken?: string; requestId?: string; ip?: string } = {}): Promise<Team> {
  const teamToken = options.teamToken ?? token();
  const data = { requestId: options.requestId ?? requestId(), name, teamToken };
  const result = await success(await classroomRequest(() => api.post(`/api/rooms/${room.code}/join`, { headers: options.ip ? { 'cf-connecting-ip': options.ip } : undefined, data })));
  expect(result).toMatchObject({ code: room.code, teamId: expect.any(String), playPath: expect.any(String), slot: expect.any(Number) });
  expect(Number.isSafeInteger(result.slot) && result.slot > 0).toBe(true);
  return { ...result, name, teamToken };
}

export function assertBalanced(views: Snapshot[]) {
  const frequency = new Map<string, number>();
  for (const view of views) frequency.set(view.mission!.id, (frequency.get(view.mission!.id) ?? 0) + 1);
  expect(frequency.size).toBe(Math.min(6, views.length));
  expect(Math.max(...frequency.values()) - Math.min(...frequency.values())).toBeLessThanOrEqual(1);
  if (views.length > 6) for (const id of frequency.keys()) {
    const repeated = views.filter(view => view.mission!.id === id);
    if (repeated.length > 1) expect(new Set(repeated.map(view => JSON.stringify(view.mission!.tasks.map(task => task.choices.map(choice => choice.text))))).size).toBeGreaterThan(1);
  }
}
