# Independent acceptance RED baseline

Recorded 27 October 2026, before any arcade production implementation. Workspace: `E:\MLN122\.worktrees\cuoc-dua-gianh-khach`. Author read only the frozen packet, owner clarifications of its public contracts, and existing test/config conventions. No implementation plan, art design, or new arcade production code was read. The traceability matrix was the first authored artifact.

## Verified result

| Level | Executed | Result | Actual failure |
|---|---:|---|---|
| Unit | 19 | 19 failed, valid RED | Explicit assertion: `Missing arcade behavior: frozen public entry point shared/arcade/world.ts (createWorld) has not been implemented` |
| HTTP/API | 11 | 11 failed, valid RED | Real `POST http://127.0.0.1:5189/api/arcade/rooms` returned **404**; expected successful create |
| Chrome E2E | 3 | 3 failed, valid RED | E01/E02: real navigation `/arcade` returned **404**, expected 200; E03: real arcade-create API returned **404** |
| TypeScript | whole checkout | **PASS**, exit 0 | `tsc --noEmit --pretty false` |

All 33 acceptance tests collected and executed. No syntax, module/dependency, collection, or unavailable-browser failure is counted as RED. Missing entry points are deliberately asserted before dynamic import, as the packet permits. Other import failures propagate unchanged.

## Reproduction commands

PowerShell, working directory above. Bundled runtime is Node **v24.22.1**:

```powershell
$arcadeNode = 'C:\Users\DINH LOC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $arcadeNode node_modules/vitest/vitest.mjs run tests/unit/arcade/independent-acceptance.test.ts

$env:ACCEPTANCE_BASE_URL = 'http://127.0.0.1:5189'
$env:ACCEPTANCE_REPORT_FILE = 'test-results/arcade-independent-api-red.json'
$env:ACCEPTANCE_ARTIFACT_DIR = 'test-results/arcade-independent-api-red'
& $arcadeNode node_modules/@playwright/test/cli.js test tests/api/arcade-independent.spec.ts --project=api

$env:ACCEPTANCE_REPORT_FILE = 'test-results/arcade-independent-ui-red.json'
$env:ACCEPTANCE_ARTIFACT_DIR = 'test-results/arcade-independent-ui-red'
& $arcadeNode node_modules/@playwright/test/cli.js test tests/e2e/arcade-independent.spec.ts --project=browser

& $arcadeNode node_modules/typescript/bin/tsc --noEmit --pretty false
```

Root managed the preview on port 5189. API and Chrome commands needed `require_escalated` on this machine because sandboxed local network access was denied. Those escalated commands were accepted. An initial sandbox API `EACCES`, browser `ERR_NETWORK_ACCESS_DENIED`, and a subsequent preview-lifecycle `ECONNREFUSED` are environment failures and explicitly **excluded** from RED evidence. Root restored the preview as a hidden detached process; the final elevated Chrome run produced the genuine 404 failures above. No browser flags or repository configuration were changed.

Evidence files: `test-results/arcade-independent-api-red.json`, `test-results/arcade-independent-ui-red.json`; corresponding per-test error contexts and Playwright traces are under their named artifact directories. Unit baseline is the actual Vitest command output: `19 tests | 19 failed`, execution 22ms, failing on the explicit missing-feature assertion.

## Acceptance integrity / handoff

SHA256 at the gate:

| File | SHA256 |
|---|---|
| `tests/unit/arcade/independent-acceptance.test.ts` | `9100CA8A30005954FEE52445EEC74C09AEFE323889D08472F25FCE722ABEEEAE` |
| `tests/api/arcade-independent.spec.ts` | `D5EE4D8D39B6812404082F15EED7CF76910E89C78C9481D9C5686D49F773946D` |
| `tests/e2e/arcade-independent.spec.ts` | `509DA07FA4ED823B93CB52B61BE8C98C322E45A51748F806DA34792C317AEEBE` |
| `tests/support/arcade-independent.ts` | `295CC7A019E7B753C0EAF8C9EB6411E8C5AF6613B06F4CB7F83F4844A296813E` |

The implementer may add supporting tests, but must not weaken these assertions. Technical invalidity or conflict with the packet requires independent-author/reviewer evidence and a recorded reason. Only one test-author technical correction occurred before the gate: native editable setup uses DOM `appendChild` to avoid the project's Cloudflare/DOM overload collision; no acceptance assertion changed.

## Limits and required later evidence

- RED proves that the independently written tests detect the missing feature. It does **not** prove the deeper assertions already pass. After implementation, run the unmodified original unit/API/E2E suite and existing quiz regression suites.
- A09 contains real 26-socket activity through a small built-in-Node RFC6455 client. It was reached only as far as create-room 404 in this baseline. No 26-player performance success is claimed yet.
- A10 is an enabled real **600s** integration test (660s timeout), with no clock/DB mutation, recording actual wall/simulation phase observations and final CSV. It failed immediately on create-room 404 here. No completed 600s run is claimed yet. During development, targeted tests may omit A10 explicitly; final acceptance must run it.
- E02 records real browser navigation/paint metrics and a screenshot when implemented. Its 125% check uses CSS zoom and labels that fact; native browser zoom and visual font/art review remain separate QA.
- Asset completeness/alpha/foot anchors/provenance, 10-second announcement presentation, modal/hidden/offline/interrupted UX, muted-audio quality, and classroom human/Wi-Fi testing require the owner's separate evidence. The packet lacks an announcement-field or asset-manifest schema, so tests do not invent those contracts or claim coverage from filenames alone.
- Shared-route cost/contributed/open and map/player setup clarifications came directly from the requirements owner. No production timing/position/coin mutation endpoint is used by any test.

No production/configuration/dependency files were edited; no commit was created by the test author.
