# Arcade order flow v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement the approved per-point public cooldown, two-parcel private cargo, and 85/15 central delivery flow.

**Architecture:** Keep authority in shared simulation and the realtime room; renderer and React HUD consume projected snapshots. Preserve the primary cargo alias for existing callers and version new runs so persisted old games are never silently reset. Reuse all current assets and dependencies.

**Tech Stack:** TypeScript, Phaser 4.2.1, React/Vinext, Cloudflare Durable Objects, Vitest and Playwright/Chrome.

**Spec:** `docs/superpowers/specs/2026-10-28-arcade-order-flow-design.md` (user approved 28/10/2026). Requirements-only independent packet: `docs/arcade/order-flow-v2-requirements.md`.

## Global Constraints

- Per ordinary slot: 45,000ms from pickup, one waiting parcel; promotion is independent.
- Private: 40 coins, 8 per parcel, one spawn per >=20,000ms, max two waiting, max two carried private or one public, no mixing.
- Each E receives/delivers one; hold E 1,000ms at home abandons all cargo; per-parcel one-time fee locks.
- Three new far-bank central customers at 180,000ms; 17 of every 20 new public orders central and 3 outer after the milestone, private orders excluded.
- Existing phase times, roles, origin protections, event-driven presence cache, snapshot privacy and legacy quiz remain.
- No new dependency, AI generation or cloud publication. Use existing sprite assets with new labels/counts.
- Native inline execution is preserved from the project workflow; independent test author first and one fresh whole-branch review at the end. Approval of the concrete design authorizes this implementation; do not request approval again for routine plan transcription.

## Review Focus

- Cargo alias/array divergence under old fixtures, reconnect, private deltas and partially delivered two-parcel trips: task 1 migration and stream tests.
- Same-tick pickup, stock refill and multiple E packets must not duplicate parcels or money: task 1 duplicate/edge tests.
- New customers must appear after phase changes even when the Phaser map was drawn once: task 2 scene/Chrome milestone test.
- Full private stock and long pauses must not accumulate a spawn burst; expired public cooldowns must stay independent: task 1 boundary tests.
- Updating a persisted older room must preserve roster/results/coins and require a new run for new rules: task 1/3 recovery tests and runbook.

---

### Task 1: Authority, inventory and destinations

**Files:** Modify `shared/arcade/{types,config,world,orders,clock,maps,snapshot,stream}.ts`, `realtime/room.ts`; create `shared/arcade/cargo.ts` only for inventory operations shared by simulation/projection/UI. Test independent unit/integration suites and supporting regressions.

**Interfaces:** Existing world/interaction/snapshot exports remain. Add `Player.carriedOrderIds` with `carriedOrderId` as primary alias, `World.rulesVersion`, ordinary slot `{orderId,nextAt}` state and separate public destination counters; expose active central destinations through the map. Shared inventory readers handle absent arrays in legacy records. `restoreWorldForCurrentRules(world: World): boolean` recognizes old persisted active/paused games, preserves progress, marks interruption and returns whether storage changed. No client input may set inventory, destination, coins or phase.

- [x] Verify 115-test baseline, then have independent author produce requirements-derived matrix/tests and valid RED evidence before any production edit.
- [x] Implement per-slot take-time deadlines, private stock/cargo capacity and exactly-once settlement/abandon/fees, keeping compatibility alias synchronized.
- [x] Add active central destinations at 180,000ms with controlled 17/3 assignment independent of private spawns; keep old destinations and existing order targets.
- [x] Version fresh worlds; recognize legacy active/paused records and preserve them safely as interrupted with a clear new-run message, without resetting roster/economy. Old finished results stay readable; host replay starts v2. Do not enumerate WebSockets per simulation tick.
- [x] Run new independent rule suites, old unit suite with only author-sanctioned supersession, typecheck; expected all applicable tests PASS. Commit implementation and ledger outcomes.

### Task 2: Readable playfield, cargo HUD and timers

**Files:** Modify `game/arcade/phaser/{CityScene,ActorView}.ts`, `components/arcade/{ArcadeShell.tsx,arcade.css}`, shared inventory helpers if required by two current consumers. Add focused UI tests using existing browser harness.

**Interfaces:** Render current authoritative slots/map/cargo from task 1; preserve primary-order navigation while prioritizing delivery, then eligible pickup for spare private capacity. HUD identifies separate waiting stock/carried count and fee/net values. DOM/scene never changes economic state.

- [x] Run independent targeted UI expectations RED before edits.
- [x] Add dynamically arriving customers and announcement, parcel-type markers, empty slot countdowns, private stock count, visible two-parcel cargo and per-item net/fee details. Show both target and eligible second pickup without making E hints disagree with authority.
- [x] Preserve keyboard controls, reduced-effects preference, single-map camera and legacy public/owner privacy. Test 3:00 before/after snapshots in Chrome, HUD for two parcels, and two deliveries sharing one customer.
- [x] Run relevant units/typecheck/Chrome tests; expected PASS and screenshots have readable labels at 1366x768. Commit and ledger results.

### Task 3: Integrated verification and local handoff

**Files:** Update `docs/arcade/{classroom-runbook,playtest-report,deployment}.md`, add `docs/arcade/order-flow-v2-verification.md` and real screenshots; do not overwrite old evidence.

**Interfaces:** Real HTTP/WebSocket API remains unchanged; use separate worktree test ports so the original local game is undisturbed until final handoff.

- [x] Build production, realtime dry-run, run full applicable unit/API/browser suites and new independent acceptance. Record obsolete v1 assertions and their author's justification, all commands and failures/fixes. No need repeat the old real 600-second gate unless phase timing changes. Full API retains one pre-existing quiz40 stall, reproduced against the old build; scoped arcade gate14/14 passes, see the explicit ruling and verification report.
- [x] Verify multiplayer pickup cooldown, two-parcel privacy/settlement through practical integration plus UI; inspect actual screenshots and asset budget.
- [x] Request one fresh whole-branch review with spec, plan, ledger and base `d3dae7e`; regrade findings, fix Important/Critical in one test-first pass, record Minor for user.
- [ ] Commit final docs/evidence and safely fast-forward the clean original checkout locally, retaining worktree raw assets/evidence. Build original or copy only verified dist; restart only the owned local launcher after checking PID/command. Keep original data and explain that a new game is needed. No push or cloud deployment.

## Self-review

All design sections map to tasks 1–3. Shared cargo/map interfaces flow from task 1 to both renderers in task 2; server version handling flows into task 3 runbook and integration. The three tasks are one feature with coupled inventory/privacy/UI boundaries, not separate products. Verification focuses on actual state transitions and privacy rather than mirror tests of the implementation.

