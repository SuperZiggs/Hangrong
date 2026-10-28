# Arcade-only independent acceptance baseline

Canonical workspace: `E:\MLN122\.worktrees\cuoc-dua-gianh-khach`; branch `work/cuoc-dua-gianh-khach`; baseline commit `8637fa5`. The independent author received requirements and existing code only, without proposed implementation details. The matrix was written first in `docs/arcade-only-test-matrix.md`.

The user explicitly removed the quiz product and selected this canonical arcade worktree. This supersedes the earlier mixed-product success/quota assertions. Previous results can be recovered from Git history; they are not current operating instructions.

## Valid RED before production edits

`npm run build` succeeded against fresh canonical `8637fa5`; the older pre-hosting-fix `dist` was not used. No existing preview on ports 5189/5191 was stopped.

```powershell
node node_modules/vitest/vitest.mjs run tests/unit/hosting-config.test.ts tests/unit/hosting-gateway.test.ts tests/unit/hosting-provider-contract.test.ts tests/unit/arcade/preservation.test.ts
```

Result: **31 tests, 5 failed / 26 passed**, 267 ms. Three config-preparation scenarios fail because the current implementation still requires `CLOUDFLARE_D1_DATABASE_ID`. Two scenarios fail because a known legacy build with `name` or `topLevelName` equal to `quyen-luc-so` is accepted and silently renamed rather than rejected. The legacy cases include formerly valid database settings, so their failure is not masked by a missing-setting error. Existing gateway/provider boundaries and the arcade core/art preservation test pass.

```powershell
node tests/hosting/run-hosting-acceptance.mjs --skip-build
```

Result: **24 tests, 6 failed / 18 passed**, 32.8 seconds. Evidence is `.wrangler/hosting-acceptance/1793182833964-3716/playwright.log`, the adjacent website/direct/realtime/proxy logs, and `test-results/hosting-acceptance-results.json` (the latter is overwritten by later runs).

| Missing behavior | Concrete RED observation |
| --- | --- |
| Generated build still depends on D1 | Original Wrangler configuration contains a `DB` D1 binding; N03 expects none. |
| Root selects the wrong game | `/` and `/?room=ABCDEFGH` render the quiz title instead of Cuộc đua giành khách. |
| Arcade still links to the removed product | `/arcade?room=ABCDEFGH` visibly contains `Về Quyền lực số`. |
| Quiz routes remain mounted | `GET /api/rooms` returns 405 rather than 404 in both authenticated gateway and direct mode. Once this first route passes, the same tests also check POST, all quiz operation routes, and top-level host/play pages. |

The runtime fixture removes D1 from a copy of the generated configuration and uses absolute entry/assets paths. It executes no migration and provides no DB environment or binding. Eighteen real-runtime arcade/security/reconnect/QR/direct-mode cases already pass with that fixture, demonstrating that the failures above are missing removal/configuration behavior rather than an unavailable runtime, account, import, schema, or dependency. The original generated config is separately checked, so the fixture cannot hide a production DB binding.

The complete RED results were sent to the parent before production coding began. After RED, one transport correction added `maxRedirects: 0` to the browser proxy fetch so real redirect/query behavior reaches the browser. The baseline root responses were 200, so this does not change the observed reasons for RED. No acceptance assertion was relaxed. One unused type import was removed from the mixed A11 file; A01–A10 assertions remain unchanged.

## Authorized test audit

Deleted 22 files that test only the removed quiz feature:

- API: `tests/api/acceptance.spec.ts`, `automatic-identifiers.spec.ts`, `flexible-legacy.spec.ts`, `flexible-participation.spec.ts`, `full-duration.spec.ts`, `recovery-retry.spec.ts`, `runtime-restart.spec.ts`, `timing-scoring.spec.ts`.
- Browser: `tests/e2e/acceptance.spec.ts`, `flexible-participation.spec.ts`, `recovery-response-loss.spec.ts`, `submit-while-saving.spec.ts`.
- Unit: `tests/unit/automatic-identifiers.test.ts`, `content.test.ts`, `engine.test.ts`, `flexible-participation.test.ts`, `independent-boundaries.test.ts`, `polling.test.ts`, `room-read-concurrency.test.ts`.
- Support: `tests/support/api.ts`, `flexible.ts`, `local-d1.ts`.

