# Vercel + Cloudflare Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the existing game deployable with a Vercel public URL, Cloudflare website Worker/D1, and direct realtime Worker WebSockets.

**Architecture:** Keep the existing Vinext app on Cloudflare. A separate, configuration-only Vercel project forwards HTTP requests and supplies a server-side shared secret. The website Worker validates that gateway at its entry boundary, retaining the existing application Origin/capability guards and using the verified visitor IP for rate limits.

**Tech Stack:** Existing Node >=22.13, Vinext/Vite, Wrangler, D1, SQLite Durable Objects, Vercel routes; no new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-28-vercel-cloudflare-deployment-design.md`. User explicitly requested implementation on 28/10/2026 after receiving the design. Host-ready source/configuration is this turn's deliverable; creating cloud resources and validating live domains require later account access.

## Global Constraints

- Preserve quiz/arcade behavior, local execution, Sites identity, D1 data and existing Durable Object migration `v1`.
- Only exact configured public origin; no `*.vercel.app` wildcard.
- Never expose the gateway secret in Git, logs, browser assets or generated config.
- No paid plans, new dependencies, destructive migrations or user-preview shutdown.
- Approved platform choice is Vercel + Cloudflare. Default resource/project names `hangrong` and `hangrong-realtime` follow the supplied GitHub repo name; configurable by environment.

## Review Focus

- Forged gateway/IP/forwarded-host headers must not change request trust or bypass limits.
- Missing/malformed gateway settings must fail closed when gateway mode is enabled.
- Paths, query, POST body and authorization must survive the proxy; responses carrying room state remain uncached.
- Non-default Worker names, real D1 IDs and paths outside the build directory must resolve correctly without secrets in output.
- Existing local mode and QR generation must still use the actual browser origin; realtime remains WSS to its own Worker.

### Task 1: Gateway request boundary

**Files:** create `worker/gateway.ts`; modify `worker/index.ts`, `cloudflare-env.d.ts`; independent acceptance suite under `tests/` chosen by test author.

**Interfaces:** `prepareGatewayRequest(request: Request, env: GatewayEnv): Request | Response`, where env has optional `PUBLIC_SITE_ORIGIN` and `HANGRONG_ORIGIN_SECRET`. Vercel supplies `x-origin-secret` and its provider-owned `x-real-ip`.

- [x] Record independent RED acceptance baseline against the current production runtime, with dedicated D1 state.
- [x] Implement at the Worker boundary: when both env settings are absent, retain direct/local mode; when configured, validate settings, require a timing-safe secret match, reject foreign Origin and invalid/missing visitor IP, rebase the logical request URL to the configured public origin, and supply the validated client IP to the existing limiter.
- [x] Preserve method, query, body and bearer authorization; remove gateway/forwarding headers before handing to the application. Existing request guards and database code stay intact.
- [x] Run the independent suite unchanged and verify trust, rate-limit and quiz/arcade flows.

### Task 2: Portable provider configuration

**Files:** create `scripts/prepare-hosting.mjs`, `.env.hosting.example`, `deploy/vercel/vercel.json`, `deploy/vercel/public/.gitkeep`, `tests/unit/hosting-config.test.ts`; modify `package.json`, `package-lock.json`, `.gitignore`.

**Interfaces:** `createHostingConfigs(buildConfig, env, root)` returns website/realtime Wrangler config without secrets. CLI reads existing build config and writes ignored `.hosting/website.wrangler.json` and `.hosting/realtime.wrangler.json` after validation.

- [x] Write/run failing config-generator tests for real D1 binding, URL validation, secret exclusion and path resolution before implementation.
- [x] Generate website config from Vite's actual emitted config; preserve compatibility flags/module settings, replace placeholder database, set exact public/realtime URLs, and rebase file paths.
- [x] Generate realtime config from existing Wrangler template, preserving `new_sqlite_classes` and migration tag. Add exact allowlist and WSS URL.
- [x] Add a dependency-free Vercel proxy project (`framework: null`, no install/build, `public` output) with environment-expanded Cloudflare destination and server-side secret header replacement. Keep dynamic/API responses uncached.
- [x] Add explicit scripts for prepare, D1 migrations, website and realtime deploy. Preparation never creates remote resources.
- [x] Verify generated Wrangler config with local dry-run, and validate the Vercel config against provider schema where available.

### Task 3: Operator guide and release verification

**Files:** create `docs/hosting-vercel-cloudflare.md`; update README, arcade deployment guide and design status; record verification and any limits.

- [x] Document Vercel root `deploy/vercel`, exact environment variables, D1 creation/migration, shared-secret entry, both Worker deploys, and live acceptance/rollback without deleting data.
- [x] Run typecheck, full unit suite, independent hosting integration, build, asset validation and relevant browser/API regression checks. Keep the existing preview running by building a source snapshot when Windows locks `dist`.
- [x] Obtain a fresh whole-diff review. Fix actionable regressions with tests.
- [x] Record exact verified results and prepare the reviewed tree for the already-authorized GitHub push; the Git history and final reply record the publication outcome.

## Execution ledger

- Baseline: clean `work/quyen-luc-so` tracking `origin/main`, HEAD `5a2b60d`; unit suite 147/147 passed.
- Independent author: `hosting_acceptance` owns tests/matrix/RED baseline only, with no implementation design.
- Ruling: work in the current clean feature checkout; no additional Git worktree is needed or created. A source snapshot is only a disposable build workspace, not a second implementation checkout.
- Ruling: continue the explicitly requested implementation without another approval round; the user has now instructed the design to be implemented.
- Build environment: active user preview on 5189 locks `dist`; use isolated source snapshot under `E:\MLN122\.codex-build` and never stop that preview.

- Task 1 done: independent RED recorded; 22/22 integration acceptance PASS with original assertions. Bounded rejection-body handling fixes workerd transport failure without changing accepted streams.
- Task 2 done: 177/177 unit tests, typecheck, real config generation, provider schema, both Worker dry-runs, and D1 migration/repeat checks PASS.
- Task 3 done: operator guide and verification report complete; independent reviewer found no remaining P1/P2. Source snapshot hashes match the checkout.
- Ruling: one coherent release commit for the gateway, deployment config, independent tests and guide; live cloud publication remains outside this source-preparation request until accounts are available.
- Provider correction: the user's Vercel import UI rejected the previous `VERCEL_ORIGIN_SECRET` key. Use the app-owned `HANGRONG_ORIGIN_SECRET` consistently in the Worker, proxy and operator guide; keep header and capability validation unchanged. Independent regression: RED 10/28, then GREEN 179 unit and 22 hosting scenarios.
