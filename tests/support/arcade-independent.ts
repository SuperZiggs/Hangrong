import { randomBytes, randomUUID } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import type { Duplex } from 'node:stream';
import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';

export type ArcadeRoom = { code: string; hostToken: string; hostPath: string; joinPath: string; expiresAtMs: number };
export type ArcadePlayer = { code: string; playerId: string; name: string; playerToken: string; playPath: string };
export type ArcadeSnapshot = {
  runId: string; tick: number; elapsedMs: number; phase: string; paused: boolean;
  players: Record<string, { playerId?: string; name: string; x: number; y: number; coins: number; carriedOrderId: string | null; connected?: boolean }>;
  orders: Record<string, { id: string; ownerId: string | null; privateOwnerId: string | null; settled: boolean }>;
  map: unknown; gateFee: number; sharedRoute: unknown; lastInputSeq: Record<string, number> | number;
};
export type Bootstrap = { role: 'public' | 'host' | 'player'; wsUrl: string; snapshot: ArcadeSnapshot; you?: { playerId: string; name: string } };
export const arcadeToken = () => randomBytes(32).toString('base64url');
export const arcadeRequestId = () => randomUUID();
export const arcadeAuth = (token: string) => ({ Authorization: `Bearer ${token}` });
export const arcadeOrigin = () => process.env.ARCADE_SERVICE_URL ?? process.env.ACCEPTANCE_BASE_URL ?? 'http://127.0.0.1:5187';
export const arcadePath = (suffix = '') => new URL(`${process.env.ARCADE_SERVICE_URL ? '/rooms' : '/api/arcade/rooms'}${suffix}`, arcadeOrigin()).href;
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function arcadeOK(response: APIResponse) {
  expect(response.ok(), `Missing arcade behavior: ${response.url()} returned ${response.status()}; ${(await response.text()).slice(0, 160)}`).toBe(true);
  expect(response.headers()['content-type']).toContain('application/json');
  return response.json();
}

export async function arcadeError(response: APIResponse, allowed = [400, 401, 403, 409, 422, 429]) {
  expect(allowed).toContain(response.status());
  expect(response.headers()['content-type']).toContain('application/json');
  const body = await response.json();
  expect(body).toMatchObject({ error: { code: expect.any(String), message: expect.any(String) } });
  expect(body.error.code.length).toBeGreaterThan(0);
  expect(body.error.message.length).toBeGreaterThan(0);
  expect(JSON.stringify(body)).not.toMatch(/"(?:stack|stackTrace|hostToken|playerToken|tokenHash)"\s*:/i);
  return body;
}

export function noArcadeSecrets(value: unknown, secrets: string[]) {
  const json = JSON.stringify(value);
  expect(secrets.filter(secret => json.includes(secret))).toEqual([]);
  expect(json).not.toMatch(/"(?:hostToken|playerToken|tokenHash|hostHash|playerHash|recoveryHash|capabilityHash)"\s*:/i);
}

export async function createArcade(api: APIRequestContext, options: { requestId?: string; hostToken?: string } = {}): Promise<ArcadeRoom> {
  const hostToken = options.hostToken ?? arcadeToken();
  const value = await arcadeOK(await api.post(arcadePath(), { data: { requestId: options.requestId ?? arcadeRequestId(), hostToken } }));
  expect(value).toMatchObject({ code: expect.stringMatching(/^[A-Z2-7]{8}$/), hostPath: expect.any(String), joinPath: expect.any(String), expiresAtMs: expect.any(Number) });
  noArcadeSecrets(value, [hostToken]);
  return { ...value, hostToken };
}

export async function joinArcade(api: APIRequestContext, room: ArcadeRoom, name: string, options: { requestId?: string; playerToken?: string } = {}): Promise<ArcadePlayer> {
  const playerToken = options.playerToken ?? arcadeToken();
  const value = await arcadeOK(await api.post(arcadePath(`/${room.code}/join`), { data: { requestId: options.requestId ?? arcadeRequestId(), name, playerToken } }));
  expect(value).toMatchObject({ code: room.code, playerId: expect.any(String), playPath: expect.any(String) });
  noArcadeSecrets(value, [playerToken, room.hostToken]);
  return { ...value, name: name.trim(), playerToken };
}

export async function bootstrapArcade(api: APIRequestContext, room: ArcadeRoom, token?: string): Promise<Bootstrap> {
  const value = await arcadeOK(await api.get(arcadePath(`/${room.code}/bootstrap`), { headers: token ? arcadeAuth(token) : undefined }));
  expect(value).toMatchObject({ role: expect.stringMatching(/^(public|host|player)$/), wsUrl: expect.any(String), snapshot: {
    runId: expect.anything(), tick: expect.any(Number), elapsedMs: expect.any(Number), phase: expect.any(String), paused: expect.any(Boolean),
    players: expect.any(Object), orders: expect.any(Object), gateFee: expect.any(Number), sharedRoute: expect.anything(), lastInputSeq: expect.anything(), map: expect.anything(),
  } });
  noArcadeSecrets(value, [room.hostToken, ...(token ? [token] : [])]);
  return value;
}

