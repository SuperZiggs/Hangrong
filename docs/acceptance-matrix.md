# Independent acceptance matrix

Source: `docs/acceptance-requirements.md`, frozen 2026-10-26. The author has not read the implementation plan. Tests exercise the real preview HTTP surface; no fake API or production test endpoint is used.

Commands use `npx playwright test --project=api` (A) and `npx playwright test --project=browser` (B). The server must already be listening at `http://127.0.0.1:5187` (override `ACCEPTANCE_BASE_URL`).

| Requirement | Level / scenario | Expected public observation | Test / command |
|---|---|---|---|
| Capability room creation, idempotency, public data | API; retry create with the same request and token | One six-digit room, stable paths, future expiry; no capability in response or public snapshot | create contract (A) |
| Validation and errors | API; missing room; invalid slot/name; missing or invalid authority | Correct 400/401/403/404 class; structured safe JSON errors | validation and permission cases (A) |
| Slots and rejoin | API; concurrent join race; retry and same-token rejoin | Exactly one owner per slot; same team identity; other token conflicts | join race (A) |
| 2–6 teams, host authority | API; start with one then six teams; team/public host attempts | One-team start fails; six-team start succeeds; unauthorized host commands fail | start boundary and authority (A) |
| Assignments and privacy | API; six teams in one round | Six different missions, three tasks, four uniquely identified choices; no premature keys or other teams' private tasks | six-team assignment (A) |
| Tenant/session isolation | API; second room and cross-room capability | Token cannot read private state or mutate other room/team; ordinary public access remains possible | isolation (A) |
| Autosave sequence and retry | API; reordered/repeated answers plus new request ID at same sequence | Highest acknowledged sequence remains; no rollback from old retry | autosave ordering (A) |
| Atomic submit, concurrency, early submission | API; invalid mixed payload; concurrent six-team submits; retry then edit | Invalid payload does not partially save/lock; valid payload saves and locks; all teams retained; original deadline preserved | submit atomicity and concurrency (A) |
| Pause/resume | API; pause, wait, edit, resume | Answer/submit rejected with 423; remaining time frozen and preserved | pause (A) |
| Recovery | API; host issues code, new device redeems once | Public code insufficient; old token unauthorized; mission/draft retained; second redemption fails | recovery (A) |
| Host controls | API; rename/remove in lobby | Trimmed name visible; removed capability cannot retain a team session | lobby controls (A) |
| One host and six isolated phones | Browser; create, join six, start | Seven independent contexts converge on one room, distinct assignments, host progress; no URL tokens | classroom journey (B) |
| Session persistence / offline honesty | Browser; save, refresh, disconnect click, reconnect | Acknowledged choice survives reload; pending offline change never says saved; reconnection is recoverable | classroom journey (B) |
| Mobile/accessibility | Browser; 360px and reduced motion | Visible associated labels, no horizontal overflow; choice targets >=44px; keyboard focus and selected state | landing and classroom journey (B) |
| Authoritative 120/45/15 timing, expiry boundary, timeout settlement | API + private local DB fixture after schema exists | Accept only before deadline; grade acknowledged answers; blank=0; late edits cannot change settlement | pending schema fixture; will add without altering prior assertions |
| Scoring, tied ranks, CSV, replay isolation | API + private local DB fixture after schema exists | 10/task, 30/round, 90/game; 1,1,3 rank; host-only CSV; replay retains teams but old requests conflict | pending schema fixture; will add without altering prior assertions |
| Recovery expiry / room expiry | API + private local DB fixture after schema exists | Recovery rejected at five minutes; room returns 410 | pending schema fixture |
| Runtime restart durability | HTTP + process restart coordination | Acknowledged drafts and settled points survive the actual runtime restart | pending process coordination after implementation |
| Bundled privacy and course content | Bundle inspection / content review after implementation | Production client assets contain no server secrets or premature answer key; fictional curriculum-aligned scenarios | pending production artifact and course-content review |

Initial RED must be missing behavior on the running untouched starter. Dependency/import/browser startup failures do not count. Pending cases are additional coverage, not exemptions; no approval to skip a required test level is inferred.
