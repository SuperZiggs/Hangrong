# Independent post-schema acceptance verification

Authored 2026-10-26 from the frozen requirements and the current source/schema; no implementation plan was read. Original `tests/api/acceptance.spec.ts` assertions were preserved. New cases exercise real local D1 and the HTTP service, rather than an in-memory fake API.

## Coverage and current findings

- `tests/api/timing-scoring.spec.ts`: timeout grading of acknowledged choices, blank=0, rejection of late answer/submit, all 120/45/15 phase transitions, 10/30/90 scoring boundaries, early/late equal-score behavior, 1,1,3 ties, host-only final CSV, replay identity/randomization and stale packets, five-minute recovery expiry, room410, and recovery retaining settled points/current draft.
- Initial executable post-schema run: five cases passed and replay failed; a subsequent added graded-recovery case passed. These passing checks cover existing behavior and are not an invented RED baseline.
- **Discovered and subsequently fixed contract failure:** a previously acknowledged submit request retried after replay initially returned HTTP 200, while the packet specifies old-run conflicts return 409. The same test requires duplicate replay to be idempotent, a new run to retain team sessions/reset points/drafts, and queued old-run packets to be rejected. `docs/acceptance-extended-initial-results.json` preserves the initial 5-pass/1-fail run. The implementer subsequently reported all seven timing/scoring cases passing after fixing production code. No assertion was relaxed.
- `tests/unit/independent-boundaries.test.ts`: three passing supplementary tests prove answer/submit at deadline−1ms are accepted; exact deadline and deadline+1ms reject without altering draft; phase transitions occur exactly at each specified millisecond boundary. These supplement the HTTP deadline cases; they do not replace them.
- `tests/api/runtime-restart.spec.ts`: **passed**. It launches a separate local worker at 5188, acknowledges a correct answer, actually stops/restarts its owned process, verifies assignment/draft/deadline, settles 10 points, then stops/restarts again and verifies settled draft/results/points. The primary 5187 runtime stays alive. Evidence: `docs/acceptance-runtime-restart-results.json`.
- `tests/api/full-duration.spec.ts`: **clean rerun passed, exit 0**. The independent author resumed retained session 62536 and verified its final output: all original 120/45/15 phase boundaries through 540 seconds were observed for six independent teams, and the final board stayed unchanged through the complete 60-second debrief. The JSON reports one expected pass, zero unexpected failures/skips/flaky results, no errors, and total runner duration 601063.682 ms. Evidence copied to `docs/acceptance-full-duration-results.json`.
- The first real-duration run also completed every product assertion through 600 seconds, but teardown failed because concurrent Playwright commands had cleared the shared trace artifact directory (`ENOENT` during context disposal). That earlier run is **not** claimed as a passing test. Its evidence remains in `docs/acceptance-full-duration-harness-collision.json`; the clean rerun above uses separate artifact/report paths.
- Original `tests/e2e/acceptance.spec.ts`: **both cases passed** on the stable local server at 5187, one worker. This includes one host and six isolated phone contexts, unique assignments, 360 px overflow checks, 44 px option targets, keyboard/selected-state checks, acknowledged save/reload, offline honesty/reconnect, submission locking and host progress. JSON evidence: `docs/acceptance-browser-final-results.json` (expected 2, unexpected 0, skipped 0, errors empty; runner duration 92886.984 ms). Other newly authored browser regressions are tracked separately by the implementer.
- The independent author corrected a browser harness race without changing any product assertion or timeout: full-page create/join navigation could destroy the source document before `localStorage` or Chrome response-body reads. The harness now transparently records the actual create/join server reply using `route.fetch()` and delivers that same reply unchanged with `route.fulfill({ response })`; it then waits for the returned host/play URL through DOMContentLoaded before inspecting storage. This is observation of real HTTP/D1, not a stub API. Merely moving `response.json()` into the response callback was insufficient because Chrome could discard the resource during navigation.
- New test/support files passed TypeScript and targeted ESLint during authoring. The navigation stabilization and optional `Snapshot.you` metadata addition passed targeted ESLint; they do not alter accepted values, capabilities, timing requirements or authorization expectations.

The first local-D1 harness attempt assumed Wrangler exposed `meta.changes`; this Wrangler JSON format omits that field. The fixture was corrected to use `SELECT changes()` and still requires exactly one scoped row changed. The initial worker harness also needed a Windows `file:` URL for Node's `--import` and cleanup that preserves startup diagnostics. Those setup failures are excluded from product findings and RED claims.

## Commands

From `E:/MLN122/web-game`, with the existing local primary server at 5187:

```powershell
$testNode = 'C:/Users/DINH LOC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
& $testNode './node_modules/@playwright/test/cli.js' test tests/api/timing-scoring.spec.ts --project=api
& $testNode './node_modules/vitest/vitest.mjs' run tests/unit/independent-boundaries.test.ts
$env:RUN_RESTART = '1'
& $testNode './node_modules/@playwright/test/cli.js' test tests/api/runtime-restart.spec.ts --project=api
$env:RUN_REAL_DURATION = '1'
$env:ACCEPTANCE_ARTIFACT_DIR = 'test-results/full-duration-artifacts'
$env:ACCEPTANCE_REPORT_FILE = 'test-results/full-duration-results.json'
& $testNode './node_modules/@playwright/test/cli.js' test tests/api/full-duration.spec.ts --project=api
```

The two opt-in process/long-duration cases are skipped in ordinary API runs to keep the normal feedback loop short. They must be explicitly executed for release verification; their opt-in status is not an exemption. Local HTTP/worker commands require the environment's sandbox escalation.

When running Playwright invocations concurrently, each needs its own `ACCEPTANCE_ARTIFACT_DIR` and preferably `ACCEPTANCE_REPORT_FILE`; otherwise Playwright clears another live invocation's tracing directory at startup. The isolated long-run command above avoids this collision.

The fixture in `tests/support/local-d1.ts` uses the actual `.wrangler/state` database through Wrangler `d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state`. Every SELECT/UPDATE is restricted to a room created by the current test **and** its host capability's SHA256 hash. No global rows, answer bank, rate-limit table, production endpoint or server clock is modified. Only that test room's persisted start/expiry fields are adjusted; actual-time 600-second coverage uses no fixture.