export function hostArcade(api: APIRequestContext, room: ArcadeRoom, action: string, options: { requestId?: string; runId?: string; payload?: unknown } = {}, token = room.hostToken) {
  return api.post(arcadePath(`/${room.code}/host`), { headers: arcadeAuth(token), data: { requestId: arcadeRequestId(), ...options, action } });
}

export async function runningArcade(api: APIRequestContext, count = 3) {
  const room = await createArcade(api);
  const players = await Promise.all(Array.from({ length: count }, (_, i) => joinArcade(api, room, `Người ${i + 1}`)));
  await arcadeOK(await hostArcade(api, room, 'start'));
  const view = await bootstrapArcade(api, room, players[0].playerToken);
  return { room, players, view };
}

export function inputFrame(runId: string, seq: number, overrides: Record<string, unknown> = {}) {
  return { runId, seq, moveX: 0, moveY: 0, interactPressed: false, dashPressed: false, abandonHeld: false, ...overrides };
}

/** A small real RFC6455 test client, using Node built-ins so no new dependency is needed.
 * Explicit Origin allows both valid classroom-origin and hostile-origin acceptance checks. */
export class ArcadeSocket {
  private pending = Buffer.alloc(0);
  readonly messages: Record<string, unknown>[] = [];
  closed = false;
  constructor(private transport: Duplex) {
    transport.on('data', data => this.consume(Buffer.from(data)));
    transport.on('close', () => { this.closed = true; });
    transport.on('error', () => { this.closed = true; });
  }
  private consume(data: Buffer) {
    this.pending = Buffer.concat([this.pending, data]);
    while (this.pending.length >= 2) {
      const opcode = this.pending[0] & 15;
      let size = this.pending[1] & 127;
      let offset = 2;
      if (size === 126) { if (this.pending.length < 4) return; size = this.pending.readUInt16BE(2); offset = 4; }
      if (size === 127) { if (this.pending.length < 10) return; size = Number(this.pending.readBigUInt64BE(2)); offset = 10; }
      if (size > 4_000_000) { this.close(); return; }
      const masked = (this.pending[1] & 128) !== 0;
      const start = offset + (masked ? 4 : 0);
      if (this.pending.length < start + size) return;
      const payload = Buffer.from(this.pending.subarray(start, start + size));
      if (masked) for (let i = 0; i < size; i++) payload[i] ^= this.pending[offset + i % 4];
      this.pending = this.pending.subarray(start + size);
      if (opcode === 8) { this.closed = true; this.transport.end(); return; }
      if (opcode === 9) this.frame(payload, 10);
      if (opcode === 1) {
        try { this.messages.push(JSON.parse(payload.toString())); }
        catch { this.messages.push({ type: 'invalid-json', text: payload.toString() }); }
      }
    }
  }
  private frame(payload: Buffer, opcode = 1) {
    const mask = randomBytes(4);
    const header = Buffer.alloc(payload.length < 126 ? 2 : payload.length <= 65535 ? 4 : 10);
    header[0] = 128 | opcode;
    header[1] = 128 | (payload.length < 126 ? payload.length : payload.length <= 65535 ? 126 : 127);
    if (header.length === 4) header.writeUInt16BE(payload.length, 2);
    if (header.length === 10) header.writeBigUInt64BE(BigInt(payload.length), 2);
    const body = Buffer.from(payload);
    for (let i = 0; i < body.length; i++) body[i] ^= mask[i % 4];
    this.transport.write(Buffer.concat([header, mask, body]));
  }
  send(value: unknown) { this.frame(Buffer.from(JSON.stringify(value))); }
  close() { this.closed = true; this.transport.destroy(); }
  async next(type = 'snapshot', after = 0, timeoutMs = 7000): Promise<Record<string, unknown>> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const match = this.messages.slice(after).find(value => value.type === type);
      if (match) return match;
      if (this.closed) throw new Error(`Arcade socket closed before ${type}; messages=${JSON.stringify(this.messages).slice(-1000)}`);
      await sleep(20);
    }
    throw new Error(`No arcade ${type} within ${timeoutMs}ms; received ${JSON.stringify(this.messages).slice(-1000)}`);
  }
}

export function openArcadeSocket(wsUrl: string, token?: string, options: { origin?: string; authenticate?: boolean } = {}): Promise<ArcadeSocket> {
  const url = new URL(wsUrl, arcadeOrigin());
  url.protocol = url.protocol === 'wss:' || url.protocol === 'https:' ? 'https:' : 'http:';
  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).request(url, { headers: {
      Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': randomBytes(16).toString('base64'),
      Origin: options.origin ?? new URL(process.env.ACCEPTANCE_BASE_URL ?? arcadeOrigin()).origin,
    } });
    req.setTimeout(7000, () => req.destroy(new Error('Arcade websocket handshake timed out')));
    req.on('error', reject);
    req.on('response', response => { response.resume(); reject(new Error(`Arcade websocket refused HTTP ${response.statusCode}`)); });
    req.on('upgrade', (_response, socket, head) => {
      req.setTimeout(0);
      const client = new ArcadeSocket(socket);
      if (head.length) socket.unshift(head);
      if (options.authenticate !== false) client.send({ type: 'auth', ...(token ? { token } : {}) });
      resolve(client);
    });
    req.end();
  });
}
