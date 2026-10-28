import { test, expect, type BrowserContext } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import { openArcadeSocket } from '../support/arcade-independent';

const PUBLIC = 'https://hangrong.vercel.app';
const SECRET = 'hosting-acceptance-only-shared-secret-2026';
const GATEWAY = 'http://127.0.0.1:5206';
const PRIVATE = 'http://127.0.0.1:5205';
const LOCAL = 'http://127.0.0.1:5208';
const capability = () => randomBytes(32).toString('base64url');
const id = () => randomUUID();
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
type Room = { code: string; hostToken: string; hostPath: string; joinPath: string };

async function call(path: string, options: { method?: string; data?: unknown; raw?: string; headers?: Record<string, string>; base?: string } = {}) {
  const hasBody = options.raw !== undefined || options.data !== undefined;
  return fetch(`${options.base ?? GATEWAY}${path}`, {
    method: options.method ?? (hasBody ? 'POST' : 'GET'),
    headers: { ...(hasBody ? { 'content-type': 'application/json' } : {}), ...options.headers },
    body: options.raw ?? (options.data === undefined ? undefined : JSON.stringify(options.data)),
    redirect: 'manual', signal: AbortSignal.timeout(12_000),
  });
}

async function ok(response: Response) {
  const body = await response.text();
  expect(response.status, `${response.url}: ${body.slice(0, 300)}`).toBe(200);
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(response.headers.get('content-type')).toContain('application/json');
  return JSON.parse(body);
}

async function rejected(response: Response, statuses = [403]) {
  const body = await response.text();
  expect(statuses, `${response.url}: ${response.status} ${body.slice(0, 300)}`).toContain(response.status);
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(response.headers.get('content-type')).toContain('application/json');
  const value = JSON.parse(body);
  expect(value).toMatchObject({ error: { code: expect.any(String), message: expect.any(String) } });
  expect(body).not.toContain(SECRET);
  expect(body).not.toMatch(/"(?:stack|stackTrace|hostHash|tokenHash)"\s*:/);
  return value;
}

async function create(kind: 'quiz' | 'arcade' = 'quiz', headers: Record<string, string> = {}, base = GATEWAY): Promise<Room> {
  const hostToken = capability();
  const path = kind === 'quiz' ? '/api/rooms' : '/api/arcade/rooms';
  return { ...await ok(await call(path, { data: { requestId: id(), hostToken }, headers, base })), hostToken };
}

test('H01 quiz create/join/host/state works through authenticated public-origin gateway', async () => {
  const headers = { origin: PUBLIC, 'x-test-visitor-ip': '192.0.2.11' };
  const hostToken = capability(); const requestId = id();
  const room = await ok(await call('/api/rooms', { headers, data: { requestId, hostToken } }));
  const retry = await ok(await call('/api/rooms', { headers, data: { requestId, hostToken } }));
  expect(retry.code).toBe(room.code);
  expect(room.joinPath).toBe(`/?room=${room.code}`);
  const teamTokens = [capability(), capability(), capability()];
  for (const [index, teamToken] of teamTokens.entries()) await ok(await call(`/api/rooms/${room.code}/join`, {
    headers: { origin: PUBLIC, 'x-test-visitor-ip': `192.0.2.${index + 12}` }, data: { requestId: id(), teamToken, name: `Đội học ${index + 1}` },
  }));
  await ok(await call(`/api/rooms/${room.code}/host`, { headers: { ...headers, ...bearer(hostToken) }, data: { requestId: id(), action: 'start' } }));
  const host = await ok(await call(`/api/rooms/${room.code}/state?probe=public%20gateway&repeat=1&repeat=2`, { headers: { ...headers, ...bearer(hostToken) } }));
  expect(host.role).toBe('host'); expect(host.teams).toHaveLength(3); expect(host.runId).toEqual(expect.any(String));
  const team = await ok(await call(`/api/rooms/${room.code}/state`, { headers: { ...headers, ...bearer(teamTokens[0]) } }));
  expect(team.role).toBe('team'); expect(team.mission).toBeDefined();
  const publicView = await ok(await call(`/api/rooms/${room.code}/state`, { headers }));
  expect(publicView.role).toBe('public'); expect(publicView.mission).toBeUndefined();
  for (const token of [hostToken, ...teamTokens]) expect(JSON.stringify(publicView)).not.toContain(token);
});

