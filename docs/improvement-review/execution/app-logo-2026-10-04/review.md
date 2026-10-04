# Integration review — selected app logos, 2026-10-04

Goal: deliver and preview the selected paired app logo as the main Discord image, with the immutable Vibe Studio ghost fallback, while retaining saved artwork and draft/consent boundaries.

Simpler-path assessment: the existing delivery overlay (`withApplicationBadge`) is the smallest appropriate implementation. No config migration, new dependency, timer, polling loop or additional network service is needed. Runtime fields describe desired delivery, not proof of Discord image-proxy rendering.

## Resolved during review: Minor — historical P2 fixture expectations (reproduced, corrected)

`package.json:84` (`test: node --test`; locate by key if version edits move the line), `docs/improvement-review/execution/p2/mockup/live-controller.test.mjs:100`, `:101`, `:107`; resolver seam `docs/improvement-review/execution/p2/mockup/live-controller.mjs:29`, `:64` and `scripts/presence-config.mjs:331`.

Initial `npm test` discovered 390 tests: 388 pass, 2 fail. Final rerun after the authorized fixture correction: **390/390 pass**, no skips/cancellations. Both failures expect historical Hinata fallback for `largeImageSource: app-icon`. The archived controller resolves Hinata but retains the automatic source marker; the current pure delivery resolver substitutes the Studio ghost, producing the new correct wire image while the archived publishedImage assertion still expects Hinata. Initial consequence: the default validation command was red; this did not reproduce a production app-logo defect.

Coordinator authorized the backend writer to update only the legacy test import/expected wire values and explicitly preserve its separate historical preview metadata expectation. This bounded correction is verified green; historical implementation remains intact, and default test discovery remains unchanged. Archived metadata/wire divergence is documented as a historical limitation, not current production behavior. Reviewer made no source or test changes.

## Verified path and boundaries

- `scripts/studio-server.mjs:237` selects the running saved mapping and its hosting view; `scripts/application-badges.mjs:20` overlays a copy; `scripts/studio-server.mjs:369` builds activity and `:375` sends raw SET_ACTIVITY. Saved custom main artwork is replaced in delivery; its saved source, click URL, unknown Scene/root/mapping data remain byte-for-byte intact in the independent probe. Explicit small artwork wins; automatic small uses app then ghost.
- `scripts/studio-server.mjs:155` pairs only enabled mappings whose saved Scene is enabled. Unknown/denied consent produces zero uploads, wrong-provider consent rejects, and allowed consent uploads two enabled saved mappings despite custom saved artwork; disabled and unpaired catalog apps do not automatically export. Draft-only explicit upload remains a user action, not automatic publication (actual HTTP and renderer tests).
- Hosting completion (`scripts/studio-server.mjs:137`) force-reconciles the selected executable; elapsed identity handling (`:531`) preserves the timer. Independent raw-RPC probe replaced ghost with a hosted logo without resetting timestamp, then switched two identically named apps sharing one Scene to their distinct hosted URLs. Closing all mapped apps cleared activity and returned null applicationImage/executable.
- Runtime projection fields (`scripts/studio-server.mjs:267`) are desired state. Preview selection (`scripts/discord-presence-studio.html:150`, `:164`, `:169`, `:176`) uses executable identity plus active/current/desired Scene guards. Additional actual renderer VM probes confirmed a same-Scene draft re-pair uses the draft app's logo without network/save requests or saved mutation; unpair uses ghost; disconnected and wrong-Scene runtime images are not reused.
- `scripts/discord-presence-studio.html:1143`, `:1198`, `:468` keep main-image controls app-only with Upload/Retry and provider disclosure. Runtime-ignored custom choices and main click URL input are absent. Actual TH/EN VM tests exercise markup/actions, single flight, consent errors, draft preservation and no autosave.

## Evidence

Gate observed: coordinator message `msg_4491932e092b` confirmed both writers stable before final integration/backend/full tests.

- Renderer focused command (app-logo, draft, P3 and updates): **83/83 pass**.
- Backend focused command (app-icon-hosting, studio-p3-endpoints, studio-apps, running-presence, presence-config, scene-variables): **39/39 pass**.
- Supported suite `node --test scripts/tests/*.test.mjs`: **334/334 pass**, no skips/cancellations.
- Default `npm test`: initial **390 total, 388 pass, 2 fail**, both historical mockup fixtures above; superseding final rerun **390/390 pass**, no skips/cancellations.
- Independent TEMP HTTP/fakeRPC probe: **8 scenario groups pass**; additional actual renderer VM probe: **4 scenario groups pass**. Probe setup errors (missing fixture app and disabled injected watcher) were corrected before the reported successful runs; neither was a source defect.
- Anonymous curl GET of the pinned ghost PNG: **HTTP 200, image/png, 22,946 bytes**. This proves public HTTP delivery only, not Discord proxy acceptance or actual owner rendering.

TEMP evidence: `C:/Users/golfp/AppData/Local/Temp/vibe-review-app-logo.mjs`, `vibe-review-logo-renderer.mjs`, `vibe-review-app-logo-full.log`, `vibe-review-app-logo-full-final.log`, `vibe-review-app-logo-supported.log`. Both probes shut down their injected server and removed isolated profile directories.

No real profile/secrets/Discord, Chrome, autostart, installation, commit or push used. Browser screenshots, theme/focus visual inspection and actual Discord rendering remain unverified; source reuse of existing theme/control styles is inferred. This review changes only this report.

Verdict: **ship** — the actual app-first delivery and preview paths pass integration checks and the final full suite is green; no unresolved production finding.
