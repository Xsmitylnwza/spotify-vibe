# P3-S — App icon hosting and text variables (server lane)

Implemented on `improve/flow-ux`, 2026-10-04. No commits, installs, publishing, owner-profile access, real uploads, real Discord RPC, or browser automation performed.

## Changed files

- `scripts/app-icon-hosting.mjs` (new): production port of the tested mockup hosting path, anonymous Catbox multipart adapter, PNG validation, stable executable identity, SHA-256 cache, serialized atomic persistence, consent, pending uploads, failure memoization, cancellation, and catalog decoration.
- `scripts/scene-variables.mjs` (new): pure `resolveSceneText(scene, {app, user})` and `sceneTextVariables` exports.
- `scripts/presence-config.mjs`: re-exports resolver, validates delivery text after resolution, stores unresolved templates, projects image-source flags, explicitly clears omitted source flags on save.
- `scripts/application-badges.mjs`: automatic image references opt in with `@app` or `largeImageSource` / `smallImageSource: 'app-icon'`; explicit images and activity-name templates stay intact.
- `scripts/studio-server.mjs`: hosting routes, decorated running/installed catalogs, mapped-app-only pairing triggers, delivery context, runtime variables, upload completion reconciliation, and shutdown cancellation.
- `scripts/tests/app-icon-hosting.test.mjs`, `scripts/tests/scene-variables.test.mjs`, `scripts/tests/studio-p3-endpoints.test.mjs` (new): behavioral module, real temporary-file persistence, and HTTP tests with fake uploader/catalog/RPC.
- `scripts/tests/running-presence.test.mjs`, `scripts/tests/studio-p2-endpoints.test.mjs`: updated existing assertions for opt-in badges and added catalog metadata.
- This report.

HTML/CSS and `electron/*` were read only where needed for contracts; concurrent changes in those lanes were preserved. `scripts/app-presence.mjs` did not require edits.

## Verified behavior

- Hosting stores `icon-hosting.json` beside the actual `presence-config.json`, including when `PRESENCE_CONFIG_PATH` overrides `dataDirectory`.
- `GET /api/icon-hosting` and `PUT /api/icon-hosting {consent:boolean}` return exactly `{consent:true|false|null, provider:'catbox'}`. PUT checks Host, URL authority, and Origin using the reconnect-route local-origin pattern before reading body or changing state.
- Catalogs keep their existing fields and gain `publicIcon`, `iconSource: pack|upload|default`, and `iconStatus: ready|uploading|needs-consent|failed`. Public pack URLs win, including with no consent; missing consent and false consent never start uploads.
- Only apps referenced by `appMappings` enter pairing. Startup, mapping saves, config saves, granting consent, and detector catalog changes trigger this path. Consent alone with an entirely unpaired catalog makes zero uploader calls.
- One pending upload per executable identity; failed hashes are memoized for the server lifetime; changed PNG bytes can retry. Successful URLs and hashes reload from disk. A catalog row without current extracted bytes may reuse its valid cached URL; changed/invalid nonempty bytes do not inherit an old hash cache.
- PNG data URLs are decoded and checked for canonical base64, PNG signature/IHDR, size ≤256 KiB and dimensions ≤256 px. The provider receives only PNG bytes in a multipart `icon.png` file, without executable paths/names or credentials. Hosted results must use public DNS HTTPS, without credentials, local/IP targets, or a nonstandard port.
- Existing `atomicWriteJson` provides a unique temporary file, fsync, rename, and cleanup. State commits after durable writes; failed consent writes preserve previous in-memory/disk settings. Revocation aborts in-flight provider work and prevents late URLs becoming usable; shutdown cancels provider signals.
- Automatic small images use the selected app's public pack/upload URL. No public URL means no small image. Automatic large images also resolve to the selected icon or the existing bundled default artwork. Explicit images remain unchanged.
- Upload completion re-applies presence only when that app is currently selecting a Scene which uses an automatic image. No polling loop, timer, child helper, dependency, or extra installed-app scan was added.
- `resolveSceneText` substitutes `{app}`, `{scene}`, `{user}` once in activityName, details, state, both image hover fields and button labels; unknown tokens and URLs remain literal, substitutions are trimmed, and empty activityName/details/state fall back to Scene name. The connected Discord name uses `globalName || global_name || username`; unknown identity supplies empty user.
- Delivery resolves after app/Codex-session templating and before existing Discord length validation. Required resolved-text or button overflow prevents a fake `SET_ACTIVITY` call and exposes the validation error while retaining the saved template.
- Manual pins supply the Scene name for app and omit automatic small images. The runtime snapshot adds `variables:{app,scene,user}` for the current selection, null when no Scene is selected; `/api/state` returns that snapshot directly and mutation responses embed it under `runtime`.
- HTTP regression confirms switching automatic images to explicit artwork clears source flags in the stored document. This prevents the raw-document overlay from resurrecting an old `app-icon` flag when renderer serialization omits it.

## Verification evidence

Final focused command:

```powershell
node --test scripts/tests/app-icon-hosting.test.mjs scripts/tests/scene-variables.test.mjs scripts/tests/studio-p3-endpoints.test.mjs scripts/tests/running-presence.test.mjs scripts/tests/presence-config.test.mjs scripts/tests/studio-p2-endpoints.test.mjs
```

Observed: **33 tests, 33 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo**, exit 0.

Final whole-suite command: `npm test` (`node --test`). Observed: **314 tests, 314 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo**, exit 0, duration 12,269.7898 ms. Earlier whole-suite run was 313/313 before adding the source-clearing regression; the final 314 count includes concurrent desktop/renderer lane tests present at invocation. The final transcript is temporarily available at `%TEMP%/vibe-p3-s-npm-test.log`.

`git diff --check` on changed tracked server files/tests: exit 0; only Git CRLF conversion notices. All test fixtures used temporary directories and fake host adapters, and all servers started by those fixtures stopped in teardown.

## Remaining gates / limits

- **Unverified:** live Catbox acceptance/availability, public pack URL availability, real Discord rendering, renderer/browser parity, owner visual acceptance, packaged installation. This report proves server/module/HTTP behavior only.
- **Inferred from source:** if an installed-app scan completes after startup without a cached PNG or a running-app catalog event, another mapping/config/consent save can pair the newly available icon; no new scan-completion listener was added outside this lane's ownership.
- Renderer handoff sent to coordinator through Orca status messages: `published()` was still silently replacing activityName, unknown user used a placeholder, trim/empty-required fallback was missing, and manual-pin icon preview used a paired icon. Sonnet/coordinator own parity fixes; this lane did not edit renderer files or claim visual acceptance.
- Configured templates can be longer than Discord limits before expansion; delivery enforces existing limits on the expanded result. Failed provider hashes stay suppressed until bytes change or server restarts; no retry UI or retry endpoint was added.

No server-lane blocker remains. Independent coordinator review and the separate runtime/visual gates remain required.
