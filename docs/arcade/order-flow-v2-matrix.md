# Independent order-flow v2 acceptance matrix

Source: frozen `order-flow-v2-requirements.md`, requirements R1–R8. The author read the packet, current production entry points and existing test conventions only; no implementation plan/design. Created before production edits.

Tests observe orders, ownership, coordinates, per-order fee locks, player coins and serialized authorized views. Cargo collection representation is deliberately unspecified; `carriedOrderId` remains a compatible primary identifier. Unit fixtures may position actors and set simulated time; real Worker/browser tests use only ordinary public endpoints and input frames.

| Packet | Test IDs | Level / scenario | Required observable result |
|---|---|---|---|
| R1 | V2-U01–U04 | Unit: opening wave; exact 44,999/45,000ms refill; independent pickup deadlines; undelivered cargo | One ordinary parcel at every fixed pickup; refill at same point from pickup time, independent of delivery; no duplicate waiting parcel |
| R1 | V2-U05–U06 | Unit integration: promotion coexists; 60s practice reset | Promotion does not occupy/reset slot; new opening wave and cleared old cooldowns |
| R2 | V2-U07–U10 | Unit: 39/40 coins, first deadline, 20s cadence, stock=2, full stock no missed-spawn burst, pause | Charge once; value 8; one per due occurrence; two waiting maximum; resumed deadlines use simulated time |
| R3 | V2-U11–U15 | Unit integration: two private pickups, public/private exclusion in both directions, nearest eligible delivery, same destination twice, held E edge, abandon | One parcel per press; private capacity two/public capacity one; pay each exactly once; 1000ms home abandon clears all, no proceeds |
| R4 | V2-U16–U18 | Integration: hostile pickup; serialized snapshots; full/patch stream followed by reconnect | Other player/public never receive private IDs, including both cargo IDs and event IDs; owner/MC retain both; reconstructed streams equal authorized projection |
| R5 | V2-U19–U20 | Unit integration: two parcels cross P; staggered pickup and prospective fee change; JSON restoration and repeated delivery | Each parcel locks independently once; fee 4 yields 4 net each; new parcel does not inherit old lock; no duplicate settlement |
| R6 | V2-U21–U24 | Unit: 179999/180000 boundary; three added destinations; generated 20-order cohorts with private interleaving and promotion; multi-player same customer | Old destinations remain, orders immutable, pickup points fixed; 17/3 central/outer per cohort; all three central and both outer sides over time; private generation excluded |
| R7 | V2-U25 | Unit observable warning | Minute-3 prior warning describes arriving customers, not relocating pickups |
| R8 | V2-U26 | Unit integration milestones | 360s fee=4; 540s scoring stops; 600s elapsed cap retained |
| R1, R8 | V2-A01 | Real Worker/HTTP/WebSocket: legal movement to ordinary pickup; pause, reconnect and 45s refill | Stock is exhausted without delivery; no early refill; paused time frozen; refill at original point by elapsed deadline; same run/cargo after reconnect |
| R7 | V2-E01 | Browser: actual keyboard pickup, visible empty-slot countdown; keyboard settings/ranking overlays | A player receives one public parcel and visible countdown near 45s; keyboard overlays still work |
| R7 | V2-E02 | Browser/component boundary via current rendering imports, authorized two-private fixture | Both cargo parcels visible with per-order net/fee, waiting stock separate, type distinctions; no production state mutation endpoint |
| R8 | Existing lifecycle/API acceptance | Regression, retained unchanged | Existing authority, recovery, paused runtime restoration, roles, input sequencing and 600s journey remain mandatory |

## Commands

Use Node 24 executable `C:/Users/DINH LOC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe` as `node` below.

```text
node node_modules/vitest/vitest.mjs run tests/unit/arcade/order-flow-v2-independent.test.ts --maxWorkers=1
node node_modules/@playwright/test/cli.js test tests/api/arcade-order-flow-v2.spec.ts --project=api
node node_modules/@playwright/test/cli.js test tests/e2e/arcade-order-flow-v2.spec.ts --project=browser
node node_modules/vitest/vitest.mjs run --maxWorkers=1
```

## Historical v1 contradiction

R2 permits two unclaimed private parcels and explicitly supersedes v1 independent U13's one-waiting assertion. Only that test's maximum-stock expectation/title may be updated by the independent author; cost, cadence, value and all other v1 tests remain unchanged. Prior assertion and reason will be preserved in `order-flow-v2-red-baseline.md`.

## Coverage notes

The real Worker test uses a dedicated self-owned process/unique persistence at port 5193 and never touches the user's 5189/5191 processes. No fake clock, coin/position mutation or test endpoint is used there. Two-private affordability and the 180s distribution are covered deterministically at the production core/stream boundary; existing real 600s API acceptance remains the full wall-clock milestone check. Legacy persistence needs a recognizable safe outcome, but its new marker name is implementation-owned; do not invent a version field in tests.
