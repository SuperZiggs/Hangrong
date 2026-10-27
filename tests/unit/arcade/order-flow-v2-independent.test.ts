import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../../../shared/arcade/world';
import { applyInteraction, createOrder, recordGateCrossings, spawnOrders } from '../../../shared/arcade/orders';
import { buyUpgrade } from '../../../shared/arcade/economy';
import { projectSnapshot } from '../../../shared/arcade/snapshot';
import { actorKey, SnapshotStream } from '../../../shared/arcade/stream';
import { applySnapshotPatch } from '../../../shared/arcade/transport';
import type { Actor, InputFrame, Order, Point, PublicSnapshot, World } from '../../../shared/arcade/types';

// Independent acceptance: derive expectations from frozen R1–R8. Do not require
// any implementation-owned cargo/cooldown/distribution representation.
const pointKey = (p: Point) => `${p.x},${p.y}`;
const waiting = (w: World, privateOwnerId: string | null = null) => Object.values(w.orders).filter(o => !o.settled && !o.ownerId && o.privateOwnerId === privateOwnerId);
const ordinary = (w: World) => waiting(w).filter(o => !o.source || o.source === 'common');
const cargo = (w: World, id = 'p1') => Object.values(w.orders).filter(o => !o.settled && o.ownerId === id);
const place = (w: World, p: Point, id = 'p1') => Object.assign(w.players[id], p);
function setup(count = 3, coins = 100) {
  const w = createWorld({ seed: 'independent-order-flow-v2', initialCoins: coins, roster: Array.from({ length: count }, (_, i) => ({ playerId: `p${i + 1}`, name: `Nhóm ${i + 1}` })) });
  w.elapsedMs = 60_000; w.phase = 'stage1'; spawnOrders(w, 0);
  return w;
}
function frame(w: World, seq: number, changes: Partial<InputFrame> = {}): InputFrame {
  return { runId: w.runId, seq, moveX: 0, moveY: 0, interactPressed: false, dashPressed: false, abandonHeld: false, ...changes };
}
function at(w: World, ms: number) { w.elapsedMs = ms; spawnOrders(w, 0); }
function twoPrivate(w: World, id = 'p1') {
  const pickup = { x: w.players[id].home.x, y: w.players[id].home.y + 72 };
  return [createOrder(w, 'private', id, pickup), createOrder(w, 'private', id, pickup)];
}
function take(w: World, o: Order, id = 'p1') { place(w, o.pickup, id); return applyInteraction(w, id); }
function takeTwo(w: World) {
  const orders = twoPrivate(w); take(w, orders[0]); take(w, orders[1]);
  expect(cargo(w), 'R3: two separate E presses must carry two own private parcels').toHaveLength(2);
  return orders;
}
function throughGate(w: World, fee: number) {
  const g = w.map.gate; w.gateFee = fee;
  place(w, { x: g.x - 50, y: g.y + g.h / 2 }); recordGateCrossings(w);
  place(w, { x: g.x + g.w / 2, y: g.y + g.h / 2 }); recordGateCrossings(w);
}
const actors: readonly Actor[] = [{ role: 'public' }, { role: 'player', playerId: 'p2' }, { role: 'player', playerId: 'p1' }, { role: 'host' }];