The mixed `tests/api/arcade-independent.spec.ts` A11 now expects quiz removal and retains rejection of an unrelated capability controlling arcade. A01–A10 and all other existing arcade suites remain. Mixed hosting quiz-success and quiz-IP-quota cases were removed because their feature is explicitly removed; every arcade assertion remains. Provider tests now use the arcade API path without changing their environment/header/authentication assertions. Gateway unit tests are unchanged.

`git diff --exit-code 8637fa5 -- game/arcade shared/arcade public/arcade/assets assets/arcade` passed with no changes. `node node_modules/eslint/bin/eslint.js tests` reports zero errors and one existing unused `ArcadeRoom` type warning in `tests/e2e/arcade-match.spec.ts`.

SHA-256 handoff integrity:

| Artifact | Hash |
| --- | --- |
| `tests/hosting/hosting.spec.ts` | `FE61DF371F80DCB4F82DE49BBB85B6037FCCC0C02287F1954A4E8DED8C6C88E4` |
| `tests/hosting/run-hosting-acceptance.mjs` | `4C3F20814B8F89B265D6B32E7CB049ED6A2B9EBF134476A7A18ACC6EC7D14812` |
| `tests/unit/hosting-config.test.ts` | `9CEA0B3A000314A4A0D8C9C043737391797AB5E698AFF8B8A8427FB3D52F5831` |
| `tests/unit/hosting-provider-contract.test.ts` | `195BBAA98B786D1155C409ED22443B3C0CA07858DB181F712FAF04B2636D9892` |
| `tests/unit/arcade/preservation.test.ts` | `88C442E0744C9C00769895BEFC3FA0F47701715ACB0BF7874DBBC626908D58C5` |
| `tests/api/arcade-independent.spec.ts` | `01FAEFF788381F29EEED6B2CFEF6D2B4C5DB891ACEB309EA9F2227199B1C4056` |

GREEN must be recorded after production edits and a fresh canonical build, using the full unit suite and `node tests/hosting/run-hosting-acceptance.mjs --skip-build`. This document does not claim the arcade-only product is GREEN yet. Local acceptance does not verify a live deployment, hosted Vercel routing, DNS/TLS, or independently decoded QR pixels.

## Router-error upload regression discovered during GREEN

The parent's initial GREEN attempt reported 20/24 passes. The deleted API's POST correctly returned 404, but the following GET stalled in local workerd. The independent author added N08 before the entry-point fix, keeping N01/N02 assertions and runtime budgets unchanged.

```powershell
node node_modules/vitest/vitest.mjs run tests/unit/hosting-worker-entry.test.ts
```

Valid RED: **1 test failed**, 203 ms. The test invokes the actual `worker/index.ts` entry, actual gateway preparation, and actual connector context. Only the framework router is replaced with an intentionally body-unread 404 response. The response status, text and no-store header all pass; `request.bodyUsed` remains false instead of true. This directly demonstrates missing error-path body handling rather than source-text matching, a missing dependency, or an import failure. Existing bounded-discard helper tests separately protect byte/time limits; N08 protects its observable behavior through the entry boundary. The parent received this RED result before changing the entry point.

No production file or frozen hosting assertion was edited by the independent author for this regression. The next full integration run must still prove that the real deleted-route POST/GET sequence completes.

N08 SHA-256: `tests/unit/hosting-worker-entry.test.ts` = `C3C7CF4926C210F70950436054F89092F8AC458291E18162AFF4A3051A28270B`. Targeted ESLint passes. This is new coverage for the error-path regression; the six prior handoff hashes remain unchanged.

After the parent changed the Worker entry, the independent author reran N08: **1/1 PASS**, 176 ms. Its SHA-256 still matches RED, as does the frozen hosting suite hash. The complete real-runtime suite remains the required proof for the POST/GET transport sequence.
