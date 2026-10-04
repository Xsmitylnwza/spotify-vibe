# Image picker backend — 2026-10-05

Task: `task_bd3d618af069`, dispatch: `ctx_5370c4033e69`.

## Changes

- `scripts/application-badges.mjs`: `hasCustomMainImage` recognizes only explicit `largeImageSource="custom"` with valid nonempty non-`@app` artwork. `withApplicationBadge` preserves custom main artwork/click URL; automatic main uses selected public app icon or `STUDIO_ICON_URL`. All image/source clearing remains on the delivery clone. Small image behavior is unchanged.
- `scripts/presence-config.mjs`: custom validation rejects empty, automatic reference, invalid HTTPS and unknown builtin artwork. Source survives validation/storage overlay/reload. Pure activity delivery ignores legacy unmarked artwork and retains custom URL/GIF/avatar/builtin/registered asset choices. The server passes its already resolved automatic main via `automaticMainImage`; pure calls without mapping fall back to Studio branding. No schema migration.
- `scripts/studio-server.mjs`: automatic icon pairing requires enabled saved mapping + enabled Scene + automatic main or automatic small. Custom main with explicit small never auto-exports; explicit trusted-catalog upload remains available. Runtime `applicationImage` resolves builtin custom artwork to its actual public delivery URL and retains selected executable identity. Upload completion never writes Scene config or changes session timestamps.
- Tests: `scripts/tests/presence-config.test.mjs`, `scripts/tests/character-art.test.mjs`, `scripts/tests/studio-p3-endpoints.test.mjs`. Existing direct custom-art examples now explicitly opt into `custom`; historical unmarked-art tests continue proving automatic behavior.

## Verified evidence

Final focused command:

```text
node --test scripts/tests/presence-config.test.mjs scripts/tests/character-art.test.mjs scripts/tests/scene-variables.test.mjs scripts/tests/studio-p3-endpoints.test.mjs scripts/tests/studio-atomic-done.test.mjs scripts/tests/app-icon-hosting.test.mjs scripts/tests/running-presence.test.mjs scripts/tests/codex-session.test.mjs
```

Observed: **59 tests, 59 pass, 0 fail, 0 cancelled, 0 skipped**. Full output: `%TEMP%/vibe-image-picker-focused.log`.

Fixture proofs include actual server HTTP + fake RPC `SET_ACTIVITY` auto→custom→auto, custom GIF/avatar/builtin resolution, custom click URL retained/automatic URL cleared, config byte preservation before commit, root/Scene unknown fields retained, actual server restart retaining custom source/art, failed filesystem save rolling back disk/API/RPC, explicit upload retaining all custom activity fields, automatic small completion preserving custom main/timer, shared-Scene app switching retaining running-app session start, enabled-only saved mapping upload gating, and unpaired draft explicit upload without config/presence mutation. Existing atomic Done suite separately verifies Codex session timestamp override. No real Discord/owner profile/Chrome/autostart/external network used.

`git diff --check` for owned files: exit 0, no whitespace errors.

Full suite run once after source stabilization: `npm test`. Observed: **399 tests, 391 pass, 8 fail, 0 cancelled, 0 skipped**. Full output: `%TEMP%/vibe-image-picker-full.log`.

All 8 failures belong to archived mockup tests outside this task's ownership:

- `docs/improvement-review/execution/p2/mockup/live-controller.test.mjs`: app icon without public URL; exact payload public app icon, local app icon, builtin, link (5 failures). Archived controller metadata still reports its historical Hinata preview while pure delivery now follows explicit custom/automatic semantics.
- `docs/improvement-review/execution/p2/mockup/real-app-server.test.mjs`: pairing success/failure payload and pack URL payload (3 failures). Archived controller does not pass its selected automatic image into the pure activity API.

Coordinator explicitly extended ownership to the two failing archived `*.test.mjs` files listed above, preserving archived implementation and test discovery. Updated only those two fixture files: explicit builtin/link artwork opts into `custom`; automatic calls without selected `automaticMainImage` assert Studio fallback while independently preserving exact historical preview metadata and small-image wire values. No discovery suppression, skipped tests, archived implementation edits or weakened payload assertions.

Archived focused command:

```text
node --test docs/improvement-review/execution/p2/mockup/live-controller.test.mjs docs/improvement-review/execution/p2/mockup/real-app-server.test.mjs
```

Observed: **22 tests, 22 pass, 0 fail, 0 cancelled, 0 skipped**. Output: `%TEMP%/vibe-image-picker-archived.log`.

Final `npm test` after authorized fixture updates: **400 tests, 400 pass, 0 fail, 0 cancelled, 0 skipped**; exit 0. Output: `%TEMP%/vibe-image-picker-full-final.log`. The full-suite discovered count increased from 399 to 400 during parallel renderer work; no discovery configuration was changed by this worker.

Compact ledger: initial focused two iterations each 43/44 (new fixture incorrectly assumed PNG jobs coalesced across app identities, then supplied `foreground` instead of the actual `foregroundExecutable` event field); corrected final focused 59/59; initial full 391/399 (8 archived contract expectations); authorized archived focused 22/22; final full 400/400. Production source stayed unchanged between the two full-suite runs.

## Limits

This is fixture/source evidence, not owner visual acceptance or live Discord rendering. Renderer changes belong to the parallel renderer lane. No commit, push, install or release was performed. Pre-existing/concurrent renderer, package, changelog and AGENTS edits were preserved untouched.
