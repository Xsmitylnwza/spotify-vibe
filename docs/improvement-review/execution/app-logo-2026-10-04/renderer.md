# Renderer: main Discord image follows the paired app logo (2026-10-04)

## Changed (renderer lane only)
- `scripts/discord-presence-studio.html`
  - `STUDIO_ICON_URL` (immutable raw GitHub PNG). `studioIcon()` prefers an https `rt.applicationIconFallback`, else the constant.
  - `sceneApp()`: with `rt.selectedApplicationExecutable`, the paired rule with that exact executable (case/slash-insensitive) wins; the old display-name match is used only when the server sends no executable.
  - `mainIcon()` / `published()`: main art = server `rt.applicationImage` (a desired projection, not labelled acknowledged) only when `rt.active` and the Scene is current (`currentSceneId`, and `desiredSceneId` if present, equal this Scene), the https image exists and the chosen app is the same identity as the live one; otherwise the chosen app's `publicIcon`; otherwise the studio fallback. Stored `art`/`artSource`/`artUrl` are never used for painting; `published()` works on a copy, nothing in `sc`/`_raw` is written.
  - Small image: empty or `app-icon` source -> paired app logo (live `applicationBadge` only when active, same Scene and exact app), else Vibe Studio icon; explicit small image and its link unchanged.
  - Editor Large image: read-only identity well ("Follows <app>" / "Vibe Studio icon", "Apps first, Vibe fallback" / TH "แอปก่อน Vibe สำรอง", note when the app has no public icon). Change opens the App icon chooser directly. No remove button, no built-in/GIF/link/avatar choices, no click-link input (hover text stays). The hidden stored `artUrl` no longer blocks Done.
  - Large chooser keeps per-app Upload / Retry, the consent card and pending/single-flight logic; the "Use" and "Use paired app icon" actions are gone. The Small chooser is unchanged.
  - Scene list rows, pair tiles and the saved summary thumbnail use the same main icon; the Now fallback note says the Vibe Studio icon is shown when the live image equals the fallback; the runtime signature includes the new rt fields.
- `scripts/studio-ci.css`: no change needed (existing well/thumb styles reused; both themes inherit tokens).
- Tests: new `renderer-app-logo.test.mjs`; `renderer-p3.test.mjs` and `renderer-draft.test.mjs` fixtures/expectations updated for the new semantics.

## Verified
`node --test scripts/tests/renderer-*.test.mjs`: 83 tests, 83 pass, 0 fail. All inline `<script>` blocks compile (`new Function`).

## Not verified / limitations
- No browser/Discord run and no screenshots (owner speed rule; no real profile touched). Full `npm test` not run (backend changing concurrently).
- Backend contract fields (`applicationImage`, `applicationIconFallback`, `selectedApplicationExecutable`, `desiredSceneId`) are read defensively; `desiredSceneId` is an assumed optional name, ignored when absent.
- Old custom "Large image" help-text keys remain in the help popover table unused for the removed link input.
