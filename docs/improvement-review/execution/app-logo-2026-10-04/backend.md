# Backend app-logo delivery — 2026-10-04

Implemented owner contract in `scripts/application-badges.mjs`, `scripts/presence-config.mjs`, `scripts/studio-server.mjs`; updated backend tests in `app-icon-hosting.test.mjs`, `running-presence.test.mjs`, `scene-variables.test.mjs`, and `studio-p3-endpoints.test.mjs`; coordinator additionally authorized the two legacy expectation rows in `docs/improvement-review/execution/p2/mockup/live-controller.test.mjs`.

## Behavior

- Every mapped Scene delivers the selected app public logo as its main image, overriding stored custom/character/avatar art and its click URL only in a runtime clone. Explicit usable `publicIcon` wins; a supplied empty/invalid result uses Studio brand; pack lookup happens only when `publicIcon` is absent.
- Exported `STUDIO_ICON_URL` pins the owner-provided ghost PNG to commit `6f686f78f80ba7a3a54ce55bd985cf2bfc7fb09d`. No public URL fetch was needed in this run; reachability is coordinator-supplied evidence, not independently verified here.
- Empty, `@app`, and `app-icon` small-image references use logo then brand; explicit small images and click URLs stay intact. Mapping-free automatic sources and pure unresolved `@app` references use brand. Resolved source flags are cleared on runtime clones so the pure delivery API cannot replace a resolved app logo again.
- Automatic upload pairing now includes every enabled saved mapping with an enabled Scene, including custom-art Scenes. Existing consent, PNG/catalog validation, draft/unpaired restrictions, memoized failure and upload shutdown semantics remain.
- Upload completion reconciles the currently selected executable even when original Scene art was explicit. No polling, dependencies, config migration or background config save was added.
- Local runtime snapshots expose `applicationImage` (desired main image or null), `applicationIconFallback` (Studio brand), and `selectedApplicationExecutable` (exact desired mapping executable or null). No upload payload or Discord executable field was added.

## Evidence ledger

1. **Verified pre-change reproduction:** calling `withApplicationBadge` with stored Discord default avatar and `orca.exe` retained the avatar in `largeImage` while `smallImage` used the Orca pack. Unknown executable with explicit empty hosting result and both `@app` references yielded `builtin:hinata-idle` main and empty small image.
2. **Verified source trace:** old main override required an automatic source; upload pairing and completion were conditional on automatic artwork; pure unresolved `@app` used Hinata/empty. Differential explicit-small tests demonstrate the main-image override is independent of small-image behavior.
3. **Verified first updated-source run against old expectations:** 28 tests, 21 passed, 7 failed, establishing the old custom-main/empty-small/skip-custom-upload assumptions conflict with the new contract.
4. **Verified focused final run:** `node --test scripts/tests/running-presence.test.mjs scripts/tests/scene-variables.test.mjs scripts/tests/app-icon-hosting.test.mjs scripts/tests/studio-p3-endpoints.test.mjs scripts/tests/studio-atomic-done.test.mjs` — **43 tests, 43 passed, 0 failed, 0 skipped**.
5. **Verified full run:** `npm test` — **390 tests, 388 passed, 2 failed, 0 skipped**. The two failures are `docs/improvement-review/execution/p2/mockup/live-controller.test.mjs:104`: “pre-resolved app icon” and “failed cached icon overrides stale renderer URL.” Both still expect Hinata while a pure unresolved `app-icon` source now delivers Studio brand. Initially outside assigned ownership; coordinator subsequently authorized only the two stale expected values and needed import in this fixture. Actual payload assertions now expect Studio brand; historical preview metadata separately retains its original Hinata expectation because modifying mockup implementation was explicitly excluded.
6. **Verified authorized legacy fixture:** `node --test docs/improvement-review/execution/p2/mockup/live-controller.test.mjs` — **16 tests, 16 passed, 0 failed, 0 skipped**. The first expectation-only attempt still failed 2 metadata assertions; keeping the historical preview expectation separate from current delivery corrected those without editing mockup source.
7. **Verified final full run:** `npm test` — **390 tests, 390 passed, 0 failed, 0 skipped** (13135 ms reported duration).
8. **Verified:** `git diff --check` on the eight owned/authorized source and test files succeeded.

Focused HTTP tests capture the server's actual `request('SET_ACTIVITY', args)` boundary using injected RPC, watcher, uploader and isolated temporary profiles, without real Discord. They verify stored-avatar main becomes Orca pack; same-Scene Orca→Discord changes main; explicit small art stays; custom-art saved mappings upload; upload completion replaces fallback without timer reset; config bytes (including unknown fields/custom art) remain identical; denied/no-icon/failed upload use brand; disabled mapping/Scene do not upload. Existing atomic-Done tests verify text/buttons/timer behavior and Codex session timestamp selection.

## Limits and ownership

No real owner profile, Discord client, Chrome, autostart, installer or external network was used. Fixtures stop their servers and remove temporary profiles. No commit/push/release. Concurrent renderer/AGENTS/changelog/test edits belong to other writers and were not modified here. Backend implementation and test verification are complete; independent owner/coordinator review remains. Historical mockup preview metadata diverges from current pure delivery for the two app-source cases, explicitly covered by separate assertions and left unchanged under the coordinator restriction.
