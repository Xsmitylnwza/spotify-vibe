# IMPROVEMENT-SPEC v1 §7 — Executable work packages (archived 2026-10-01)

Superseded by WORKFLOW.md v2. Verbatim copy of the v1 table.

Each item has one owner; shared renderer/server integration goes through the coordinator. This is a future implementation plan, not permission to start feature work now.

| Package | Deliverable and owned seams | Depends on | Acceptance |
| --- | --- | --- | --- |
| W0 Baseline and compatibility | Reconcile scope/docs; freeze v1/v2/legacy/paused/pinned/future and payload fixtures; identify supported pre-lease predecessor/profile handoff | None | Source-backed behavior table; read-only visit; supported payloads fit; legacy admission policy is executable without touching an unknown writer |
| W1 Trust boundaries | Compatible byte-bounded HTTP guard/token, anti-framing headers, client transport, bounded/cancellable GIF provider, Electron navigation/IPC and occupied port | W0 | Maximum supported Thai/escaped config/mapping bodies save through the reader; foreign Origin/Host/frame and malformed/oversized input cause zero effects; GIF starts/waiters obey bounds through abort/overflow/timeout |
| W2 Durable commands | Legacy admission, shared per-file leases, config/secrets queue, persistent revision, fail-closed recovery and safe replacement | W0 | No new profile writes before verified legacy handoff; updated processes/ports/helpers have one owner; failures preserve bytes; one stale-revision winner |
| W3 Presence controller | Selection/pause/clear/pin/reconnect/scanner, Pause/Hide effect barriers and immutable held payload, derived validation, supervised pumps and RPC generations | W2 | Actual mock effects plus snapshots match section 5 through submitted RPC, timeout/reconnect/cold restart/held-Scene edit or delete; no resurrection after clear/quit |
| W4 Studio integrity | Draft generations, controlled-exit preparation, dependency-aware delete, read-only initialize, visible recovery and shared dialogs | W1 + W2 API contracts | Newest drafts survive slow saves and exit preparation; invalid/409/unreachable cancels Quit/install absent explicit discard; delete/focus flows work |
| W5 UX/UI refinement | Status hierarchy, Scene/pairing journey, settings grouping, localization/motion/token cleanup | W3 + W4 | All section 4 surfaces/states represented and accessible; owner sees desktop/narrow/theme/language evidence |
| W6 Desktop delivery | Legacy handoff, profile-bound startup/relaunch, prepared Quit/update, package/lock/CI and external helper layout | W1 + W3; prepared-exit W4 contract before Quit/update acceptance | Real helpers/icon; verified legacy exit and prepared drafts; install/login/update/backout resume the admitted profile and preserve bytes/opt-out |
| W7 Integration and release review | Cross-package tests, screenshot/interaction pack, docs, migration/backout receipts | W5 + W6 | All mandatory gates pass; explicit owner visual acceptance and release authorization |
