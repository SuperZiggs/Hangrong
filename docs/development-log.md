# SDD ledger — plan: E:/MLN122/docs/superpowers/plans/2026-10-26-web-game-doc-quyen-implementation.md

- 2026-10-26: User approved implementation. Primary implementer writes production code; independent test author receives frozen requirements/current baseline only.
- Task 1 in progress: untouched Sites Vinext starter copied, portable runtime selected, one Site identity persisted; dependency installation running. No game behavior implemented yet.
- Ruling: New application has no existing Git checkout/base branch; E:/MLN122/web-game is the isolated new project. Do not create a worktree from the unrelated classroom document directory. Sites source helper will manage its own repository.
- Pre-flight: content → engine → persistence/API → UI share task IDs/choice IDs/run IDs and public DTOs. Task 1 freezes their observable schema; server answer keys must never enter client imports.
- Pre-flight: pure engine tests use controlled clock; HTTP acceptance uses actual local D1. Timing fixtures remain local, never production HTTP endpoints.
- Ruling: User approval of the plan includes Internet access for anonymous class players. Use public Site access once capabilities are confirmed; host and group commands still require their own capabilities.
