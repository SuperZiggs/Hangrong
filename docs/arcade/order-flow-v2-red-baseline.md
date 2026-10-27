# Independent order-flow v2 RED baseline

Author: independent acceptance-test agent; requirements/current production code/test conventions only. No design/implementation plan was read. Matrix was written and handed off before tests. No production file edited by this author.

## Core RED — 2026-10-28 01:36 Asia/Saigon

Working directory: `E:/MLN122/.worktrees/cuoc-dua-gianh-khach`; HEAD observed immediately after run: `6e49a499c7e4c1315dba06b54c5cdd8acfffcec5` (documentation-only progression, implementer had not begun production changes).

```powershell
& 'C:/Users/DINH LOC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/vitest/vitest.mjs run tests/unit/arcade/order-flow-v2-independent.test.ts --maxWorkers=1
```

Vitest 5.0.5 loaded the actual production imports successfully: **26 tests executed, 20 failed, 6 passed; exit 1**. There were no setup/type/module/dependency failures. Representative behavior mismatches:

| IDs | Observed missing behavior |
|---|---|
| U02–U06 | Early refill before 45000ms, wrong point/deadline, promotion interference and cooldown reset behavior |
| U08–U09 | Expected two waiting private parcels, got one |
| U10 | Ordinary parcel refilled after only 20000ms simulated time despite pause |
| U11–U15, U17–U20 | Second own private pickup remained unowned; two-parcel prerequisite expected 2 cargo, got 1. Thus downstream privacy/stream/fee/abandon assertions must also execute at GREEN |
| U22–U23 | Expected 17 new central destinations per 20 public parcels, got zero |
| U25 | Warning was `10 giây nữa: đơn hàng tập trung về trung tâm!`; required visible customer explanation absent |

Already-existing behavior passed: U01 opening stock, U07 40-coin purchase/first delay, U16 foreign private pickup rejection, U21 retained old orders/pickups at phase transition, U24 separate deliveries to same customer and U26 retained milestones. These are regression coverage, not claimed RED evidence for new behavior.

Core acceptance file SHA-256:

```text
DFE0220D3645D1A327324FAAF804CEC6B7664DCE8779C49FD335957A61B4FFCE  tests/unit/arcade/order-flow-v2-independent.test.ts
```

## Independently sanctioned historical U13 contradiction

Frozen packet R2 says "up to two unclaimed private parcels" and explicitly supersedes U13. Prior U13 title:

```text
U13 private channel costs 40 once and has at most one waiting order of value 8 every >=20s
```

Prior assertion preserved here verbatim (also retained in Git history):

```ts
expect(ownOrders).toHaveLength(1); expect(ownOrders[0].value).toBe(8);
```

Independent author changed only this title and `toHaveLength(1)` to `toHaveLength(2)`. Cost-39 rejection, 40-coin charge, no repeat charge, 60s wait and value-8 expectation are unchanged. All other historical acceptance tests remain unchanged. This is requirement contradiction resolution, not relaxation to fit implementation.

## Higher-level boundary evidence

### Real Worker RED — 2026-10-28, before UI implementation

The source tree `work/order-flow-v2-worker-red-source/{shared,realtime}` was frozen before the implementer began production changes. Its pre-change `shared/arcade/orders.ts` SHA-256 is `F4404891D8CACB42146E66E2B68756CEA71C9489911242C95E43B2492D6F352A`. Each API test copies production sources into a unique owned runtime directory to prevent file-watching edits from changing a running test.

```powershell
$env:ORDER_FLOW_V2_WORKER_SOURCE = (Join-Path (Get-Location) 'work/order-flow-v2-worker-red-source')
$env:ACCEPTANCE_REPORT_FILE = 'test-results/order-flow-v2-api-red.json'
$env:ACCEPTANCE_ARTIFACT_DIR = 'test-results/order-flow-v2-api-red'
& 'C:/Users/DINH LOC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/api/arcade-order-flow-v2.spec.ts --project=api
```