describe('independent frozen order-flow v2 requirements', () => {
  it('V2-U01 R1 starts with exactly one ordinary parcel per fixed pickup and never duplicates waiting stock', () => {
    const w = setup(6);
    expect(ordinary(w)).toHaveLength(w.map.pickups.length);
    expect(new Set(ordinary(w).map(o => pointKey(o.pickup)))).toEqual(new Set(w.map.pickups.map(pointKey)));
    for (let i = 0; i < 50; i++) at(w, 60_000 + i * 1000);
    expect(ordinary(w)).toHaveLength(w.map.pickups.length);
  });

  it('V2-U02 R1 refills the same point at pickup +45000ms while its prior parcel remains undelivered', () => {
    const w = setup(), first = ordinary(w)[0], location = pointKey(first.pickup), takenAt = w.elapsedMs;
    take(w, first); expect(first.ownerId).toBe('p1');
    at(w, takenAt + 44_999);
    expect(ordinary(w).filter(o => pointKey(o.pickup) === location), 'R1: no early refill before 45 seconds').toHaveLength(0);
    at(w, takenAt + 45_000);
    expect(ordinary(w).filter(o => pointKey(o.pickup) === location), 'R1: replacement appears at the emptied point at the exact deadline').toHaveLength(1);
    expect(cargo(w).map(o => o.id)).toEqual([first.id]); expect(first.settled).toBe(false);
  });

  it('V2-U03 R1 maintains independent deadlines for two ordinary points', () => {
    const w = setup(), [a, b] = ordinary(w), t = w.elapsedMs;
    take(w, a); at(w, t + 5000); take(w, b, 'p2');
    at(w, t + 45_000);
    expect(ordinary(w).filter(o => pointKey(o.pickup) === pointKey(a.pickup))).toHaveLength(1);
    expect(ordinary(w).filter(o => pointKey(o.pickup) === pointKey(b.pickup))).toHaveLength(0);
    at(w, t + 50_000);
    expect(ordinary(w).filter(o => pointKey(o.pickup) === pointKey(b.pickup))).toHaveLength(1);
  });

  it('V2-U04 R1 delivering an ordinary parcel does not shorten or restart its pickup timer', () => {
    const w = setup(), o = ordinary(w)[0], t = w.elapsedMs;
    take(w, o); at(w, t + 10_000); place(w, o.delivery); applyInteraction(w, 'p1');
    expect(o.settled).toBe(true);
    at(w, t + 44_999); expect(ordinary(w).filter(p => pointKey(p.pickup) === pointKey(o.pickup))).toHaveLength(0);
    at(w, t + 45_000); expect(ordinary(w).filter(p => pointKey(p.pickup) === pointKey(o.pickup))).toHaveLength(1);
  });

  it('V2-U05 R1 promotion at an empty ordinary point neither occupies nor resets that slot', () => {
    const w = setup(), o = ordinary(w)[0], t = w.elapsedMs; take(w, o);
    const promotion = createOrder(w, 'promotion', null, o.pickup);
    at(w, t + 44_999); expect(ordinary(w).filter(p => pointKey(p.pickup) === pointKey(o.pickup))).toHaveLength(0);
    at(w, t + 45_000); expect(ordinary(w).filter(p => pointKey(p.pickup) === pointKey(o.pickup))).toHaveLength(1);
    expect(w.orders[promotion.id]).toMatchObject({ settled: false, ownerId: null, source: 'promotion' });
  });

  it('V2-U06 R1/R8 practice reset restores opening stock and clears pre-reset cooldowns', () => {
    const w = createWorld({ seed: 'practice-v2', initialCoins: 20, roster: ['p1', 'p2', 'p3'].map(playerId => ({ playerId, name: playerId })) });
    stepWorld(w, new Map(), 1); w.elapsedMs = 59_000;
    const previous = ordinary(w)[0]; take(w, previous);
    stepWorld(w, new Map(), 1000);
    expect(w.phase).toBe('stage1'); expect(cargo(w)).toHaveLength(0);
    expect(ordinary(w)).toHaveLength(w.map.pickups.length);
    expect(new Set(ordinary(w).map(o => pointKey(o.pickup)))).toEqual(new Set(w.map.pickups.map(pointKey)));
    const fresh = ordinary(w).find(o => pointKey(o.pickup) === pointKey(previous.pickup))!; take(w, fresh);
    at(w, 104_999); expect(ordinary(w).filter(o => pointKey(o.pickup) === pointKey(fresh.pickup))).toHaveLength(0);
    at(w, 105_000); expect(ordinary(w).filter(o => pointKey(o.pickup) === pointKey(fresh.pickup))).toHaveLength(1);
  });

  it('V2-U07 R2 charges 40 once and emits first value-8 private parcel only at purchase +20000ms', () => {
    const w = setup(3, 39), t = w.elapsedMs;
    expect(buyUpgrade(w, 'p1', 'private-channel')).toHaveLength(0); expect(w.players.p1.coins).toBe(39);
    w.players.p1.coins = 40; buyUpgrade(w, 'p1', 'private-channel'); buyUpgrade(w, 'p1', 'private-channel'); expect(w.players.p1.coins).toBe(0);
    at(w, t + 19_999); expect(waiting(w, 'p1')).toHaveLength(0);
    at(w, t + 20_000); expect(waiting(w, 'p1')).toHaveLength(1); expect(waiting(w, 'p1')[0].value).toBe(8);
  });

  it('V2-U08 R2 permits two waiting private parcels, one per >=20000ms occurrence', () => {
    const w = setup(), t = w.elapsedMs; buyUpgrade(w, 'p1', 'private-channel');
    at(w, t + 20_000); expect(waiting(w, 'p1')).toHaveLength(1);
    at(w, t + 39_999); expect(waiting(w, 'p1')).toHaveLength(1);
    at(w, t + 40_000); expect(waiting(w, 'p1'), 'R2: the second waiting parcel is permitted').toHaveLength(2);
    at(w, t + 80_000); expect(waiting(w, 'p1')).toHaveLength(2);
  });

  it('V2-U09 R2 full private stock does not accumulate an immediate refill burst when collected', () => {
    const w = setup(), t = w.elapsedMs; buyUpgrade(w, 'p1', 'private-channel');
    at(w, t + 20_000); at(w, t + 40_000); at(w, t + 100_000);
    expect(waiting(w, 'p1')).toHaveLength(2);
    const stock = [...waiting(w, 'p1')]; take(w, stock[0]); take(w, stock[1]);
    at(w, t + 100_001); expect(waiting(w, 'p1').length, 'R2: no two-parcel catch-up burst').toBeLessThanOrEqual(1);
    const count = waiting(w, 'p1').length;
    at(w, t + 100_002); expect(waiting(w, 'p1')).toHaveLength(count);
    at(w, t + 119_999); expect(waiting(w, 'p1').length).toBeLessThanOrEqual(1);
  });

  it('V2-U10 R2 pause freezes both private and ordinary refill deadlines', () => {
    const w = setup(), t = w.elapsedMs; take(w, ordinary(w)[0]); buyUpgrade(w, 'p2', 'private-channel');
    w.paused = true; stepWorld(w, new Map(), 100_000);
    expect(w.elapsedMs).toBe(t); expect(waiting(w, 'p2')).toHaveLength(0); expect(ordinary(w)).toHaveLength(w.map.pickups.length - 1);
    w.paused = false; stepWorld(w, new Map(), 19_999); expect(waiting(w, 'p2')).toHaveLength(0);
    stepWorld(w, new Map(), 1); expect(waiting(w, 'p2')).toHaveLength(1);
    expect(ordinary(w)).toHaveLength(w.map.pickups.length - 1);
  });

  it('V2-U11 R3 takes one own private parcel per press up to two, with compatible primary ID', () => {
    const w = setup(), [a, b] = twoPrivate(w), third = createOrder(w, 'private', 'p1', a.pickup);
    take(w, a); expect(cargo(w).map(o => o.id)).toEqual([a.id]);
    take(w, b); expect(new Set(cargo(w).map(o => o.id))).toEqual(new Set([a.id, b.id]));
    expect(cargo(w).map(o => o.id)).toContain(w.players.p1.carriedOrderId);
    take(w, third); expect(third.ownerId).toBeNull(); expect(cargo(w)).toHaveLength(2);
  });

  it('V2-U12 R3 excludes public/private mixes in both directions and caps public cargo at one', () => {
    const w = setup(), publicA = ordinary(w)[0], publicB = ordinary(w)[1], own = twoPrivate(w);
    take(w, publicA); take(w, own[0]); take(w, publicB);
    expect(cargo(w).map(o => o.id)).toEqual([publicA.id]); expect(own[0].ownerId).toBeNull(); expect(publicB.ownerId).toBeNull();
    place(w, publicA.delivery); applyInteraction(w, 'p1'); take(w, own[0]); take(w, own[1]); take(w, publicB);
    expect(cargo(w)).toHaveLength(2); expect(cargo(w).every(o => o.privateOwnerId === 'p1')).toBe(true); expect(publicB.ownerId).toBeNull();
  });

  it('V2-U13 R3 two same-destination parcels require two E edges and held/repeated sequence cannot double act', () => {
    const w = setup(), [a, b] = twoPrivate(w); b.delivery = { ...a.delivery }; place(w, a.pickup);
    const pressed = new Map([['p1', frame(w, 10, { interactPressed: true })]]);
    stepWorld(w, pressed, 1); for (let i = 0; i < 5; i++) stepWorld(w, pressed, 1);
    expect(cargo(w)).toHaveLength(1);
    stepWorld(w, new Map([['p1', frame(w, 11, { interactPressed: true })]]), 1); expect(cargo(w)).toHaveLength(2);
    const coins = w.players.p1.coins; place(w, a.delivery);
    stepWorld(w, new Map([['p1', frame(w, 12, { interactPressed: true })]]), 1); expect(cargo(w)).toHaveLength(1); expect(w.players.p1.coins).toBe(coins + 8);
    stepWorld(w, new Map([['p1', frame(w, 13, { interactPressed: true })]]), 1); expect(cargo(w)).toHaveLength(0); expect(w.players.p1.coins).toBe(coins + 16);
    stepWorld(w, new Map([['p1', frame(w, 14, { interactPressed: true })]]), 1); expect(w.players.p1.coins).toBe(coins + 16);
  });

  it('V2-U14 R3 delivers the eligible second parcel even when primary parcel destination is elsewhere', () => {
    const w = setup(), [a, b] = takeTwo(w); a.delivery = { x: 300, y: 1000 }; b.delivery = { x: 1500, y: 1000 };
    const before = w.players.p1.coins; place(w, b.delivery); applyInteraction(w, 'p1');
    expect(b.settled).toBe(true); expect(a.settled).toBe(false); expect(w.players.p1.coins).toBe(before + 8);
    expect(w.players.p1.carriedOrderId).toBe(a.id);
  });

  it('V2-U15 R3 abandons all cargo only after 1000ms held at own home and pays nothing', () => {
    const w = setup(), orders = takeTwo(w), before = w.players.p1.coins; place(w, w.players.p2.home);
    stepWorld(w, new Map([['p1', frame(w, 1, { abandonHeld: true })]]), 1000); expect(cargo(w)).toHaveLength(2);
    place(w, w.players.p1.home); stepWorld(w, new Map([['p1', frame(w, 2, { abandonHeld: true })]]), 999); expect(cargo(w)).toHaveLength(2);
    stepWorld(w, new Map([['p1', frame(w, 3, { abandonHeld: true, interactPressed: true })]]), 1);
    expect(cargo(w)).toHaveLength(0); expect(w.players.p1.carriedOrderId).toBeNull(); expect(w.players.p1.coins).toBe(before);
    for (const o of orders) expect(w.orders[o.id]?.ownerId === 'p1' && !w.orders[o.id]?.settled).not.toBe(true);
  });

  it('V2-U16 R4 another authenticated player cannot take either waiting private parcel', () => {
    const w = setup(), orders = twoPrivate(w); take(w, orders[0], 'p2'); take(w, orders[1], 'p2');
    expect(cargo(w, 'p2')).toHaveLength(0); expect(orders.every(o => o.ownerId === null)).toBe(true);
    expect(waiting(w, 'p1')).toHaveLength(2);
  });

  it('V2-U17 R4 snapshot serialization hides both carried private IDs and their events from unauthorized views', () => {
    const w = setup(), orders = takeTwo(w);
    w.events.push(...orders.map(o => ({ id: `pickup:${o.id}`, kind: 'pickup', playerId: 'p1', privateOwnerId: 'p1', at: w.elapsedMs })));
    for (const actor of actors) {
      const text = JSON.stringify(projectSnapshot(w, actor));
      for (const o of orders) if (actor.role === 'public' || actor.playerId === 'p2') expect(text).not.toContain(o.id); else expect(text).toContain(o.id);
    }
  });

  it('V2-U18 R4 full/patch/reconnect streams reconstruct both authorized cargo IDs without private leaks', () => {
    const w = setup(), stream = new SnapshotStream(), prior = new Map<string, PublicSnapshot>();
    for (const [key, wire] of stream.frames(w, actors)) prior.set(key, JSON.parse(wire).snapshot);
    const orders = takeTwo(w); w.tick = 3;
    for (const [key, wire] of stream.frames(w, actors)) {
      const actor = actors.find(a => actorKey(a) === key)!, message = JSON.parse(wire);
      const state = message.type === 'patch' ? applySnapshotPatch(prior.get(key)!, message.patch) : message.snapshot;
      expect(state).toEqual(JSON.parse(JSON.stringify(projectSnapshot(w, actor))));
      for (const o of orders) if (actor.role === 'public' || actor.playerId === 'p2') expect(wire).not.toContain(o.id); else expect(JSON.stringify(state)).toContain(o.id);
    }
    for (const [key, wire] of new SnapshotStream().frames(w, actors)) {
      const actor = actors.find(a => actorKey(a) === key)!;
      expect(JSON.parse(wire).snapshot).toEqual(JSON.parse(JSON.stringify(projectSnapshot(w, actor))));
    }
  });

  it('V2-U19 R5 locks fee=4 independently for both parcels and settles 4 net each exactly once after restoration', () => {
    const w = setup(), orders = takeTwo(w), before = w.players.p1.coins; throughGate(w, 4);
    expect(orders.map(o => o.lockedFee)).toEqual([4, 4]); throughGate(w, 9); expect(orders.map(o => o.lockedFee)).toEqual([4, 4]);
    const restored = JSON.parse(JSON.stringify(w)) as World;
    for (const o of orders) { place(restored, o.delivery); applyInteraction(restored, 'p1'); }
    expect(restored.players.p1.coins).toBe(before + 8); expect(restored.players.p1.feesPaid).toBe(8); expect(restored.players.p1.delivered).toBe(2);
    for (let i = 0; i < 5; i++) applyInteraction(restored, 'p1'); expect(restored.players.p1.coins).toBe(before + 8);
  });

  it('V2-U20 R5 a later pickup does not copy the first fee and locks only on its own later crossing', () => {
    const w = setup(), [a, b] = twoPrivate(w); take(w, a); throughGate(w, 2); expect(a.lockedFee).toBe(2);
    take(w, b); expect(cargo(w)).toHaveLength(2); expect(b.lockedFee).toBeNull();
    throughGate(w, 4); expect(a.lockedFee).toBe(2); expect(b.lockedFee).toBe(4);
    const before = w.players.p1.coins; place(w, a.delivery); applyInteraction(w, 'p1'); place(w, b.delivery); applyInteraction(w, 'p1');
    expect(w.players.p1.coins).toBe(before + 10); expect(w.players.p1.feesPaid).toBe(6);
  });

  it('V2-U21 R6 180s keeps existing orders/destinations and fixed pickups intact', () => {
    const w = setup(6), pickups = structuredClone(w.map.pickups), oldDestinations = structuredClone(w.map.deliveries), oldOrders = structuredClone(w.orders);
    w.elapsedMs = 179_999; w.phase = 'stage1'; stepWorld(w, new Map(), 1);
    expect(w.phase).toBe('stage2'); expect(w.map.pickups).toEqual(pickups);
    for (const o of Object.values(oldOrders)) expect(w.orders[o.id]).toEqual(o);
    for (const p of oldDestinations) expect(w.map.deliveries.some(d => pointKey(d) === pointKey(p))).toBe(true);
  });

  it('V2-U22 R6 generates exact 17-central/3-outer cohorts of 20 with three central customers and both outer sides', () => {
    const w = setup(6), old = new Set(w.map.deliveries.map(pointKey)); w.elapsedMs = 179_999; stepWorld(w, new Map(), 1);
    const generated = Array.from({ length: 40 }, () => createOrder(w, 'common'));
    for (const cohort of [generated.slice(0, 20), generated.slice(20)]) {
      expect(cohort.filter(o => !old.has(pointKey(o.delivery))), 'R6: each cohort contains 17 newly central destinations').toHaveLength(17);
      expect(cohort.filter(o => old.has(pointKey(o.delivery)))).toHaveLength(3);
    }
    const centers = [...new Map(generated.filter(o => !old.has(pointKey(o.delivery))).map(o => [pointKey(o.delivery), o.delivery])).values()];
    expect(centers).toHaveLength(3);
    for (const p of centers) { expect(p.y).toBeGreaterThan(w.map.riverY + w.map.riverHeight); expect(Math.abs(p.x - w.map.width / 2)).toBeLessThan(w.map.width / 4); }
    const outer = generated.filter(o => old.has(pointKey(o.delivery))).map(o => o.delivery.x);
    expect(outer.some(x => x < w.map.width / 2)).toBe(true); expect(outer.some(x => x > w.map.width / 2)).toBe(true);
  });

  it('V2-U23 R6 public distribution includes promotions, excludes private generation and uses only old destinations before 180s', () => {
    const w = setup(6), old = new Set(w.map.deliveries.map(pointKey));
    w.elapsedMs = 179_999; for (let i = 0; i < 25; i++) expect(old.has(pointKey(createOrder(w, i % 2 ? 'promotion' : 'common').delivery))).toBe(true);
    stepWorld(w, new Map(), 1); const generated: Order[] = [];
    for (let i = 0; i < 40; i++) { createOrder(w, 'private', 'p1'); generated.push(createOrder(w, i % 2 ? 'promotion' : 'common')); }
    for (const cohort of [generated.slice(0, 20), generated.slice(20)]) expect(cohort.filter(o => !old.has(pointKey(o.delivery)))).toHaveLength(17);
  });

  it('V2-U24 R6 separate players may each deliver their assigned order to the same customer', () => {
    const w = setup(), [a, b] = ordinary(w), destination = { ...a.delivery };
    b.delivery = destination; take(w, a); take(w, b, 'p2');
    const before = [w.players.p1.coins, w.players.p2.coins];
    place(w, destination); applyInteraction(w, 'p1'); place(w, destination, 'p2'); applyInteraction(w, 'p2');
    expect(a.settled).toBe(true); expect(b.settled).toBe(true); expect(w.players.p1.coins).toBe(before[0] + 10); expect(w.players.p2.coins).toBe(before[1] + 10);
  });

  it('V2-U25 R7 the prior minute-3 warning describes customers, not moving pickup points', () => {
    const w = setup(); w.elapsedMs = 169_999; stepWorld(w, new Map(), 1);
    const text = w.events.filter(e => e.kind === 'warning').map(e => e.text).join(' ');
    expect(text, 'R7: warning must explain arriving customers').toMatch(/khách/i);
    expect(text).not.toMatch(/(?:điểm|chỗ)\s*(?:lấy|nhận)\s*(?:hàng|đơn).*chuyển/i);
  });

  it('V2-U26 R8 retains 360s P rise, 540s scoring lock and 600s end', () => {
    const w = setup(); w.elapsedMs = 359_999; w.phase = 'stage2'; stepWorld(w, new Map(), 1); expect(w.gateFee).toBe(4);
    const o = ordinary(w)[0]; take(w, o); place(w, o.delivery); const before = w.players.p1.coins;
    w.elapsedMs = 539_999; w.phase = 'stage3'; stepWorld(w, new Map([['p1', frame(w, 900, { interactPressed: true })]]), 1);
    expect(w.phase).toBe('results'); expect(w.players.p1.coins).toBe(before); stepWorld(w, new Map(), 100_000); expect(w.elapsedMs).toBe(600_000);
  });
});