test('H02 arcade HTTP gateway preserves create/join/host/bootstrap and direct realtime URL', async () => {
  const headers = { origin: PUBLIC, 'x-test-visitor-ip': '192.0.2.21' };
  const room = await create('arcade', headers);
  expect(room.joinPath).toBe(`/arcade?room=${room.code}`);
  const players = [];
  for (let i = 0; i < 3; i++) {
    const token = capability();
    const player = await ok(await call(`/api/arcade/rooms/${room.code}/join`, { headers, data: { requestId: id(), playerToken: token, name: `Người chơi ${i + 1}` } }));
    players.push({ ...player, token });
  }
  await ok(await call(`/api/arcade/rooms/${room.code}/host`, { headers: { ...headers, ...bearer(room.hostToken) }, data: { requestId: id(), action: 'start' } }));
  for (const [token, role] of [[room.hostToken, 'host'], [players[0].token, 'player'], [undefined, 'public']] as const) {
    const value = await ok(await call(`/api/arcade/rooms/${room.code}/bootstrap?probe=%C4%91%C3%BAng`, { headers: { ...headers, ...(token ? bearer(token) : {}) } }));
    expect(value.role).toBe(role); expect(Object.keys(value.snapshot.players)).toHaveLength(3);
    expect(new URL(value.wsUrl).origin).toBe('ws://127.0.0.1:5207');
    for (const secret of [room.hostToken, ...players.map(player => player.token)]) expect(JSON.stringify(value)).not.toContain(secret);
  }
});

for (const [name, secret] of [['missing', undefined], ['wrong', 'attacker-secret'], ['case changed', SECRET.toUpperCase()], ['secret prefix', `${SECRET}-extra`]] as const) {
  test(`H03 enabled gateway rejects ${name} secret even with forged visitor/domain headers`, async () => {
    const response = await call('/api/rooms', { base: PRIVATE, data: { requestId: id(), hostToken: capability() }, headers: {
      ...(secret ? { 'x-origin-secret': secret } : {}), 'x-real-ip': '192.0.2.31', 'x-forwarded-for': '192.0.2.32',
      'x-forwarded-host': 'hangrong.vercel.app', 'x-forwarded-proto': 'https', 'cf-connecting-ip': `198.51.100.${40 + name.length}`,
    } });
    await rejected(response);
  });
}

for (const origin of ['https://evil.example', 'https://hangrong.vercel.app.evil.example', 'https://child.hangrong.vercel.app', 'http://hangrong.vercel.app', 'null', 'https://other.vercel.app']) {
  test(`H03 exact public Origin rejects ${origin} for quiz and arcade`, async () => {
    for (const path of ['/api/rooms', '/api/arcade/rooms']) await rejected(await call(path, {
      headers: { origin }, data: { requestId: id(), hostToken: capability() },
    }));
  });
}

