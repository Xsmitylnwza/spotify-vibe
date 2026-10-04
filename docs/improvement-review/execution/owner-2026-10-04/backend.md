# Backend completion ledger — owner 2026-10-04

Task `task_ad2835f4b560`, dispatch `ctx_652f6db2d467`.

Implemented manual Pin removal and atomic Scene + pairings Done in the backend. Final focused verification: **71 tests passed, 0 failed, 0 skipped, 0 cancelled**, across 11 test files. No commit, push, release, real owner profile, live Discord, browser or autostart operation was performed.

## Changes and contract

- `scripts/studio-server.mjs`: removed activeOverride, manual selection, setters/cancel, expiry cleanup/retry, override scheduler branches, POST/DELETE `/api/override`, and the POST `/api/presence` pin alias. Those three removed HTTP operations return 404; DELETE `/api/presence` remains pause/clear.
- `scripts/presence-config.mjs`: no manualOverride in normalized config/defaults; malformed legacy manualOverride does not invalidate or reset a supported owner document. Runtime/config projection omits it. The existing raw store overlay preserves legacy manualOverride and its unknown nested fields exactly during successful mutations, including when its former Scene is deleted. No local-config-store changes required.
- `PUT /api/config` accepts `{ scenes, appMappings?, expectedScenes?, expectedAppMappings? }`, with existing optional `slots` compatibility retained. Supplied arrays must be arrays. Full candidate validation checks all Scenes and mapping references together before storage.
- Expectations compare the latest **committed** normalized Scenes/appMappings inside the existing commit queue, using Node `isDeepStrictEqual`; object property order does not matter, array order/value does. A mismatch returns **409**, `code: 'CONFLICT'`, with no storage attempt or RPC reconciliation by that request. Expectations are optional for compatibility.
- Scenes and mappings persist through one atomic replacement. Memory publishes only after save completes, and reconcile/pairing follow successful persistence. Persistence failure returns 500 CONFIG_SAVE_FAILED, retains both committed arrays and disk, and leaves the queue reusable.
- Atomic Done preserves `settings.scheduleEnabled`, including paused state; omitted mappings preserve current committed mappings. Unknown root/settings/Scene/mapping fields retain stable identity; omitted slots retain raw order, values and unknown fields.
- Existing direct `PUT /api/app-mappings` retains its historical `scheduleEnabled: true` behavior. The coordinator was notified; editor draft Done uses `/api/config` to preserve paused state.
- Empty URLs on present buttons now fail validation with a button-specific error; valid URLs still require HTTPS. Optional non-button URLs retain their existing rules.
- Preserved and exercised the preexisting root-authorized runningAppStartedAt map: starts at first successful running detection, survives foreground/app switches and detector errors, clears only on successful closed snapshots, restarts on reopening. Codex session startedAt still takes precedence.
- Discord timestamps remain **milliseconds**. Installed `discord-rpc/src/client.js` setActivity converts Dates with getTime(), without dividing by 1000; this server sends raw SET_ACTIVITY in that same existing unit contract. Actual fake-RPC tests cover elapsed app time, remaining end time and Codex session time. No claim of actual OS process birth time.

## Experiments and verification ledger

| Experiment | Observed result | Implication |
| --- | --- | --- |
| Initial repository state | studio-server.mjs and studio-apps.test.mjs already dirty | Preserved root-authorized timer work; other lanes' later changes left alone |
| Six existing backend files after Pin removal | 45 passed, 0 failed | Inert legacy override/404 replacements preserved existing behavior and timer assertions |
| First button delivery CLI probe with bundled artwork | Blocked by missing public artwork base | Removed artwork from isolated repro to reach button validation; no owner config involved |
| Differential pure button probe | Empty URL accepted and emitted; HTTP URL rejected; HTTPS accepted | Isolated fail path to optional URL helper's empty-value early return, rather than generic URL validation/RPC format |
| New regression before fix, direct activity path | 1 failed: Missing expected exception | Invalid button reached activity construction |
| Same regression before fix, actual HTTP first | 1 failed: 200 !== 400; presence was applied | Confirmed malformed button crossed HTTP save and RPC delivery boundary |
| Eight new atomic HTTP/RPC tests after fix | 8 passed, 0 failed | Combined commit, rollback/conflict, paused state, concurrency, button and timestamp acceptance |
| Final focused 11-file regression | 71 passed, 0 failed, 0 skipped, 0 cancelled | Final backend snapshot verified after pause compatibility and comment/whitespace refinements |
| Owned-file diff whitespace check | Clean | No introduced whitespace error |

New `scripts/tests/studio-atomic-done.test.mjs` exercises:

1. Reassign pairings while deleting their old Scene and changing Scene order; expectations with reversed object key order; one rename; actual final SET_ACTIVITY label/URL pairs and remaining timestamps; owner preservation.
2. Invalid combined Scene/reference payloads and non-array supplied fields: unchanged memory, bytes, storage count and RPC count.
3. Stale expected Scenes or pairings, including nested button differences: typed conflict, zero writes/RPC.
4. Injected real rename failure: unchanged committed data/disk/RPC and successful queue recovery.
5. Combined Done while paused and then legacy Scenes-only save: paused remains false, no activity sent, mappings/raw slots preserved.
6. Overlapping HTTP requests gated inside rename: pending state remains unpublished, next expected arrays checked after first commit; stale second request fails; subsequent expectation-free Scene/session concurrency preserves raw fields.
7. Invalid buttons (empty/missing URL, HTTP/malformed URL, empty label, excess count): rejected by HTTP and activity construction, zero storage/RPC effects.
8. Actual SET_ACTIVITY Codex session elapsed start takes precedence over first-detected app start.

Final command, run from `C:/letmecook-lab/spotify-vibe`:

```powershell
node --test scripts/tests/presence-config.test.mjs scripts/tests/local-config-store.test.mjs scripts/tests/studio-apps.test.mjs scripts/tests/studio-boundary.test.mjs scripts/tests/studio-p2-endpoints.test.mjs scripts/tests/studio-p3-endpoints.test.mjs scripts/tests/studio-atomic-done.test.mjs scripts/tests/studio-server.test.mjs scripts/tests/scene-variables.test.mjs scripts/tests/codex-session.test.mjs scripts/tests/presence-scheduler.test.mjs
```

Elapsed final test duration reported by Node: **10529.5596 ms**. Temporary test output: `%TEMP%/vibe-backend-owner-2026-10-04-tests.log` (not a repository artifact). Fixtures stopped their isolated servers/fake RPC clients and removed temporary profiles through cleanup hooks.

## Ownership and remaining gates

Worker-owned modifications: `scripts/studio-server.mjs`, `scripts/presence-config.mjs`, `scripts/tests/presence-config.test.mjs`, `scripts/tests/studio-apps.test.mjs`, `scripts/tests/studio-boundary.test.mjs`, `scripts/tests/studio-p2-endpoints.test.mjs`, `scripts/tests/studio-p3-endpoints.test.mjs`, new `scripts/tests/studio-atomic-done.test.mjs`, and this report. Did not edit HTML/CSS/package/changelog/AGENTS/Electron/renderer tests.

Backend requested work is complete. Coordinator integration, frontend/desktop review, browser/owner acceptance and any eventual release gates remain outside this worker's proof; these tests establish isolated source/HTTP/storage/fake-RPC behavior only.
