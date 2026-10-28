# Independent arcade acceptance matrix

> Supersession — 2026-10-28: the user explicitly removed the legacy quiz. A11 now checks quiz API removal and retains the unrelated-capability arcade denial. The active product/removal contract is [arcade-only-test-matrix.md](../arcade-only-test-matrix.md); historical arcade test reports remain unchanged.

Source: `docs/arcade/frozen-requirements.md` plus public-contract clarifications from the requirements owner. The author has not read implementation plans, art design, or new production code. Matrix written before executable tests. Tests are owned by the independent author; implementation must satisfy them without weakening assertions.

Commands (bundled Node on PATH):

- **U:** `node node_modules/vitest/vitest.mjs run tests/unit/arcade/independent-acceptance.test.ts`
- **A:** `node node_modules/@playwright/test/cli.js test tests/api/arcade-independent.spec.ts --project=api`
- **E:** `node node_modules/@playwright/test/cli.js test tests/e2e/arcade-independent.spec.ts --project=browser`
- API and browser commands use `ACCEPTANCE_BASE_URL=http://127.0.0.1:5189`. API may alternatively target `ARCADE_SERVICE_URL`.

| Requirement/risk | Level / scenario | Observable acceptance | Command |
|---|---|---|---|
| Solo/group identity, min 3, no six-player ceiling | U01, A02/A03, E02 | 26 distinct identities; duplicate names remain distinct; 0–2 rejected, 3 starts | U/A/E |
| Capability persistence / request retry | A01/A02 | Concurrent same request/capability creates one room/entrant; differing capability cannot hijack request | A |
| Movement independent of FPS, normalized diagonal | U02/U03 | Equal distance for equal simulated time; diagonal magnitude equals straight | U |
| Walls, solid bodies, protected bodies, dash | U04/U05 | No wall tunneling/body overlap; contact preserves order/coins; initial dash/cooldown limits | U |
| Common-order pickup / delivery authority | U06/U07, A07 | Concurrent E yields one owner; no remote pickup/delivery; settled once | U/A |
| Private order privacy | U08, A04 | Other players/public do not receive private order; cannot pick another player's order | U/A |
| Starting money, P fee lock, no contact penalties | U01/U05/U09/U10 | 20 initial; common payout 10; gate fee charged at most once on delivery; prospective fee update; zero balance playable | U |
| Abandon at own shop | U11 | 999ms insufficient, 1000ms clears without payout/purchase | U |
| Promotion/private/shared route economics | U12/U13/U14 | Promotion costs 8 once, 3 orders/20s, 45s cooldown; private costs 40 once, value 8/20s max one waiting; shared route target 12×roster, donate 5/remainder, no overspend/overfund | U |
| Practice reset/stage preservation/exact deadlines | U15/U16/U17 | Reset at 60000; exact phase boundaries; preserve between stages; no scoring at 540000 or later | U |
| Pause/resume | U18, A05, E02 | Timers/effects/motion/order spawning frozen; resume without catch-up burst | U/A/E |
| Ranking | U19 | Remaining coins alone determines rank; ties share rank | U |
| Reconnect/recovery / stale control | A06/A08 | Same player/order/coins/location; recovery retry same replacement succeeds, other replacement and old token fail; stale run/seq ignored | A |
| Input trust, abuse, auth deadline, expiry | A07/A08/A09 | Fake money/position/time ineffective; input stops by 250ms, body released around 3s; origin/auth/oversize bounded | A |
| Host role and room isolation | A04/A05 | Player/public/foreign token cannot host/export; each command checked; host has no player identity | A |
| No new entrant after start; replay retains roster | A03/A05, E02 | New token join rejected; replay changes run and resets progress while identities persist | A/E |
| Room expiry / export | A01/A04/A10 | Expiry ~24h; CSV host-only after results | A |
| UI title, accessible controls, HUD and world | E01/E02 | Vietnamese create/join; real buttons; visible canvas, coins/order/fee/timer/E/dash; pause readable | E |
| Keyboard safety / recovery | E03 | Held E/Space one edge; typing/modal/blur stops input; no URL capability | E |
| Responsive / zoom / muted audio | E01/E02 | Lobby 360px no overflow; 1366×768 at 125%; user-facing audio toggle default muted | E |
| Removed quiz / arcade capability boundary | A11 + N02 in the active arcade-only matrix | Quiz API returns 404; an unrelated capability cannot control arcade. N02 additionally checks all removed quiz operation and top-level host/play routes. | A + `node tests/hosting/run-hosting-acceptance.mjs` |
| Real 26-socket classroom-equivalent traffic | A09 | 26 actual authenticated sockets simultaneously receive activity with one local IP; bounded input accepted | A |
| Real 600s elapsed run / results persistence | A10 | No fake clock/DB mutation: phases/results/CSV and scoreboard at actual 600s | A (test timeout 660s) |
| Render/load metrics | E02 | Attach real browser navigation/render timings and playfield screenshot | E |
| Asset completeness and visual polish | Integration evidence + visual QA | 47 groups/305 visual frames/72 courier frames/5 screens/2 fonts/16 SFX/2 loops; runtime files, alpha, anchor, provenance, no final placeholders | Owner's asset audit and visual QA, not inferable from filenames in this packet |
| 10s announcements, audio quality, human Wi-Fi/playability | Timed run + manual observation | Changes announced 10s ahead; no claim local automation proves classroom Wi-Fi or human enjoyment | A10 / manual evidence |

## Deliberate boundaries

- No endpoint is added or used to mutate time, positions, coins, orders, or D1 for arcade. Unit tests may isolate mutable exposed world state as the packet explicitly allows.
- Higher-level tests use real HTTP and actual RFC6455 sockets, without mocking arcade service responses. UI tests intercept requests only to observe capabilities and input; they forward the original request/response.
- Public packet does not specify the asset manifest schema or announcement snapshot field. Automated asset-schema and announcement-field assertions would invent contracts. These remain explicit evidence obligations for the owner, together with visual alpha/anchor review and classroom playtesting.
- Unit setup clarification: `inputsMap` is `Map<PlayerId, InputFrame>`; map rectangles are pixel `{x,y,w,h}`; player has `home`; map has `walls`, `gate`, `sharedBarrier`, `sharedRouteRect`, `stations`; snapshot has `leaderboard` with `coins,rank`.
