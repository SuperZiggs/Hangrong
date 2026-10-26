# Independent flexible-participation acceptance matrix

Source: `docs/flexible-participation-requirements.md`, frozen 2026-10-27. The author did not read the implementation plan. Historical test originals remain in Git commit `d47fe79f21b398fc7f67f71fc3003261d281236e`.

| Requirement | Executable level/scenario | Expected observation |
|---|---|---|
| Minimum is three, including solo entrants | Unit and real HTTP: 0/1/2 rejected, exactly 3 start | No one-/two-entrant run; three receive normal missions |
| Name-only joining, duplicate names and retries | Real HTTP: omitted slot; concurrent retries with one saved capability; separate capabilities sharing a name | Server assigns stable unique positive identifiers; one record per capability; names do not confer ownership |
| More than six and shared classroom Wi-Fi | Real HTTP/D1: cohorts of 26 and 40, concurrent requests from one simulated trusted edge IP | Every entrant joins/starts/answers/submits; no six-entry or accidental 30-join ceiling; bounded BUSY conflicts may be retried |
| Curated scenarios reused fairly | Unit and HTTP/D1: 26/40 entrants, three rounds and replay | Six scenarios per round; frequency differs at most one; independently shuffled choices; stable reconnect; no premature keys |
| Host controls and authority after entrant six | HTTP: rename/remove/recover seventh/eighth; cross-room and team-to-host abuse | Correct entrant changes; removed/old capabilities revoked; other entrants and rooms isolated |
| Persisted data compatibility | Prepare an actual paused pre-change room with acknowledged draft; verify it after implementation | Same host/entrant capabilities, run, assignment and draft remain usable; no reset |
| Phone join supports individuals and groups | E2E at 360 px: visible room/display-name form, no slot selector; one solo + groups join the same room | No position selection or mode/count setup; lobby actual count/minimum three; no fixed `/6` placeholders; refresh retains identity |
| Existing invariants | Existing safety/scoring/timing tests retained | Same authorization, pause, recovery, idempotency, replay, 10/30/90 scoring and 120/45/15 timing assertions |

New files: `tests/unit/flexible-participation.test.ts`, `tests/api/flexible-participation.spec.ts`, `tests/api/flexible-legacy.spec.ts`, `tests/e2e/flexible-participation.spec.ts`. No production test endpoint or fake API. Private D1 time changes remain scoped to rooms created by the test. No 600-second rerun is needed for this participation-only change.

## Required adaptations to superseded tests

- `tests/support/api.ts`: default start fixture changes 2 → 3. Existing explicit legacy-slot helpers remain, preserving occupied-slot protection and persisted-session coverage.
- `tests/api/acceptance.spec.ts`: slot 7 is no longer invalid; use a negative identifier instead. Duplicate-start fixture gains a third entrant. All six-person uniqueness, isolation, sequencing, submit and timing assertions remain.
- `tests/unit/engine.test.ts` and `tests/unit/independent-boundaries.test.ts`: fixtures that start a game gain a third entrant; their business/timing assertions stay unchanged.
- `tests/api/runtime-restart.spec.ts`: add a third entrant before starting; persistence assertions remain.
- `tests/e2e/acceptance.spec.ts`: remove required slot selection, use a display-name label compatible with solo/group wording, and assert the slot control is absent. The unchanged six-phone journey remains a valid subset of flexible participation; six distinct scenarios and submitted progress remain expected for six actual entrants.
- `tests/e2e/recovery-response-loss.spec.ts`: only user-facing solo/group-neutral recovery wording may be generalized if that wording changes; capability-retry assertions remain intact.

These are requirement corrections approved by the frozen packet, not relaxations to match implementation. Git retains the exact prior assertions. All later changes to independent assertions require this author's requirements-based review.
