# Flexible participation: independent RED baseline

Recorded against unchanged release `d47fe79f21b398fc7f67f71fc3003261d281236e` on 2026-10-27, real preview `http://127.0.0.1:5187`. The author read the frozen requirements and current code/test conventions, never the implementation plan. No production behavior was edited by this author.

| Suite | Valid baseline | Missing requested behavior |
|---|---|---|
| New unit requirements | 3 failed / 6, exit 1 | Two entrants start instead of throwing; 26/40 rejected by old 2–6 start rule. Existing 0/1 rejection and exactly-3 acceptance pass and are recorded as existing behavior. |
| New real HTTP/D1 acceptance | 5 failed / 5, exit 1 | Two-entrant start returns 200 instead of 409; name-only joins return structured 400 because slot is still required. All HTTP calls reached the real service. |
| New browser acceptance | 2 failed / 2, exit 1 | Phone form still exposes one fixed-position selector; empty host lobby displays `0 / 6 nhóm`, six placeholders and minimum two. Chrome launched and navigated successfully. |
| Pre-change persisted-room preparation | 1 passed / 1, exit 0 | An actual room with three legacy explicit-slot entrants was started, one answer acknowledged and the room paused. Saved host/team capabilities, run, assignment and draft were immediately verified. |

Evidence: `docs/flexible-red-unit-results.json`, `docs/flexible-red-api-results.json`, `docs/flexible-red-browser-results.json`, `docs/flexible-legacy-prechange-results.json`. Artifacts use separate `test-results/flexible-red-*-artifacts` directories to prevent collisions. No syntax/import/network/browser setup error is counted as RED.

Each new test has a valid missing-behavior baseline, or explicitly demonstrates existing behavior. Assertions behind an initial missing join/start naturally become reachable after implementation. The original safety/scoring/timing tests retain their assertions; only superseded fixtures/UI/identifier validation were adapted as documented in `docs/flexible-participation-test-matrix.md`. Exact historical originals remain accessible with `git show d47fe79:<test-path>`.

## Commands

Run from `E:/MLN122/web-game` with bundled Node 24; local networking/browser commands need this environment's sandbox escalation.

```powershell
$testNode = 'C:/Users/DINH LOC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
& $testNode './node_modules/vitest/vitest.mjs' run tests/unit/flexible-participation.test.ts --reporter=json --outputFile=docs/flexible-red-unit-results.json
$env:ACCEPTANCE_ARTIFACT_DIR = 'test-results/flexible-red-api-artifacts'
$env:ACCEPTANCE_REPORT_FILE = 'docs/flexible-red-api-results.json'
& $testNode './node_modules/@playwright/test/cli.js' test tests/api/flexible-participation.spec.ts --project=api
$env:ACCEPTANCE_ARTIFACT_DIR = 'test-results/flexible-red-browser-artifacts'
$env:ACCEPTANCE_REPORT_FILE = 'docs/flexible-red-browser-results.json'
& $testNode './node_modules/@playwright/test/cli.js' test tests/e2e/flexible-participation.spec.ts --project=browser
```

The paused pre-change session is stored only at ignored `.wrangler/flexible-participation-legacy.json`, not in source/docs/client artifacts. Do not recreate or overwrite it after implementation; it is the compatibility witness.

Pre-change fixture SHA256: `FB80A27BEB8E871E663189B59053E703FE0AF1BA84F97E7F3B365E6146CD053A` (fingerprint only; no capability is disclosed).

After implementation, run:

```powershell
$env:VERIFY_FLEXIBLE_LEGACY = '1'
$env:ACCEPTANCE_ARTIFACT_DIR = 'test-results/flexible-legacy-verify-artifacts'
$env:ACCEPTANCE_REPORT_FILE = 'test-results/flexible-legacy-verify-results.json'
& $testNode './node_modules/@playwright/test/cli.js' test tests/api/flexible-legacy.spec.ts --project=api
```

Preparation was performed with `PREPARE_FLEXIBLE_LEGACY=1` in a separate shell. Do not leave that environment variable set for verification. The compatibility test is explicit/opt-in to avoid future routine tests depending on an expired one-day session.

## Scope and integrity

The 26/40-entrant tests use the real room/state/answer/submit/recover/host API and actual D1. Shared Wi-Fi is simulated through the development request's trusted-edge IP header. Only documented transient `BUSY` 409 responses are retried, preserving request IDs/capabilities; validation, ownership, rate-limit and other conflict responses are never masked. Scenario balance and independent semantic choice orders are checked across all three rounds and replay. Private D1 elapsed-time fixtures affect only test-created rooms with matching host hashes. The genuine pre-change paused room is never time-seeded or destructively reset.

No long full-duration rerun was launched; existing exact timing and 600-second release evidence remain applicable to unchanged timing rules. New/modified test files passed TypeScript at handoff; final implementation must rerun old and new suites and the preserved compatibility witness.
