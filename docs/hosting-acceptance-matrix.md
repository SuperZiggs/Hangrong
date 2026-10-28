# Arcade-only hosting acceptance

Canonical source is `E:\MLN122\.worktrees\cuoc-dua-gianh-khach`. The current product is **Cuộc đua giành khách**. The complete frozen removal/configuration contract is in [arcade-only-test-matrix.md](arcade-only-test-matrix.md); observed RED evidence is in [hosting-red-baseline.md](hosting-red-baseline.md). Earlier mixed-product acceptance results are historical and do not certify the arcade-only product.

Run the real-runtime acceptance suite from the canonical directory:

```powershell
node tests/hosting/run-hosting-acceptance.mjs
```

The runner builds unless `--skip-build` is supplied. `HOSTING_BUILD_ROOT` can point at an independently built copy of the same source when a running preview holds `dist` open. Every run creates isolated state and per-process Wrangler/Miniflare registries under `.wrangler/hosting-acceptance`; no database setup or migration command is executed. The website runs with no D1 binding. A separate test checks that the original generated build configuration also has no D1 binding.

| Coverage | Real boundary / expected outcome |
| --- | --- |
| N01 | Public browser visits `/`, root invitation query, and `/arcade` alias. Arcade title/create/join UI appears, invitation is retained, and quiz branding/link/metadata is absent. |
| N02 | Authenticated public gateway and direct local mode return 404 for removed quiz APIs and top-level host/play pages. |
| N03 / H02 | No-D1 website → realtime SQLite Durable Object handles create, three joins, host start, and role-specific bootstrap; public replies contain no capabilities. |
| H03 / H04 | Missing/wrong/modified secret is rejected; hostile, suffix, subdomain, HTTP and null Origins are rejected; forwarded domain/IP headers cannot authorize a hostile origin. |
| H07 | Arcade rejects malformed/oversized JSON with no-store. Public/player/foreign bearer cannot perform host or export operations. UTF-8 body, query, and HTTP method boundaries remain observable. |
| H08 / N03 | Actual direct realtime WebSocket authenticates the exact public Origin and rejects six nearby/hostile Origins. Closing/reopening retains the authorized player identity. |
| H09 | Arcade host QR renders and copied invitation retains `https://hangrong.vercel.app/arcade?room=...`. |
| H10 | Direct local arcade create/join/bootstrap remains available without gateway settings and without D1; hostile Origin stays forbidden. |
| H11 | The actual Vercel route/transform environment references follow the app-owned contract. Evaluated header injection supplies `HANGRONG_ORIGIN_SECRET` and overwrites a forged client header; the actual gateway accepts the same contract. |
| N04 / N05 | Actual config preparation requires no D1 identity, removes inherited DB bindings, preserves the SQLite DO v1 migration and exact public origin, and rejects the known legacy quiz build identity. |
| N07 | Git comparison against canonical baseline `8637fa5` protects tracked arcade engine/shared rules/art. Existing arcade suites are retained. |
| N08 | Actual Worker entry returns a router 404 while finishing the otherwise unread POST upload; status, response body and no-store remain intact. Only the framework router is stubbed in this focused unit test. |

The gateway uses `x-origin-secret` from `HANGRONG_ORIGIN_SECRET`. It receives each visitor's documented `x-real-ip`; the proxy supplies one synthetic Cloudflare peer address. Test-only visitor/peer selectors are consumed by the proxy, never interpreted by application code. Public origin is one exact HTTPS origin. Arcade WebSockets connect directly to realtime rather than through the HTTP gateway.

Topology: website :5205, test HTTP proxy :5206, realtime :5207, no-gateway website :5208. Browser routing preserves the public HTTPS origin while every document/asset/API response comes from the real local gateway. Redirect responses reach the browser (`maxRedirects: 0`) so a missing invitation query cannot be hidden by the test transport.

Limits: no hosted Vercel router, deployment account, DNS/TLS or cloud deployment is tested. H11 is a config-contract evaluator. QR pixels are not independently decoded. Existing full-duration game coverage is retained; the short hosting suite does not repeat its 600-second match.
