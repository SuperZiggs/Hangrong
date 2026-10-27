import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

type Point = { x: number; y: number };
type Rect = Point & { w: number; h: number };
type Player = Point & { name: string; home: Point; coins: number; carriedOrderId: string | null; dashRemainingMs: number; dashCooldownMs: number; pushProtectionMs: number; connected: boolean };
type Order = { id: string; pickup: Point; delivery: Point; value: number; ownerId: string | null; privateOwnerId: string | null; lockedFee: number | null; settled: boolean };
type World = {
  runId: string; players: Record<string, Player>; orders: Record<string, Order>; elapsedMs: number; phase: string; paused: boolean; gateFee: number;
  sharedRoute: unknown;
  map: { width: number; height: number; walls: Rect[]; gate: Rect; sharedBarrier: Rect; sharedRouteRect: Rect; shops: Point[]; pickups: Point[]; deliveries: Point[]; stations: (Point & { kind: string; ownerId?: string })[] };
};
type Frame = { runId: string; seq: number; moveX: number; moveY: number; interactPressed: boolean; dashPressed: boolean; abandonHeld: boolean };
type API = {
  createWorld: (options: { seed: string; initialCoins: number; roster: { playerId: string; name: string }[] }) => World;
  stepWorld: (world: World, inputs: Map<string, Frame>, dtMs: number) => void;
  advanceMotion: (world: World, inputs: Map<string, Frame>, dtMs: number) => void;
  projectSnapshot: (world: World, actor: { role: string; playerId?: string }) => { orders: Record<string, Order>; leaderboard: { playerId: string; coins: number; rank: number }[] };
  generateMap: (count: number, seed: string) => World['map'];
};