**V2-A01 executed and failed for absent R1 behavior**: after legal movement/pickup, pause freeze and authenticated reconnect passed; after resume the ordinary slot already had one replacement within roughly 2s of pickup, while expected stock was zero until 45s. Received replacement had the original pickup coordinates and `source: common`. Test body 3.3s, run 5.4s, exit 1. Report/trace/authoritative elapsed observations are under the paths above. Own runtime was terminated normally.

First sandbox attempts could not start the Worker/registry or terminate a child process and are **not** RED evidence. The valid run used approved elevated local execution. Runtime config stays in the owned workspace via `XDG_CONFIG_HOME`; it neither touches the user's original 5189/5191 services nor requires network deployment. A subsequent author-only annotation of the local `players` array fixed TypeScript inference, changing no behavior/assertion.

### Browser RED — unchanged production build at 5187

The original immutable frontend `dist` at 5187 was retained while the core implementation changed. The separate 5195 service used by that frontend may now contain the new core; thus E01 proves an old **UI** failure, while the isolated Worker above proves old core behavior.

```powershell
$env:ACCEPTANCE_BASE_URL = 'http://127.0.0.1:5187'
$env:ACCEPTANCE_REPORT_FILE = 'test-results/order-flow-v2-ui-red.json'
$env:ACCEPTANCE_ARTIFACT_DIR = 'test-results/order-flow-v2-ui-red'
& 'C:/Users/DINH LOC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/arcade-order-flow-v2.spec.ts --project=browser
```

- **V2-E01:** actual Chrome client loaded canvas/assets, actual keyboard movement plus a single E picked up a parcel; HUD showed `10 xu thực nhận`; the required 40–45s ordinary cooldown text was absent from visible DOM and passive canvas text observations. The behavioral assertion failed after 3s observation; test 28.9s including browser/trace overhead.
- **V2-E02:** actual ArcadeShell/Phaser/assets loaded with an authorized bootstrap/socket fixture carrying two value-8 private orders locked at fees 2 and 4, plus one waiting private order. HUD rendered primary `6 xu thực nhận` and `Phí P: 2 xu` only. Required second `4 xu` was absent, so the test failed at that assertion after 7s. A targeted `--grep V2-E02` run independently completed exit 1 (test 10.6s) and saved its report/artifacts under `test-results/order-flow-v2-ui-red-e02*`.

The full two-test browser run then completed **2 failed, exit 1**, with both failures at the behavioral assertions above. No environment/setup failure is counted.

No production mutation endpoint, fake server clock, or testing-only global game access was introduced. Passive `fillText` observation permits either canvas or DOM countdown/type labels. The network fixture is explicitly a browser/component boundary, not claimed to be a full real Worker private-channel journey.

### Final acceptance artifact hashes

```text
DFE0220D3645D1A327324FAAF804CEC6B7664DCE8779C49FD335957A61B4FFCE  tests/unit/arcade/order-flow-v2-independent.test.ts
94CC6BAEDBD48C42E14A4060175C523EACC48233659048F797BF1C2BB870CEEF  tests/api/arcade-order-flow-v2.spec.ts
C78BC1A6EFA7F883CA9B686CE0E3E0385BE990BF1D6149AE4B8FC69DC9877815  tests/e2e/arcade-order-flow-v2.spec.ts
```

Remove `ORDER_FLOW_V2_WORKER_SOURCE` for GREEN so the API test snapshots current production sources. The original independent expectations must remain unchanged through implementation.

## First post-core GREEN verification

The independent author reran V2-A01 with `ORDER_FLOW_V2_WORKER_SOURCE` absent against the implementer's current core: **1 passed, test 47.1s, run 50.5s, exit 0**. This exercised the complete legal real Worker 45s refill, pause/reconnect and undelivered-cargo assertions. Report and evidence are under `test-results/order-flow-v2-api-green*`. No acceptance assertion was modified. `tsc --noEmit --incremental false` also completed exit 0. Browser GREEN is pending the implementer's new frontend build.
