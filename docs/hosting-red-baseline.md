# Independent hosting acceptance RED baseline

Baseline source: branch `work/quyen-luc-so`, commit `5a2b60d`. The independent author received only the frozen hosting contract and current code, and did not read the proposed design or implementation plan. Production/config/package files were not changed by the author.

The workspace preview on ports 5189/5191 held `dist` open on Windows. The parent built an isolated copy of the same baseline at `E:\MLN122\.codex-build\hosting-baseline-20261028`. This avoids interrupting the user's existing preview. Local D1/Workers required loopback network permission outside the default restricted sandbox; no cloud account or remote deployment was used.

The final core baseline command (PowerShell, from `E:\MLN122\web-game`) was:

```powershell
$env:HOSTING_BUILD_ROOT='E:\MLN122\.codex-build\hosting-baseline-20261028'; node tests/hosting/run-hosting-acceptance.mjs --grep 'H0[1-8]|H10'
```

Result: **20 executed, 15 failed for missing hosting behavior, 5 passed**, in 9.5 seconds of Playwright execution. The D1 migration, website Worker, direct-mode Worker, realtime Worker, actual HTTP proxy, and actual WebSocket handshake setup succeeded. All owned server process trees were stopped by the harness afterward.

Evidence: `.wrangler/hosting-acceptance/1793165561973-12436/playwright.log`, `website.log`, `direct-mode.log`, `realtime.log`, `proxy.log`, and migration log. The generated JSON report is written to `test-results/hosting-acceptance-results.json` and may be replaced by later runs.

| Coverage | Baseline observation | Interpretation |
| --- | --- | --- |
| H01, H02 public-origin quiz/arcade journeys | Valid secret + exact `https://hangrong.vercel.app` Origin receive HTTP 403 `ORIGIN` on creation | Website only recognizes its private/local request origin; public hosting behavior is absent |
| H03 missing/wrong/case-changed/prefix secret (4 cases) | Direct Worker creation returns 200 despite enabled gateway variables | Gateway credential enforcement is absent |
| H03 exact-origin rejects (6 cases), H04 forwarded-domain spoof | Hostile Origin is denied, but arcade error responses lack `Cache-Control: no-store` | Existing Origin denial must be preserved; required response caching protection is missing on arcade error paths |
| H05 per-visitor quota | Visitor A gets 10 creates then 429; visitor B's first create also receives 429 despite a distinct `x-real-ip` | Requests are grouped by the shared Cloudflare-observed proxy peer instead of authenticated visitor IP |
| H07 malformed/oversized request | Error status is returned, but an arcade oversize response lacks no-store | Body limit exists; gateway-visible cache protection needs to cover the error path |
| H06 | PASS: changing untrusted forwarded IPs in no-gateway mode cannot escape the CF IP quota | Required direct-mode regression protection is executable |
| H07 capability/body/query/method | PASS: quiz bearer, UTF-8 name, GET with query, unsupported method, and unauthorized host/export checks | Existing boundary behavior covered independently |
| H07 arcade capability checks | PASS: public/player/foreign capability cannot perform host/export actions | Existing arcade authorization covered independently |
| H08 | PASS: actual public-Origin realtime WebSocket authenticates; six nearby/hostile origins receive 403 | Direct socket transport and exact allowlist are executable |
| H10 | PASS: local same-Origin quiz and arcade create/join/bootstrap work without gateway variables | Required compatibility mode covered against real runtime |

Browser H09 was additionally isolated with:

```powershell
$env:HOSTING_BUILD_ROOT='E:\MLN122\.codex-build\hosting-baseline-20261028'; node tests/hosting/run-hosting-acceptance.mjs --grep 'H09 arcade'
```

It rendered the public-origin arcade lobby, clicked the actual create control, and failed at **expected 200, received 403 `ORIGIN`**, before QR generation (1 test failed in 1.3 seconds). Evidence is under `.wrangler/hosting-acceptance/1793165537513-3344`. The quiz browser case independently exhibited the same expected-200/received-403 failure in the previous whole-suite run at `.wrangler/hosting-acceptance/1793165399615-16216`. A sequential whole-suite browser run also encountered an arcade page-load timeout after the preceding expected RED browser failure; that timeout is not counted as valid RED evidence. The isolated real-browser 403 demonstrates missing hosting behavior without that setup ambiguity.

