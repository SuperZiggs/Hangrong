# Independent RED baseline

Recorded 2026-10-26 against the untouched Sites/Vinext starter at `http://127.0.0.1:5187`. No production game code existed when these runs began. Tests were authored only from `docs/acceptance-requirements.md` and the starter, independently of the implementation plan.

## Commands and environment

Working directory: `E:/MLN122/web-game`.

```powershell
$testNode = 'C:/Users/DINH LOC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
& $testNode './node_modules/@playwright/test/cli.js' test --project=api
& $testNode './node_modules/@playwright/test/cli.js' test --project=browser
& $testNode './node_modules/typescript/bin/tsc' --noEmit
```

Node 24.22.1; Playwright 1.64.1; installed system Chrome via `channel: 'chrome'`. `playwright.config.ts` uses one worker and the existing server (no automatic server boot). `ACCEPTANCE_BASE_URL` can override the origin. Local networking/browser execution required sandbox escalation. An initial `connect EACCES` run was discarded and does **not** count as RED.

## Valid missing-behavior results

| Suite | Result | Actual missing behavior |
|---|---|---|
| API | 12 failed / 12; exit 1 | `POST /api/rooms` returned HTTP 404 HTML from the starter instead of creating a room. The error-contract case reached a room-state URL and received HTML rather than the required JSON error. |
| Browser | 2 failed / 2; exit 1 | Chrome loaded the starter. The landing test could not find the required visible `Mã phòng` label; the seven-context journey could not find the required `Tạo phòng` button. Both fail at the first missing product control, not at browser launch/navigation. |
| TypeScript | Passed; exit 0 | Confirms the independent support/config/test files compile with the installed project types. |

All 14 initially executable test cases therefore have a runnable RED baseline. Deeper assertions behind setup naturally cannot be reached until the product exists; the suite will exercise them unchanged during implementation. No syntax, import, unavailable dependency or missing browser errors are counted.

The browser journey was rerun once after adding an explicit visibility assertion before request listeners, avoiding orphan promise timeouts when the create control is absent. This strengthens setup diagnostics and does not change any expected product behavior. The clean second run has the missing-control failures shown above.

Author corrections before implementation verification: task IDs are not required to be globally unique across missions. Privacy checks retain the six distinct mission IDs, while a foreign task/choice mutation is rejected only when that pair is actually unassigned to the requester. The original global-task-ID assertion was invalid under the frozen packet. The packet requires the root `runId` field in the lobby but does not specify that it already holds a string, so lobby checks require the field's presence; an active run still requires a string. Team/leaderboard entry shape checks were added. The QR assertion was strengthened to require an accessible QR image/label rather than any decorative SVG/image. None changes the recorded first missing-behavior failure on the starter.

Historical invalid assertions retained here for review: `for (const task of other.mission!.tasks) expect(JSON.stringify(snapshot)).not.toContain(\`"${task.id}"\`);` and lobby `runId: expect.any(String)`. These were removed by the independent author for the requirements reasons above, not at an implementer's request.

## Artifacts and remaining coverage

- Matrix: `docs/acceptance-matrix.md`.
- API suite: `tests/api/acceptance.spec.ts`; support: `tests/support/api.ts`.
- Browser suite: `tests/e2e/acceptance.spec.ts`.
- API machine-readable baseline: `docs/acceptance-red-api-results.json`.
- Browser machine-readable baseline: `docs/acceptance-red-browser-results.json`.
- Traces are emitted under `test-results/artifacts/`; regular subsequent runs can overwrite that temporary directory.

Timing boundaries, private local-DB seeding, final scoring/ranks, CSV, expiry, replay and actual runtime-restart durability remain additional required coverage once the real schema/process exists. These are not skipped or silently deemed passing. Prior assertions must not be weakened to fit implementation.
