# Frozen requirements — flexible participation, 27/10/2026

Human request: game supports solo players or any number of groups rather than a fixed six-group format. Latest explicit steering: minimum starting threshold is **3**. These replace the old 2–6 requirement only. Do not reinterpret solo as allowing a one-participant start.

## Observable product behavior

- A phone represents one solo player or one group. They can coexist in the same room; name is the display name of that entrant. No host mode configuration or advance participant-count setup is required.
- Start requires at least three entrants. Empty/one/two cannot start; exactly three can. There is no product rule limiting the room to six. Verify at least 26 entrants (the class size) and a further larger cohort where feasible. Physical service limits remain; do not claim infinite hosting capacity.
- Join requires room code and display name only; no selection of fixed positions1–6. Refresh/retry with the same saved capability restores the same entrant and never creates another record. Different people may share a name and remain separate authenticated entrants.
- Host lobby lists actual entrants and count, no six placeholders or `/6` capacity. Start button uses minimum3. Host rename/remove/recovery controls work for entrants after the sixth. Player/host/ranking wording supports solo and groups; no fixed “six perspectives” copy.
- Each entrant gets three rounds of three questions. 10 points/question,90 total,120/45/15 timing, no speed bonus, equal scores share rank; existing pause/recovery/replay/expiry/authority invariants remain.
- There are six curated scenarios per round. Up to six entrants receive distinct scenarios; above six reuse is allowed and distributed evenly (frequency differs at most1), choices remain shuffled independently. Reconnecting keeps assigned scenarios/choices and acknowledged answers; replay makes a new run and retains all entrants. Do not leak answer keys before review.
- Joining new entrants after the run starts stays disallowed; existing entrants can recover/reconnect.
- Shared classroom Wi-Fi must not accidentally enforce a six-group restriction through overly small join rate limits. Preserve meaningful abuse controls and room-size safeguards.
- Existing persisted rooms/participants/capabilities remain usable; no destructive reset of public game data. Update the same public Site.

## Public contracts

- Existing create/host/state/answer/submit/recover/export paths and token authorization remain.
- POST `/api/rooms/:code/join`: `{requestId,name,teamToken}` works without `slot`; return `{code,slot,teamId,playPath}` with server-assigned unique stable numeric identifier. Existing legacy explicit positive-integer `slot` requests can remain supported, with occupied-slot protection; no upper bound6. The UI does not ask for it. Invalid names, tokens and negative/noninteger identifiers remain errors.
- Host commands can continue addressing existing internal `slot` identifiers. New joins never take another entrant's session; removing an entrant revokes its capability. Token hashes/private assignments remain private.

## Verification

Independent author writes requirement matrix and executable unit/API/E2E coverage before production changes, records valid RED on current application, and independently adapts only superseded old six-slot/min2 assertions. Keep reasons in version control. Cover min2 rejection/min3 acceptance, >6 and26 joining/starting/answering, retries/races, role isolation, recovery/removal after6, balanced assignment/replay, and mobile join without slot selection. All unchanged safety/scoring/timing assertions remain. UI target at360px; real D1 integration, no fake API or production time endpoint.