Author corrections before the final baseline: quiz start requires three entrants; unsupported PUT is sent without an unnecessary body and its response is consumed; browser route callbacks deliver the actual failure response before the test asserts. These corrections remove test setup mistakes and do not relax a requirement. Readiness uses the valid gateway credential so the harness remains usable once direct bypass is correctly rejected.

Limits: no real Vercel/Cloudflare deployment, DNS, or TLS was exercised. The test proxy reproduces documented request-header contracts and actual HTTP forwarding. Browser routing preserves a virtual public HTTPS origin and delivers genuine local gateway responses. QR visibility and copied URL retention are asserted; QR pixels are not independently decoded. Full 10-minute gameplay remains covered by existing game acceptance suites.

## Final GREEN verification

After the implementer confirmed the updated snapshot build had completed, the independent author ran the original acceptance assertions with:

```powershell
$env:HOSTING_BUILD_ROOT='E:\MLN122\.codex-build\hosting-green-20261028'; node tests/hosting/run-hosting-acceptance.mjs
```

Final result: **22/22 PASS, 0 skipped, 0 flaky**, 5.1 seconds of Playwright execution. The stable run's evidence is `.wrangler/hosting-acceptance/1793166353142-30508/playwright.log` plus the per-server and proxy logs in that directory; JSON is `test-results/hosting-acceptance-results.json`. Both browser tests now complete: actual host pages render QR images and copy quiz/arcade join URLs using `https://hangrong.vercel.app`. Quiz per-client quotas, invalid-secret rejection, exact Origin checks, no-store, capabilities, direct realtime WebSockets, and no-gateway compatibility all pass through the actual local runtimes. The harness closes its owned processes on completion.

One intermediate GREEN attempt had 14 passes and 8 HTTP 503 failures on early rejection (`Your worker restarted mid-request`); evidence is `.wrangler/hosting-acceptance/1793165883949-26488`. Before the final run, two changes were made: the implementer added bounded discard of rejected request bodies, and the author isolated each test Worker's development registries. The acceptance assertions were not changed. An [upstream workerd report](https://github.com/cloudflare/workerd/issues/7634) describes connection resets after an early response leaves a request body unread across a service binding on Windows; this supports the body-handling explanation, but the final test does not independently separate the effect of the two changes. A run begun while the same snapshot path was being rebuilt is not used as the final stable-build evidence.

Acceptance integrity (SHA-256):

| Artifact | Hash |
| --- | --- |
| `tests/hosting/hosting.spec.ts` | `172C2A0AB6B948196C1C7FE31C25DD30669AC6A5A3FA5678466AB5EEB41B68C0` (unchanged from RED handoff) |
| `tests/hosting/playwright.config.ts` | `2769755376506E28173BAD64917F0E72F08BEC9A4DA1E525DFAB2E4C6FD0F823` (unchanged) |
| `tests/hosting/run-hosting-acceptance.mjs` | `21934952CD34C3AD26F03DF895676A15DA230BB735697BA98D37CC63BFD439FB` (registry isolation setup correction) |

`node node_modules/eslint/bin/eslint.js tests/hosting` also passes. The final proof remains local integration, with the deployment and QR-decoding limitations stated above.

## Provider environment contract regression: HANGRONG_ORIGIN_SECRET

The provider UI subsequently rejected the operator-entered `VERCEL_ORIGIN_SECRET` key and showed a system-populated value. The corrected public contract uses `HANGRONG_ORIGIN_SECRET` in both the Vercel request-header environment transform and the website Worker. The `x-origin-secret` header and authentication rules remain the same. The earlier 22/22 GREEN above is evidence for the previous revision; it does not by itself certify this renamed contract.