test('H04 valid secret cannot use forged forwarded host/protocol to authorize hostile Origin', async () => {
  for (const path of ['/api/rooms', '/api/arcade/rooms']) await rejected(await call(path, {
    headers: { origin: 'https://evil.example', 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https', 'x-forwarded-for': '192.0.2.44' },
    data: { requestId: id(), hostToken: capability() },
  }));
});

test('H05 authenticated gateway rate-limits visitors separately despite one Cloudflare peer', async () => {
  const peer = { 'x-test-peer-ip': '203.0.113.77' };
  const visitorA = { ...peer, 'x-test-visitor-ip': '192.0.2.51' };
  for (let i = 0; i < 10; i++) await create('quiz', visitorA);
  await rejected(await call('/api/rooms', { headers: visitorA, data: { requestId: id(), hostToken: capability() } }), [429]);
  // All requests still cross the same proxy, and Worker sees the same CF-Connecting-IP.
  await create('quiz', { ...peer, 'x-test-visitor-ip': '192.0.2.52' });
  await rejected(await call('/api/rooms', { headers: { ...visitorA, 'x-forwarded-for': '192.0.2.199', 'x-real-ip': '192.0.2.198' }, data: { requestId: id(), hostToken: capability() } }), [429]);
});

test('H06 direct mode ignores untrusted forwarded visitor IPs and keeps Cloudflare IP limit', async () => {
  for (let i = 0; i < 10; i++) await create('quiz', { origin: LOCAL, 'cf-connecting-ip': '198.51.100.90', 'x-real-ip': `192.0.2.${60 + i}`, 'x-forwarded-for': `192.0.2.${80 + i}` }, LOCAL);
  await rejected(await call('/api/rooms', { base: LOCAL, headers: { origin: LOCAL, 'cf-connecting-ip': '198.51.100.90', 'x-real-ip': '192.0.2.150', 'x-forwarded-for': '192.0.2.151', 'x-origin-secret': SECRET }, data: { requestId: id(), hostToken: capability() } }), [429]);
});

test('H07 proxy retains bearer capabilities, UTF-8 bodies, GET query and method semantics', async () => {
  const room = await create(); const teamToken = capability();
  await ok(await call(`/api/rooms/${room.code}/join`, { data: { requestId: id(), teamToken, name: 'Nhóm Cà phê' } }));
  const host = await ok(await call(`/api/rooms/${room.code}/state?probe=body%2Fquery&probe=2`, { headers: bearer(room.hostToken) }));
  expect(host.role).toBe('host'); expect(host.teams[0].name).toBe('Nhóm Cà phê');
  for (const token of [undefined, teamToken, capability()]) {
    const headers = token ? bearer(token) : {};
    await rejected(await call(`/api/rooms/${room.code}/host`, { headers, data: { requestId: id(), action: 'rename', payload: { slot: host.teams[0].slot, name: 'Chiếm quyền' } } }), [401, 403]);
    await rejected(await call(`/api/rooms/${room.code}/export?probe=capability`, { headers }), [401, 403]);
  }
  const wrongMethod = await call(`/api/rooms/${room.code}/host`, { method: 'PUT', headers: bearer(room.hostToken) });
  expect([404, 405]).toContain(wrongMethod.status);
  await wrongMethod.text();
  const after = await ok(await call(`/api/rooms/${room.code}/state`, { headers: bearer(room.hostToken) }));
  expect(after.teams[0].name).toBe('Nhóm Cà phê'); expect(after.phase).toBe('lobby');
});

test('H07 bounded and malformed JSON remain rejected with no-store through gateway', async () => {
  for (const path of ['/api/rooms', '/api/arcade/rooms']) {
    await rejected(await call(path, { raw: '{"invalid":' }), [400, 422]);
    await rejected(await call(path, { raw: JSON.stringify({ requestId: id(), hostToken: capability(), padding: 'ế'.repeat(8193) }) }), [400, 413, 422]);
  }
});

test('H07 arcade proxy preserves authorization for host commands and export', async () => {
  const room = await create('arcade'); const token = capability();
  await ok(await call(`/api/arcade/rooms/${room.code}/join`, { data: { requestId: id(), playerToken: token, name: 'Người học' } }));
  for (const actor of [undefined, token, capability()]) {
    const headers = actor ? bearer(actor) : {};
    await rejected(await call(`/api/arcade/rooms/${room.code}/host`, { headers, data: { requestId: id(), action: 'rename', payload: { name: 'Chiếm quyền' } } }), [401, 403]);
    await rejected(await call(`/api/arcade/rooms/${room.code}/export`, { headers }), [401, 403]);
  }
  const view = await ok(await call(`/api/arcade/rooms/${room.code}/bootstrap?probe=auth`, { headers: bearer(room.hostToken) }));
  expect(view.role).toBe('host'); expect(Object.values(view.snapshot.players)).toHaveLength(1);
});

test('H08 realtime socket authenticates public Origin and rejects nearby origins directly', async () => {
  const room = await create('arcade');
  const view = await ok(await call(`/api/arcade/rooms/${room.code}/bootstrap`, { headers: bearer(room.hostToken) }));
  expect(new URL(view.wsUrl).origin).toBe('ws://127.0.0.1:5207');
  const socket = await openArcadeSocket(view.wsUrl, room.hostToken, { origin: PUBLIC });
  try { expect((await socket.next()).type).toBe('snapshot'); } finally { socket.close(); }
  for (const origin of ['null', 'https://evil.example', 'http://hangrong.vercel.app', 'https://child.hangrong.vercel.app', 'https://hangrong.vercel.app.evil.example', 'https://other.vercel.app']) {
    await expect(openArcadeSocket(view.wsUrl, room.hostToken, { origin })).rejects.toThrow(/HTTP 403/);
  }
});

async function publicBrowser(context: BrowserContext) {
  // Keep document.location at the true HTTPS public origin. Every HTTP fetch still
  // crosses the actual proxy and Worker; there are no mocked application replies.
  await context.route(`${PUBLIC}/**`, async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `${GATEWAY}${url.pathname}${url.search}`, headers: { ...route.request().headers(), 'x-test-visitor-ip': '192.0.2.201' } });
    await route.fulfill({ response });
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as unknown as { copiedJoinURL: string }).copiedJoinURL = text; } } });
  });
}

