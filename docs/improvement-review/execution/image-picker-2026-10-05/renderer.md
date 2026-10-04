# Renderer: restore Change image selection (lg + sm) — 2026-10-05

## Changed
- `scripts/discord-presence-studio.html`: removed all large-image locks (openImg/imgInner/imgTab/pickImg/applyImage/mainIcon/imgclear).
  Change opens the type home for BOTH images (App icon, Built-in art, GIF, Image link, Discord avatar, Recent); other tabs have Back.
  Large App tab again has Cancel + Use/Keep app icon plus Upload/Retry (same consent flow).
- Contract: `largeImageSource:"custom"` (with art) = explicit custom; absent/empty/"app-icon" = default (app logo -> Vibe). `sceneToUi`/`sceneToRaw` round-trip `custom`; legacy stored art is never resurrected without the marker and is kept on disk.
- `mainIcon`/`published`: custom uses draft/saved art + click link (builtin resolved by artSrc), never the live logo. Default uses live `applicationImage` only if the saved Scene (`_raw`) was not custom, so a draft switched custom -> default previews the app now.
- Well: custom shows its real source with Change + Remove; default shows "Follows <app>"/Vibe. Click link input only when custom. App icon / Remove set `app-icon`, clear the ignored link, keep stored art; only the chooser closes. Picking art sets `custom`. All edits are draft-only (Done = existing atomic PUT).
- Copy/tooltips updated (no always-logo claims), TH+EN. No CSS change needed.
- Tests: `renderer-app-logo.test.mjs` replaced locked-modal tests with new-contract tests (round-trip, preview/live, home + Back for both sizes, choose each source -> custom, App icon fallback, Remove); `renderer-p3.test.mjs` fixture gets `customLg`.

## Verified
`node --test scripts/tests/renderer*.test.mjs`: 87 pass / 0 fail. `npm test`: 394 pass / 0 fail.

## Not verified / limitations
- No browser/GUI run (per instructions); ACT handlers `ovtab`/`ovback` and Done/failure/discard flows were not re-tested beyond existing renderer-draft tests (they are unchanged and still pass). Back is asserted by rendered markup, not by dispatching the click.
- Cross-lane payload tests with backend not added here; renderer sends `largeImageSource: custom|app-icon|omitted`.
- Remove/App icon keep the old `largeImage` value on disk (marker `app-icon`), by design.
