# Realtime feasibility — actual local evidence

27/10/2026. Workers + one Durable Object per room, native WebSockets.

- Independent baseline:19 unit +11 API +3 browser RED before production.
- Motion subset U01–U05:5 PASS; TypeScript PASS.
- Room/auth/recovery/input/26-socket subset A01–A09:9 PASS after fixing bounded request-body forwarding between Worker and actor.
- Actual26-socket load120s: p95 application RTT 12.54ms; p95 actor tick processing 1ms; message errors 0. All clients received snapshots and moved.
- Received bytes across clients: 1065430080. Initial full-state protocol is too verbose for classroom Wi-Fi; reduce repeated map/state payload before final load acceptance.
- These are local socket metrics, not26 rendered laptops or classroom Wi-Fi evidence. Rendering and correction measurements belong to later tasks.
- Wrangler whoami: not authenticated. Local runtime is available; hosted WSS/account permissions remain unverified. No provider resource created or deployed.

Commands: `node node_modules/vitest/vitest.mjs run tests/unit/arcade/independent-acceptance.test.ts -t U0[1-5]`; Playwright API independent suite grep A01–A09; `node scripts/arcade-load.mjs --url ws://127.0.0.1:5191 --clients26 --seconds120`. CLI options use separate `--clients 26 --seconds 120` arguments.