for (const kind of ['quiz', 'arcade'] as const) {
  test(`H09 ${kind} host QR and copy link retain public Vercel document origin`, async ({ browser }) => {
    const context = await browser.newContext();
    try {
      await publicBrowser(context);
      const page = await context.newPage();
      await page.goto(`${PUBLIC}${kind === 'quiz' ? '/' : '/arcade'}`);
      const endpoint = kind === 'quiz' ? '/api/rooms' : '/api/arcade/rooms';
      let created: { code: string } | undefined;
      let createStatus: number | undefined;
      let createText: string | undefined;
      await page.route(`${PUBLIC}${endpoint}`, async route => {
        const response = await route.fetch({ url: `${GATEWAY}${endpoint}`, headers: { ...route.request().headers(), origin: PUBLIC, 'x-test-visitor-ip': '192.0.2.201' } });
        createStatus = response.status(); createText = await response.text();
        created = await response.json(); await route.fulfill({ response });
      });
      const createResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === endpoint);
      await page.getByRole('button', { name: /tạo phòng/i }).click();
      await createResponse;
      expect(createStatus, `Public browser create failed: ${createText}`).toBe(200);
      await page.waitForURL(kind === 'quiz' ? /\/host\/\d{6}$/ : /\/arcade\/host\/[A-Z2-7]{8}$/);
      await expect(page.getByRole('img', { name: /QR/i }).first()).toBeVisible();
      await page.getByRole('button', { name: /sao chép/i }).click();
      const expected = `${PUBLIC}${kind === 'quiz' ? '/' : '/arcade'}?room=${created!.code}`;
      await expect.poll(() => page.evaluate(() => (window as unknown as { copiedJoinURL: string }).copiedJoinURL)).toBe(expected);
      expect(new URL(page.url()).origin).toBe(PUBLIC);
    } finally { await context.close(); }
  });
}

test('H10 no-gateway local direct mode still creates and joins quiz and arcade', async () => {
  const headers = { origin: LOCAL, 'cf-connecting-ip': '198.51.100.99' };
  const quiz = await create('quiz', headers, LOCAL);
  const teamToken = capability();
  await ok(await call(`/api/rooms/${quiz.code}/join`, { base: LOCAL, headers, data: { requestId: id(), teamToken, name: 'Đội tại chỗ' } }));
  expect((await ok(await call(`/api/rooms/${quiz.code}/state`, { base: LOCAL, headers: { ...headers, ...bearer(teamToken) } }))).role).toBe('team');
  const arcade = await create('arcade', headers, LOCAL);
  await ok(await call(`/api/arcade/rooms/${arcade.code}/join`, { base: LOCAL, headers, data: { requestId: id(), playerToken: capability(), name: 'Chơi tại chỗ' } }));
  const view = await ok(await call(`/api/arcade/rooms/${arcade.code}/bootstrap`, { base: LOCAL, headers: { ...headers, ...bearer(arcade.hostToken) } }));
  expect(view.role).toBe('host'); expect(Object.keys(view.snapshot.players)).toHaveLength(1);
  await rejected(await call('/api/rooms', { base: LOCAL, headers: { origin: 'https://evil.example' }, data: { requestId: id(), hostToken: capability() } }));
});
