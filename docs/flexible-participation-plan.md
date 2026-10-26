# Flexible participation implementation plan

User directly authorized the bounded behavior change; latest minimum is3. Spec: `docs/flexible-participation-requirements.md`.

Approaches considered: separate solo/team room modes, or a unified entrant model. Use one entrant model because a saved device capability already represents one answer sheet; a display name can identify either an individual or a group, with no extra room setting. Keep existing internal team/slot fields for persisted-room compatibility, while removing fixed-slot UI and product count cap.

- [x] Independent tests first: freeze requirements, run baseline locally; author updates obsolete expectations only. No production edits until a valid RED.
- [x] Engine/API: auto-assign stable participant identifiers, token-first rejoin, minimum3, balanced reusable scenario distribution; support larger same-room writes and shared-Wi-Fi joins while preserving CAS/auth/resource guards. Add targeted tests for observed capacity issues; no new dependencies.
- [x] UI: code + name form; actual entrant cards/count; min3 start; neutral solo/group labels, dynamic host progress and ranking. Keep current accessible design and session recovery.
- [x] Verify old+new unit/API/browser tests, typecheck/build, inspect mobile/host with >6; docs/runbook update. Fresh read-only review of changed behavior, fix substantive findings with regression tests.
- [ ] Sites: reuse public identity, source helper commit/package, save/deploy, anonymous production smoke with3 and >6 entrants. Record exact tested scale, do not advertise infinite infrastructure. Keep ND/slides untouched.

Watch: simultaneous auto-join IDs, lost join response retry, large state reaching512KiB guard,26 autosaves contending on CAS, recovery after index6, old rooms, duplicate names, cached old clients, and fixed-six wording hidden in HTML/metadata/runbook. Same540/600s timing engine behavior is out of scope; no need to rerun long tests unless timing/scoring changes.

