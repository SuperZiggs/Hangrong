# Arcade-only Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Remove the explicitly unwanted quiz and deploy the existing Cuộc đua giành khách from the user's named worktree.

**Architecture:** Root renders the existing arcade lobby; all arcade room URLs and realtime actor contracts remain stable. Cloudflare runs the Vinext website and SQLite Durable Objects realtime service without D1. Vercel continues to proxy to the website Worker using the current app-owned secret.

**Tech Stack:** Existing Vinext, React, Phaser, Wrangler, SQLite Durable Objects and Vercel routes; no added dependency.

**Spec:** `docs/superpowers/specs/2026-10-28-arcade-only-deployment.md`. User explicitly authorized removal and identified the source worktree.

## Global Constraints

- Canonical workspace: `E:\MLN122\.worktrees\cuoc-dua-gianh-khach`; baseline8637fa5 after receiving existing hosting fixes by fast-forward.
- Preserve `game/arcade`, `shared/arcade`, `realtime`, `assets/arcade`, `public/arcade/assets` and arcade acceptance assertions.
- No D1 requirement/binding/migration in active arcade deployment. No cloud DB or actor-data deletion, no Git history rewrite.
- Preserve gateway secret/Origin/auth/body/no-store boundaries; do not print credentials.
- Remove only traced quiz ownership and obsolete quiz-only documents/tests; keep generic framework support used by the app.

## Review Focus

- Root invite query survives opening the arcade lobby; old routes cannot still mutate quiz state.
- Removing the quiz stylesheet must retain generic reset/accessibility behavior the arcade inherits.
- Generated website config cannot contain stale D1 bindings or use a known obsolete build identity.
- Arcades created before this cleanup keep the same realtime namespace, paths and game rules.
- Sync/deploy must preserve operator configuration and encrypted secrets while replacing all deployed frontend artifacts.

### Task1: Independent acceptance and removal inventory

- [x] Independent author freezes `docs/arcade-only-test-matrix.md`, writes meaningful RED and owns quiz-only test deletion/mixed-test contract correction.
- [x] Map legacy import ownership; record a checked list of tracked files to remove. Git retains recoverability; no broad filesystem root deletion.

### Task2: Arcade-only application and provider configuration

- [x] Replace root quiz page with the existing arcade lobby preserving invitation room; update root metadata, lobby link and favicon; keep arcade paths/engine/assets.
- [x] Delete traced quiz routes, components, stores/content/engine/contracts/helpers, D1 schema/migrations/examples and old quiz stylesheet.
- [x] Rename package identity to `cuoc-dua-gianh-khach`; remove unused Drizzle dependencies/scripts and update lockfile without changing unrelated versions.
- [x] Make website build/config preparation independent of D1, preserve DO migration, reject old quiz build artifacts and retain app-owned secret.
- [x] Rewrite current README/operator guide/map for this game; remove obsolete quiz-only documents rather than retaining them as active instructions.
- [x] Run original arcade tests plus independent new acceptance, build/typecheck/unit/assets and provider dry-runs; obtain final diff review.

### Task3: Publish correct source and verify domain

- [ ] Commit and push reviewed change to `SuperZiggs/Hangrong` main; fast-forward both other checkouts while preserving ignored operator env.
- [ ] Prepare real hosting config from canonical worktree with operator's existing public addresses; verify target Worker names and secret name only.
- [ ] Deploy compatible realtime/website Worker artifacts to the existing Cloudflare account without changing namespaces or deleting data.
- [ ] Verify production root opens arcade and old routes are gone; smoke create/join/host/socket/reconnect in a separate test room; leave the test room paused.
- [ ] Update verification report with actual results, scope of physical cleanup and any limits. Current Git history is the rollback mechanism.

## Ledger

- Baseline source worktree clean at789370d; hosting-only fast-forward to8637fa5 completed with arcade core/asset trees unchanged.
- Live observation: Vercel `/` title is the quiz, while `/arcade` title is Cuộc đua giành khách; source confirms the route split.
- Operator account authenticated and website Worker already has `HANGRONG_ORIGIN_SECRET`; value was not read. Public origin is `https://hangrong1.vercel.app` and Worker names `hangrong` / `hangrong-realtime`.
- Independent author owns tests/ and new matrix/baseline. Production edits wait for valid RED; no separate user approval is needed for the explicitly authorized cleanup and correction.
