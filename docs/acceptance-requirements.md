# Frozen acceptance requirements — Quyền lực số

Approved by the human user on 2026-10-26. This packet describes externally observable requirements, not an implementation design. The source classroom design is E:/MLN122/docs/superpowers/specs/2026-10-26-web-game-doc-quyen-design.md. Do not read the implementation plan to author independent tests.

## Product

Vietnamese web classroom game for 2–6 teams, approximately 26 people, one phone per team. One host creates and controls a room. Players join by six-digit code or QR without an account. Group size does not affect points.

Three synchronized rounds. Each round: answering 120 seconds, review 45 seconds, leaderboard 15 seconds. After 540 seconds the final board stays visible for a one-minute classroom debrief. Instructions and joining are outside that time. Pause freezes remaining time and disables answer changes; resume preserves it.

At least six different missions per round, three tasks per mission, four uniquely identified choices per task. One correct answer, 10 points per task; wrong/blank 0; maximum 30/round, 90/game. No speed bonus. Each team in a round receives a different mission of comparable difficulty. New run randomizes assignments/choice order; reconnect keeps them. Equal scores share rank (1,1,3). No eliminations.

## Capabilities and JSON contracts

All API URLs below are relative to the preview origin. Client creates random 32-byte base64url capability strings (43 characters) and persists before create/join. Authorization uses `Bearer <token>`. Tokens must not appear in public data, QR or URLs. JSON errors have `{error:{code,message}}`; success may include further non-sensitive metadata.

- `POST /api/rooms`: `{requestId,hostToken}` → `{code,hostPath,joinPath,expiresAtMs}`. Repeat the same request/token returns the same room.
- `GET /api/rooms/:code/state`: snapshot root includes `role`, `code`, `roomVersion`, `runId`, `serverNowMs`, `phase`, `roundIndex`, `deadlineMs`, `teams`, `leaderboard`. Role is `public`, `host`, or `team`. A team gets only its own `mission`, `draft`, `locked`, `results`. Team entries include `slot`, `teamId`, `name`, `submitted`.
- `POST /api/rooms/:code/join`: `{requestId,slot,name,teamToken}` → `{code,slot,teamId,playPath}`. Slot 1–6; trimmed name 2–30 characters. Same token/slot rejoins; different token cannot take an occupied slot. Two concurrent joins cannot both own one slot. Joining new teams after start fails.
- `POST /api/rooms/:code/host`: host bearer and `{requestId,runId?,action,payload?}`. Actions: start, pause, resume, rename (`payload:{slot,name}`), remove (`payload:{slot}`), issue-recovery (`payload:{slot}`), replay. Start requires 2–6 teams. Recovery returns `recoveryCode`. Replay after finish creates a new run, keeping teams and sessions. Duplicate commands do not start/replay twice.
- `POST /api/rooms/:code/answer`: team bearer and `{requestId,runId,roundIndex,taskId,choiceId,seq}`. Round index 1–3, positive seq. Only assigned task/choice may be selected. Later seq wins; retry never duplicates score or reverts a later value.
- `POST /api/rooms/:code/submit`: team bearer and `{requestId,runId,roundIndex,answers:[{taskId,choiceId,seq}]}`. Saves last valid choices and locks the round atomically. No later edits, repeated submit is safe. Early submit earns no speed bonus and does not shorten the round.
- `POST /api/rooms/:code/recover`: `{recoveryCode,newTeamToken}`. One use, five-minute expiry; old device becomes unauthorized, new device retains mission/draft/points. Secret room code alone is insufficient to recover/take over a team.
- `GET /api/rooms/:code/export`: host bearer, CSV final standings without tokens or answer bank.

`mission` during answering contains `{id,title,context,tasks:[{id,prompt,choices:[{id,text}]}]}`. No `correctChoiceId`, explanation, correctness flags, or unassigned private scenarios may be exposed before review, including to the host. `draft` is a map keyed by task ID, values `{choiceId,seq}`. Review may add feedback/results for the requesting team; each result includes enough information to verify correctness and points. Leaderboard entries contain rank, teamId, slot, name, score, roundScores and correctCount.

Status codes: validation 400; bad/missing capability 401/403; missing room 404; occupied slot/locked round/old run/conflict 409; room expired 410; paused mutation 423; rate limit 429. No stack trace in response.

## Critical behavior

Server time is authoritative: answer accepted only while now < deadline, not at exact deadline. Clock changes on a phone cannot alter it. No request arriving after expiry can change a settled result. Answers already acknowledged before deadline survive disconnect, refresh and runtime restart. At timeout, grade the last acknowledged choices, blank=0.

Multiple teams submitting concurrently must not lose one another's work. The same answer/submit repeated must not inflate points. Previously queued requests from an old run must not affect a replay. No group can query/modify another room/group through its token, nor perform host commands with the public room code or team token. Normal responses and production client bundle must not contain secrets or premature answer keys.

## UI behavior

Landing: visible labels for room code, group slot and group name; buttons to join/create. Host: lobby/QR, start, countdown, submitted-team progress, pause/resume, recovery, final ranking and replay. Phone: mission/tasks, clear selected state, saving/saved/offline/locked states, submit, review and leaderboard. Refresh recovers a saved session. Last unacknowledged offline clicks must not be represented as successfully saved.

Vietnamese copy; usable at 360px viewport without horizontal scroll; selectable options at least 44px targets; keyboard/focus and reduced-motion support; feedback not conveyed only with color.

## Verification scope

Use real HTTP against the running baseline/app. One host plus six isolated browser contexts must be tested; a second room checks isolation. Include success, validation, race, permission, boundary, recovery and replay cases. Unit tests may test pure logic, but API/D1 acceptance cannot pass only against an in-memory fake API. Fixtures can seed/adjust a separate local test database after that schema exists; never add public test-only clock/score endpoints.

Record a valid RED baseline after the untouched starter serves: missing product behavior is a valid failure; syntax/import/dependency/browser failures are not. Initial acceptance tests can cover join/start/answer/permissions/refresh and add seeded timing/scoring coverage once the real database schema is present. Do not weaken independent assertions to match implementation.

Non-goals: AI runtime, individual accounts/scores, chat, uploads, payments, global ranking, complex business simulation. Scenarios are fictional and sources must align with supplied course material. Do not treat random business luck as knowledge points.
