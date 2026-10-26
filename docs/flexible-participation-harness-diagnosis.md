# Independent diagnosis: 40-entrant acceptance timeout

The author investigated runner overhead without changing production code, cohort sizes, HTTP contracts, assertions' predicates, or the existing 150000 ms test timeout. The same stable preview at `127.0.0.1:5187` was used; the implementer stopped competing load during diagnostics.

| Controlled run | Result | Test duration |
|---|---|---|
| Original helpers, trace retained on failure | Timed out during the final submit batch | 152446 ms including timeout cleanup |
| Original helpers, only CLI `--trace=off` | Passed, but with almost no timing margin | 149857 ms |
| Batched equivalent helper predicates, CLI `--trace=on` | Passed with tracing fully enabled | 38592 ms (runner 41002.991 ms) |

Original evidence: `test-results/flexible-queue-api.json` and its 40-entrant `trace.zip`. The trace contained a 15.8 MB `test.trace`, including 26523 `toEqual` steps and 4920 `not.toContain` steps. Completed HTTP operations showed 40 successful joins, 80 successful submits and 323 successful state responses; no application error response explained the timeout. The timeout then disposed outstanding requests, which is a cleanup consequence rather than evidence of an independent server error.

Disabling trace alone was insufficient. The controlled improvement with trace explicitly enabled establishes that per-matcher runner instrumentation/reporting, rather than trace retention alone, dominated this acceptance test. Forty entrants caused every snapshot helper to emit 80 separate entry-shape matcher steps, repeated hundreds of times, in addition to one matcher step per candidate capability.

The passing batched trace contains 4958 matcher steps and a 3.22 MB `test.trace`; the checked fields, entries and capabilities are unchanged.

## Minimal helper correction and logical equivalence

Only `tests/support/api.ts` changed:

- Previously each team entry independently satisfied `expect(team).toEqual(expect.objectContaining(teamShape))`. Now one array matcher compares every original team index against the identical `objectContaining(teamShape)`. The same change applies to every leaderboard entry and the identical leaderboard shape. Entry count, order, every required field/type and acceptance of unrelated metadata are preserved. HTTP snapshots are JSON arrays, so there are no sparse-array differences.
- Previously each supplied capability independently required `!json.includes(capability)` through `not.toContain`. Now every original capability is tested with `json.includes`; one assertion requires the complete list of matches to equal `[]`. This is the same universal prohibition, including duplicate or empty capability strings. The separate forbidden-secret-key regex remains unchanged.

No HTTP request, participant, round, role check, balance check, scoring bound, persistence check, retry rule or timing assertion was removed. Tracing remains available; no tracing configuration change or timeout increase was necessary. Original loop predicates remain in Git history and the before-fix trace/report above.

Passing comparison evidence is copied to `docs/flexible40-no-trace-results.json` and `docs/flexible40-batched-results.json`. The batched run checks all three rounds, all 40 entrants' acknowledged choices/submissions, balanced scenario reuse, replay, stable reconnect and stale-run rejection. Targeted ESLint passed. The implementer must run the full API gate after this isolated diagnostic; a focused pass is not substituted for the complete gate.