async function entry<K extends keyof API>(module: string, name: K): Promise<API[K]> {
  const filename = resolve(`shared/arcade/${module}.ts`);
  expect(existsSync(filename), `Missing arcade behavior: frozen public entry point shared/arcade/${module}.ts (${name}) has not been implemented`).toBe(true);
  // A missing frozen entry point is valid RED. Any other import error propagates unchanged.
  const imported = await import(/* @vite-ignore */ pathToFileURL(filename).href);
  expect(imported[name], `Frozen arcade export ${name} must exist`).toBeTypeOf('function');
  return imported[name] as API[K];
}
async function setup(count = 3) {
  const create = await entry('world', 'createWorld');
  const world = create({ seed: 'independent-acceptance-v1', initialCoins: 20, roster: Array.from({ length: count }, (_, i) => ({ playerId: `p${i + 1}`, name: i < 2 ? 'Minh' : `Người ${i + 1}` })) });
  return { world, step: await entry('world', 'stepWorld') };
}
const frame = (world: World, seq = 1, overrides: Partial<Frame> = {}): Frame => ({ runId: world.runId, seq, moveX: 0, moveY: 0, interactPressed: false, dashPressed: false, abandonHeld: false, ...overrides });
const inputs = (world: World, playerId = 'p1', overrides: Partial<Frame> = {}, seq = 1) => new Map([[playerId, frame(world, seq, overrides)]]);
function openSpace(world: World) {
  world.map.width = 3000; world.map.height = 3000; world.map.walls = [];
  world.map.gate = { x: 2500, y: 2500, w: 80, h: 80 };
  world.map.sharedBarrier = { x: 2700, y: 2700, w: 30, h: 30 };
  Object.values(world.players).forEach((player, i) => { player.x = 300 + i * 400; player.y = 300; });
}
function order(world: World, overrides: Partial<Order> = {}) {
  const value: Order = { id: 'independent-order', pickup: { x: 300, y: 300 }, delivery: { x: 1500, y: 1500 }, value: 10, ownerId: null, privateOwnerId: null, lockedFee: null, settled: false, ...overrides };
  world.orders = { [value.id]: value };
  return value;
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
function atStage(world: World, elapsedMs = 60_001, phase = 'stage1') { world.elapsedMs = elapsedMs; world.phase = phase; }

describe('independent frozen arcade rules', () => {
  it('U01 initializes 26 distinct player identities with 20 coins, including duplicate display names', async () => {
    const { world } = await setup(26);
    expect(Object.keys(world.players)).toHaveLength(26);
    for (const player of Object.values(world.players)) { expect(player.coins).toBe(20); expect(player.carriedOrderId).toBeNull(); }
    expect(world.players.p1.name).toBe(world.players.p2.name);
    const generateMap = await entry('maps', 'generateMap');
    const map = generateMap(26, 'map-seed');
    expect(map).toEqual(generateMap(26, 'map-seed'));
    expect(map.width).toBeGreaterThan(0); expect(map.height).toBeGreaterThan(0);
    expect(map.shops.length).toBeGreaterThanOrEqual(26);
  });

  it('U02 normalizes diagonal speed to straight speed', async () => {
    const a = await setup(); const b = await setup(); openSpace(a.world); openSpace(b.world);
    const move = await entry('motion', 'advanceMotion');
    const start = { ...a.world.players.p1 };
    move(a.world, inputs(a.world, 'p1', { moveX: 1 }), 50);
    move(b.world, inputs(b.world, 'p1', { moveX: 1, moveY: 1 }), 50);
    expect(distance(start, a.world.players.p1)).toBeGreaterThan(0);
    expect(distance(start, a.world.players.p1)).toBeCloseTo(distance(start, b.world.players.p1), 5);
  });

  it('U03 equal simulated time produces equal travel at different frame rates', async () => {
    const a = await setup(); const b = await setup(); openSpace(a.world); openSpace(b.world);
    const move = await entry('motion', 'advanceMotion');
    for (let i = 0; i < 10; i++) move(a.world, inputs(a.world, 'p1', { moveX: 1 }, i + 1), 20);
    for (let i = 0; i < 20; i++) move(b.world, inputs(b.world, 'p1', { moveX: 1 }, i + 1), 10);
    expect(a.world.players.p1.x).toBeGreaterThan(300);
    expect(a.world.players.p1.x).toBeCloseTo(b.world.players.p1.x, 5);
  });

  it('U04 dash cannot tunnel through a wall, and has 200ms duration / 4000ms cooldown', async () => {
    const { world } = await setup(); openSpace(world);
    const move = await entry('motion', 'advanceMotion');
    world.map.walls = [{ x: 340, y: 100, w: 10, h: 500 }];
    move(world, inputs(world, 'p1', { moveX: 1, dashPressed: true }), 1);
    expect(world.players.p1.dashRemainingMs).toBeGreaterThan(0);
    expect(world.players.p1.dashRemainingMs).toBeLessThanOrEqual(200);
    expect(world.players.p1.dashCooldownMs).toBeGreaterThanOrEqual(3999);
    expect(world.players.p1.dashCooldownMs).toBeLessThanOrEqual(4000);
    move(world, inputs(world, 'p1', { moveX: 1 }, 2), 199);
    expect(world.players.p1.x).toBeLessThan(340);
    expect(world.players.p1.dashRemainingMs).toBe(0);
    move(world, inputs(world, 'p1', { dashPressed: true }, 3), 1);
    expect(world.players.p1.dashRemainingMs).toBe(0);
  });

  it('U05 protected connected bodies stay solid; contact never removes coins or carried orders', async () => {
    const { world } = await setup(); openSpace(world);
    const move = await entry('motion', 'advanceMotion');
    world.players.p2.x = 345; world.players.p2.y = 300; world.players.p2.pushProtectionMs = 1000;
    const carried = order(world, { ownerId: 'p2' }); world.players.p2.carriedOrderId = carried.id;
    for (let i = 0; i < 10; i++) move(world, inputs(world, 'p1', { moveX: 1 }, i + 1), 20);
    expect(world.players.p1.x).toBeLessThan(world.players.p2.x);
    expect(distance(world.players.p1, world.players.p2)).toBeGreaterThan(0);
    expect(world.players.p2.carriedOrderId).toBe(carried.id);
    expect(world.players.p1.coins).toBe(20); expect(world.players.p2.coins).toBe(20);
  });

  it('U06 contested common pickup gives exactly one owner, and full hands cannot take another order', async () => {
    const { world, step } = await setup(); openSpace(world); atStage(world);
    world.players.p2.x = 300; world.players.p2.y = 300;
    const common = order(world);
    step(world, new Map(['p1', 'p2'].map(id => [id, frame(world, 1, { interactPressed: true })])), 1);
    const owners = Object.entries(world.players).filter(([, player]) => player.carriedOrderId === common.id);
    expect(owners).toHaveLength(1); expect(common.ownerId).toBe(owners[0][0]);
    const second = { ...common, id: 'second', ownerId: null }; world.orders.second = second;
    step(world, inputs(world, owners[0][0], { interactPressed: true }, 2), 1);
    expect(owners[0][1].carriedOrderId).toBe(common.id); expect(second.ownerId).toBeNull();
  });

  it('U07 remote interactions cannot pick up or deliver; adjacent delivery settles once', async () => {
    const { world, step } = await setup(); openSpace(world); atStage(world);
    const common = order(world, { pickup: { x: 1500, y: 1000 } });
    step(world, inputs(world, 'p1', { interactPressed: true }), 1);
    expect(common.ownerId).toBeNull(); expect(world.players.p1.carriedOrderId).toBeNull();
    common.ownerId = 'p1'; world.players.p1.carriedOrderId = common.id;
    step(world, inputs(world, 'p1', { interactPressed: true }, 2), 1);
    expect(world.players.p1.coins).toBe(20); expect(common.settled).toBe(false);
    Object.assign(world.players.p1, common.delivery);
    step(world, inputs(world, 'p1', { interactPressed: true }, 3), 1);
    expect(world.players.p1.coins).toBe(30); expect(world.players.p1.carriedOrderId).toBeNull();
    step(world, inputs(world, 'p1', { interactPressed: true }, 4), 1);
    expect(world.players.p1.coins).toBe(30);
  });

  it('U08 private orders remain unavailable and invisible to other players and public viewers', async () => {
    const { world, step } = await setup(); openSpace(world); atStage(world);
    const privateOrder = order(world, { privateOwnerId: 'p2', value: 8 });
    step(world, inputs(world, 'p1', { interactPressed: true }), 1);
    expect(privateOrder.ownerId).toBeNull(); expect(world.players.p1.carriedOrderId).toBeNull();
    const project = await entry('snapshot', 'projectSnapshot');
    for (const actor of [{ role: 'public' }, { role: 'player', playerId: 'p1' }]) {
      const snapshot = project(world, actor);
      expect(JSON.stringify(snapshot)).not.toContain(privateOrder.id);
      expect(JSON.stringify(snapshot)).not.toMatch(/"(?:tokenHash|hostHash|playerHash|capabilityHash|hostToken|playerToken)"\s*:/i);
    }
    expect(JSON.stringify(project(world, { role: 'player', playerId: 'p2' }))).toContain(privateOrder.id);
  });

  it('U09 gate crossing locks fee once; fee settles on delivery and survives prospective fee changes', async () => {
    const { world, step } = await setup(); openSpace(world); atStage(world);
    world.map.gate = { x: 330, y: 250, w: 100, h: 100 };
    const common = order(world, { ownerId: 'p1' }); world.players.p1.carriedOrderId = common.id; world.gateFee = 2;
    for (let i = 0; i < 30 && common.lockedFee == null; i++) step(world, inputs(world, 'p1', { moveX: 1 }, i + 1), 20);
    expect(common.lockedFee).toBe(2); expect(world.players.p1.coins).toBe(20);
    world.gateFee = 4;
    for (let i = 0; i < 5; i++) step(world, inputs(world, 'p1', { moveX: -1 }, i + 40), 20);
    expect(common.lockedFee).toBe(2);
    Object.assign(world.players.p1, common.delivery);
    step(world, inputs(world, 'p1', { interactPressed: true }, 100), 1);
    expect(world.players.p1.coins).toBe(28);
    step(world, inputs(world, 'p1', { interactPressed: true }, 101), 1);
    expect(world.players.p1.coins).toBe(28);
  });

  it('U10 zero balance remains playable and can deliver an order', async () => {
    const { world, step } = await setup(); openSpace(world); atStage(world); world.players.p1.coins = 0;
    const common = order(world, { ownerId: 'p1' }); world.players.p1.carriedOrderId = common.id;
    step(world, inputs(world, 'p1', { moveX: 1 }), 20);
    expect(world.players.p1.x).toBeGreaterThan(300);
    Object.assign(world.players.p1, common.delivery);
    step(world, inputs(world, 'p1', { interactPressed: true }, 2), 1);
    expect(world.players.p1.coins).toBe(10);
  });

  it('U11 abandoning needs 1000ms at own home, pays nothing, and cannot also buy a promotion', async () => {
    const { world, step } = await setup(); atStage(world);
    const player = world.players.p1; Object.assign(player, player.home);
    world.map.stations.push({ kind: 'promotion', ownerId: 'p1', ...player.home });
    const carried = order(world, { ownerId: 'p1', pickup: { ...player.home } }); player.carriedOrderId = carried.id;
    step(world, inputs(world, 'p1', { abandonHeld: true }), 999);
    expect(player.carriedOrderId).toBe(carried.id);
    step(world, inputs(world, 'p1', { abandonHeld: true, interactPressed: true }, 2), 1);
    expect(player.carriedOrderId).toBeNull(); expect(player.coins).toBe(20);
  });

  it('U12 promotion spends 8 once, emits three public orders within 20s, and respects 45s cooldown', async () => {
    const { world, step } = await setup(); atStage(world);
    const station = world.map.stations.find(s => s.kind === 'promotion' && (!s.ownerId || s.ownerId === 'p1'));
    expect(station, 'Map must expose a promotion station').toBeDefined(); Object.assign(world.players.p1, station);
    world.orders = {};
    step(world, inputs(world, 'p1', { interactPressed: true }), 1);
    expect(world.players.p1.coins).toBe(12);
    step(world, inputs(world, 'p1', { interactPressed: true }, 2), 1);
    expect(world.players.p1.coins).toBe(12);
    for (let i = 0; i < 200; i++) step(world, new Map(), 100);
    // Compare against a control run: automatic common spawning is allowed by the rules.
    const control = await setup(); atStage(control.world); control.world.orders = {};
    for (let i = 0; i < 200; i++) control.step(control.world, new Map(), 100);
    const publicCount = (state: World) => Object.values(state.orders).filter(o => !o.privateOwnerId).length;
    expect(publicCount(world) - publicCount(control.world)).toBe(3);
    expect(world.players.p1.coins).toBe(12);
  });

  it('U13 private channel costs 40 once and has at most one waiting order of value 8 every >=20s', async () => {
    const { world, step } = await setup(); atStage(world, 360_001, 'stage3');
    const station = world.map.stations.find(s => s.kind === 'private-channel' && (!s.ownerId || s.ownerId === 'p1'));
    expect(station, 'Map must expose a private-channel station').toBeDefined(); Object.assign(world.players.p1, station);
    world.players.p1.coins = 39;
    step(world, inputs(world, 'p1', { interactPressed: true }), 1); expect(world.players.p1.coins).toBe(39);
    world.players.p1.coins = 50;
    step(world, inputs(world, 'p1', { interactPressed: true }, 2), 1); expect(world.players.p1.coins).toBe(10);
    step(world, inputs(world, 'p1', { interactPressed: true }, 3), 1); expect(world.players.p1.coins).toBe(10);
    for (let i = 0; i < 600; i++) step(world, new Map(), 100);
    const ownOrders = Object.values(world.orders).filter(o => o.privateOwnerId === 'p1' && !o.settled);
    expect(ownOrders).toHaveLength(1); expect(ownOrders[0].value).toBe(8);
  });

  it('U14 shared-route contributions freeze roster cost, never overspend or overfund, and accept final remainder', async () => {
    const { world, step } = await setup(); atStage(world, 180_001, 'stage2');
    const station = world.map.stations.find(s => s.kind === 'contribution');
    expect(station, 'Map must expose contribution station').toBeDefined();
    for (const player of Object.values(world.players)) { Object.assign(player, station); player.coins = 100; }
    for (let i = 0; i < 9; i++) step(world, new Map(Object.keys(world.players).map(id => [id, frame(world, i + 1, { interactPressed: true })])), 1);
    expect(Object.values(world.players).reduce((sum, player) => sum + player.coins, 0)).toBe(300 - 36);
    const before = structuredClone(world.sharedRoute);
    step(world, inputs(world, 'p1', { interactPressed: true }, 100), 1);
    expect(world.sharedRoute).toEqual(before);
    expect(Object.values(world.players).reduce((sum, player) => sum + player.coins, 0)).toBe(264);
  });

  it('U15 practice progress resets exactly at 60000ms, with no carry-over money or order', async () => {
    const { world, step } = await setup(); world.elapsedMs = 59_999; world.phase = 'practice';
    world.players.p1.coins = 75; const carried = order(world, { ownerId: 'p1' }); world.players.p1.carriedOrderId = carried.id;
    step(world, new Map(), 1);
    expect(world.elapsedMs).toBe(60_000); expect(world.phase).toBe('stage1'); expect(world.players.p1.coins).toBe(20); expect(world.players.p1.carriedOrderId).toBeNull();
    expect(world.orders[carried.id]).toBeUndefined();
  });

  it('U16 phases change on exact 180000/360000/540000ms boundaries and preserve stage money', async () => {
    for (const [boundary, before, after] of [[180_000, 'stage1', 'stage2'], [360_000, 'stage2', 'stage3'], [540_000, 'stage3', 'results']] as const) {
      const { world, step } = await setup(); world.elapsedMs = boundary - 1; world.phase = before; world.players.p1.coins = 37;
      step(world, new Map(), 1); expect(world.elapsedMs).toBe(boundary); expect(world.phase).toBe(after); expect(world.players.p1.coins).toBe(37);
    }
  });

  it('U17 delivery cannot change final coins at or after 540000ms; scoreboard remains after 600000ms', async () => {
    for (const elapsed of [540_000, 600_000]) {
      const { world, step } = await setup(); world.elapsedMs = elapsed; world.phase = 'results';
      const carried = order(world, { ownerId: 'p1' }); world.players.p1.carriedOrderId = carried.id; Object.assign(world.players.p1, carried.delivery);
      step(world, inputs(world, 'p1', { interactPressed: true }), 1);
      expect(world.phase).toBe('results'); expect(world.players.p1.coins).toBe(20);
      const snapshot = (await entry('snapshot', 'projectSnapshot'))(world, { role: 'public' });
      expect(snapshot.leaderboard).toHaveLength(3);
    }
  });

  it('U18 pause freezes elapsed, motion, dash/protection/cooldowns, coins and spawning', async () => {
    const { world, step } = await setup(); openSpace(world); atStage(world); world.paused = true;
    world.players.p1.dashRemainingMs = 100; world.players.p1.dashCooldownMs = 3000; world.players.p1.pushProtectionMs = 800;
    const before = structuredClone(world);
    step(world, inputs(world, 'p1', { moveX: 1, interactPressed: true, dashPressed: true, abandonHeld: true }), 25_000);
    expect(world.elapsedMs).toBe(before.elapsedMs); expect(world.players).toEqual(before.players); expect(world.orders).toEqual(before.orders); expect(world.sharedRoute).toEqual(before.sharedRoute);
    world.paused = false; step(world, new Map(), 20);
    expect(world.elapsedMs).toBe(before.elapsedMs + 20);
  });

  it('U19 ranking uses remaining coins and assigns equal rank to equal coins', async () => {
    const { world } = await setup(); world.phase = 'results'; world.elapsedMs = 540_000;
    world.players.p1.coins = 27; world.players.p2.coins = 27; world.players.p3.coins = 26;
    const rows = (await entry('snapshot', 'projectSnapshot'))(world, { role: 'public' }).leaderboard;
    expect(rows).toHaveLength(3);
    expect(rows.find(row => row.playerId === 'p1')?.rank).toBe(1); expect(rows.find(row => row.playerId === 'p2')?.rank).toBe(1);
    expect(rows.find(row => row.playerId === 'p3')!.rank).toBeGreaterThan(1);
    expect(rows[0].coins).toBe(27); expect(rows[2].coins).toBe(26);
  });
});