Before production changes, the independent author updated only the harness environment fixtures, existing gateway/config unit-test environment keys, the matrix, and a new `tests/unit/hosting-provider-contract.test.ts`. Existing negative/authorization assertions were retained. H11 extracts the environment inputs actually declared/referenced by the active Vercel route and header transforms, enforces the app-owned input contract instead of depending on `VERCEL_`-prefixed operator settings, evaluates the configured request-header transform, and feeds that request into the actual Worker gateway. It checks that the injected app secret overwrites a forged client header and that body, method, bearer, query, public Origin, and visitor IP survive. It is a configuration-contract evaluator, not execution of Vercel's hosted routing engine.

RED command:

```powershell
node node_modules/vitest/vitest.mjs run tests/unit/hosting-provider-contract.test.ts tests/unit/hosting-gateway.test.ts tests/unit/hosting-config.test.ts
```

Result before production rename: **28 tests executed, 10 failed, 18 passed**, 292 ms. Both new provider cases fail because the actual proxy still requires `VERCEL_ORIGIN_SECRET`: the app-owned-reference assertion receives that previous name, and environment expansion cannot supply it from the corrected operator settings. Eight updated gateway cases fail because the existing Worker does not recognize `HANGRONG_ORIGIN_SECRET` (503 instead of an accepted Request/403/502, or an unintended direct-mode Request when only the new secret is configured). The unchanged config-preparation behavior already passes. No import, syntax, missing dependency, or deployment-account failure caused RED. The parent was notified of these results before production coding. The full integration harness was not started against the old snapshot after the rename of fixtures.

This revision intentionally changes fixture/harness hashes; the historical frozen hashes above remain historical evidence. New SHA-256 values at RED handoff:

| Artifact | Corrected-contract hash |
| --- | --- |
| `tests/hosting/hosting.spec.ts` | `172C2A0AB6B948196C1C7FE31C25DD30669AC6A5A3FA5678466AB5EEB41B68C0` (journey and negative assertions unchanged) |
| `tests/hosting/playwright.config.ts` | `2769755376506E28173BAD64917F0E72F08BEC9A4DA1E525DFAB2E4C6FD0F823` |
| `tests/hosting/run-hosting-acceptance.mjs` | `9D9A5499E015117BDDC60FB27FD85FA5F6388279D8C8E39FA3CD077AC9498526` |
| `tests/unit/hosting-gateway.test.ts` | `AF10675F779D57001C611CA59EBD2EC4B37797252058EBFA66476D04029BF1BD` |
| `tests/unit/hosting-config.test.ts` | `CA21610F983205DF4B9D835E55ECCF4F01521F181D5F8EFC8ECDB581DD9F48F6` |
| `tests/unit/hosting-provider-contract.test.ts` | `7A888763107DC31E0274BA5D3D5992320435B7EB52918C46A0B7C5DA5352049D` |

Targeted ESLint on the harness and these three unit files passes. GREEN for the corrected contract must use the rebuilt snapshot and these updated fixtures; no provider deployment is implied by local test results.

### Corrected-contract GREEN

After the parent confirmed the rebuilt `E:\MLN122\.codex-build\hosting-green-20261028` snapshot was stable, the author reran the exact unit command above: **28/28 PASS** (187 ms). Then the updated integration harness ran with that snapshot: **22/22 PASS, 0 skipped, 0 flaky** (4.2 seconds of Playwright execution).

```powershell
$env:HOSTING_BUILD_ROOT='E:\MLN122\.codex-build\hosting-green-20261028'; node tests/hosting/run-hosting-acceptance.mjs
```

Evidence: `.wrangler/hosting-acceptance/1793180915909-16444/playwright.log`, the neighboring per-server/proxy logs, and `test-results/hosting-acceptance-results.json`. All six corrected-contract hashes in the table above were verified again and match. The full suite retains every prior Origin, secret-spoof, per-client quota, authorization, no-cache, body, WebSocket, QR/share-domain, and direct-mode case. A final loopback probe confirmed ports 5205, 5206, 5207, and 5208 were closed. No deployment account, live DNS/TLS, or hosted Vercel router was exercised.
