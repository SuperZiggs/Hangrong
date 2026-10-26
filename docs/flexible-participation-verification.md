# Flexible participation — verification and handoff

Updated requirements: starting minimum3, solo or group entrants, no fixed-six room rule. A saved device represents one answer sheet; display names may be individual or group names and duplicate names retain separate capabilities. Everyone in a room shares one leaderboard.

## Evidence

- Independent frozen requirements, matrix and RED: flexible-participation-requirements.md, flexible-participation-test-matrix.md, flexible-participation-red-baseline.md.
- Unit22/22, TypeScript and production build passed. Final browser6/6 passed:360px form, no position selector, min3 lobby, seventh entrant, six independent phones, refresh/offline and response-loss regressions. Screenshots at outputs/flexible-{mobile,lobby,desktop}.png were inspected.
- Final HTTP gate verified all26 and40 entrants over three rounds and replay, balanced reusable cases, concurrent autosaves/submits, acknowledged choices, late/stale rejection and unchanged90-point scoring. Individual results are retained in the final API report; do not substitute a skipped default for a separate opt-in test.
- Pre-upgrade paused D1 session retains capabilities, run, deadline, assignment and acknowledged draft; the actual capability witness is ignored in .wrangler, never committed.
- New store scheduling bounds same-isolate room copies and contention, retaining D1CAS authority across isolates/restarts. Read-only phase refresh writes only when grading actually changes state. Queued mutations re-read authoritative time before validation.
- Review found a valid MAX_SAFE_INTEGER legacy identifier could block auto-join; regression failed before the allocator fix and now passes through unit and realHTTP. No deferred reviewer minors. Old occupied-slot-selector minor is superseded by removing the selector.
- Runner-overhead investigation and logically equivalent helper batching: flexible-participation-harness-diagnosis.md. All entrant/type/capability predicates and150s timeouts retained;40-cohort with trace enabled passed38.592s after batching.

## Decisions and limits

Use one entrant model rather than separate solo/team room modes; mixed entrants share ranking and maximum points. No advance count setting. Minimum3 enforced by UI and API, joining new entrants closes when a run starts. Existing internal identifiers and explicit-slot clients remain supported for session compatibility.

Each round has six curated scenarios. Six or fewer receive distinct cases; more reuse cases evenly, with separately shuffled choices and stable reconnect. More participants does not create newAI-generated content. Same120/45/15 timing, three rounds and90-point maximum.

The product six-entrant cap is removed; hosting has physical memory/storage/throughput limits. Server retains512KiB room-state guard and abuse limits (join300/min per shared edgeIP; create/recovery unchanged). Tests prove the recorded cohorts, not infinite capacity or absence of transient BUSY retries. Classroom phones/two physical networks and difficulty equivalence still need a human rehearsal. Runbook remains docs/classroom-runbook.md.

Publication uses the existing public Site and exact source through Sites helper. Exact deployment/version IDs and anonymous production smoke are recorded separately in E:/MLN122/docs/superpowers/reports after successful publication. ND and slides are untouched.
