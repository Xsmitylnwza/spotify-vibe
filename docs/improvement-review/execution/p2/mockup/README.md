# D1-M / D1-M2 — Clickable mockup of the new Studio journey

Mockup only. Nothing under `scripts/`, `electron/` or `public/` was edited (files were *copied* into this folder). Fake data, no network, no build, vanilla HTML/CSS/JS.

**Direction change applied (owner, high priority):** the current Studio look is kept as-is. `studio-ci.css` is an unmodified copy of `scripts/studio-ci.css`; every screen is built from its real `vs-*` components, the real sidebar/nav icons, the ghost logo (now `p3/logo/final/ghost-final-d.svg`; the original `assets/logo-ghost.svg` is the favicon) and real art (`public/art/*`, copied into `assets/art/`). Only the content/arrangement follows the new journey, plus contrast and spacing polish. The Nori mark is **not** used.

## D1-M2 revision (decisions #15–#19)

| Decision | What the mockup does |
| --- | --- |
| **#15 No dizzy motion** | Opening *Edit Scene* only builds the side panel; the page behind is not re-rendered, scrolled or animated. The panel and backdrop use a 0.12 s opacity fade (none under `prefers-reduced-motion`). The old fade-up/slide on cards, dialogs and the first-run card is switched off in `mockup-extra.css`. On close the page is re-rendered only if something changed, at the same scroll position. Rebuilding the panel (e.g. toggling a segment) keeps its scroll position. |
| **#16 Every field, in sections** | Scene (name, internal) · Activity (type, name) · Details line (text, link) · State line (text, link) · `{app}`/`{window}` opt-in (+ privacy note) · Large image (source: built-in art or GIF/https link, hover text, click link) · Small image (same + "None") · Buttons 1–2 (label, https link). No "Advanced" fold; no timer. Fields map to `presence-config.mjs` `validateScene` (activityType, activityName, details/detailsUrl, state/stateUrl, largeImage/Text/Url, smallImage/Text/Url, buttons). https validation shows an inline error. |
| **#17 Preview always visible** | Panel is 960 px wide: form scrolls on the left, sticky Discord preview on the right. At ≤860 px the preview becomes a compact sticky card at the top of the panel (user row and buttons trimmed) and the form scrolls under it. |
| **#18 Field help** | Every field has a circled **?** (focusable button). Hover, keyboard focus or tap shows a TH/EN tooltip (what it changes, where on the card) and outlines/glows that exact area of the preview (heading, first line, second line, large image, small badge, each button). Focusing a field itself also highlights its area. Escape closes the tooltip first, then the panel. Deep link example: `?screen=now&open=drawer&tip=details`. |
| **#19 IBM Plex only** | `mockup-extra.css` bundles IBM Plex Sans, IBM Plex Sans Thai and IBM Plex Mono from `assets/fonts/` (woff2, OFL, no network) and maps `--vs-font-serif` to the sans stack, so Fraunces/serif is gone everywhere (first-run title, hero titles). Plex Mono is used for exe names and URLs. The Discord-like font is kept only inside the preview card. **For the real app: bundle Plex locally (same files) instead of the Google Fonts `<link>`** — offline, CSP-safe, no flash of fallback. |

Brand mark: `assets/ghost-final-d.svg` (copy of `p3/logo/final/ghost-final-d.svg`) in the sidebar, first run and tray mock.

Screenshots were re-captured for the whole set (fonts/logo changed everything). Editor-specific ones: `30-drawer-top`, `31-…-text-fields-vars`, `32-…-images`, `33-…-buttons`, `34-…-tooltip-highlight-details`, `35-…-tooltip-highlight-small-image`, `36/37` saving / failed, `71` dark + tooltip, `74/75` Thai (tooltip / top); narrow `m-30…m-37, m-71, m-74, m-75`.

## How to open

Double-click `index.html` (or `file:///C:/letmecook-lab/spotify-vibe/docs/improvement-review/execution/p2/mockup/index.html`). It starts on **First run**.

- **Dev toolbar** (dark strip at top, prototype only): jump to any screen, flip the **Now** state (8 states), open *Add rule* / *Web rule*, make the next drawer save fail, simulate "Discord closed" in first run, reset first run. `hide` collapses it.
- Real controls work: Pin / Pause / Hide / Back to Auto / Resume, rule Scene dropdowns, remove rule (+Undo), add rule, Edit Scene → drawer (Esc/✕/Done close it; focus returns to the opener), TH/EN and light/dark (sidebar on desktop; top strip on narrow widths, plus Settings), `Ctrl+Alt+H` toggles Hide (hotkey stand-in), Settings → Change hotkey records a combo.
- URL params for deep links: `screen=first|now|scenes|settings|tray`, `state=auto|pinned|paused|hidden|autohide|none|discordoff|unreachable`, `lang=en|th`, `theme=light|dark`, `step=1..3`, `open=drawer|drawervars|drawerfail|drawersaving|picker|picksearch|pickerweb`, `dev=0`.
- Files: `index.html`, `studio-ci.css` (copy, unchanged), `mockup-extra.css` (only what the new journey needs + contrast polish + Plex), `mockup.js`, `assets/`, `screens/`.

## Which decision each screen implements, and which real components it reuses

| Screen | Decisions | Reused real components |
| --- | --- | --- |
| **First run** (3 steps; Discord → app → Scene, seen on Discord → Finish lands on Now) | #8, #12 (no ID, no login), truthful state: Finish is enabled only after a simulated Discord confirmation; failure keeps the text | `.vs-scrim`, `.vs-onboard`, `.vs-ob-mark/title/sub/actions`, `.vs-skip`, `.vs-steps/.vs-step`, `.vs-pill`, `.vs-pair-bar`, `.vs-look`, `.vs-input`, `.vs-dc-card`, `.vs-tile-running` |
| **Now** (what Discord shows + why, controls, rules) | #1 #2 #3 #4 #5 | `.vs-page-head`, `.vs-ed-grid` + `.vs-preview-col` (editor's two-column layout), `.vs-now-hero/.vs-facts/.vs-actions/.vs-footnote`, `.vs-dc-card`, `.vs-btn*`, `.vs-pill*`, `.vs-alert`, `.vs-card` |
| Now states: Auto (+ "also open", most recent wins), **Pinned until cancelled** (Back to Auto), Paused, Hidden, Hidden by auto-hide rule, Nothing shown (no ruled app), Discord not running, Companion unreachable (dimmed last-known preview, no "Live" claim) | #2 #3 #4 #5 #14c, audit A/B J15 | same as above + `.connection-pill` in sidebar mirrors the state |
| **App rules** list: App → Scene dropdown, Edit Scene, remove (Undo), *Active* marker, auto-hide row on top, web rows | #1 #14c #14f | row styled like `#appMappingList .vs-mapping` (that rule is ID-scoped → `.mk-rule`), `.vs-icon-btn-danger`, `.vs-pill-good` |
| **Add rule — app** (running apps first, search installed, system entries hidden with a toggle, Browse for .exe…, "Then": Scene or Hide) | #6 #14c | `.gif-picker`/`.vs-dialog`/`.gif-dialog-head`, `.vs-segmented`, `.vs-app-search`, `.vs-tile-icon/.vs-tile-running` tile grid (`.mk-tile` = `#applicationTiles .vs-tile`), `.vs-switch`, `.vs-quiet-link` |
| **Add rule — web tab** (title contains, live match list, privacy note) | #14f | same dialog + `.vs-field/.vs-input/.vs-select` |
| **Scene editor drawer**: live preview, name, activity type, 2 text lines, opt-in `{app}`/`{window}` + privacy note, main art; all fields in sections (see D1-M2), sticky preview; saving/saved/failed(+Retry); **no timer** | #7 #9 #14e #15–#18 | `.vs-preview-label/.vs-dc-card`, `.vs-field/.vs-label/.vs-input`, `.vs-segmented`, `.vs-switch`, `.vs-look` (variable chips), `details.vs-disclosure`, `.vs-savebar` (data-state saved/saving/error), `.vs-icon-btn`; the drawer shell itself is new = `.vs-dialog` surface + `.gif-dialog-head` pattern |
| **Scene library** → row opens the same drawer ("On Discord" marker, "Used by …") | #1 #7 | `#sceneList .vs-scene-row`, `.vs-scene-icon/.vs-scene-meta`, `.vs-pill` |
| **Settings**: Discord connection (zero-config; App ID under Advanced), startup + ✕ behaviour, global hotkey, export/import (preview, merge/replace), history (toggle, retention, today's list, Clear + confirm), language & theme, Quit (confirm) | #10 #12 #14b #14d #14g | `.vs-card/.vs-card-head`, `.vs-keystatus/.vs-statuspill`, `.vs-row/.vs-row-copy`, `.vs-switch`, `.vs-select`, `details.vs-disclosure`, `.vs-pair-bar`, `.vs-section-label`, `.vs-btn-danger`, `.vs-toggle-cluster/.vs-seg` |
| **Tray menu** (Pin ▸ Scenes, Pause, Hide + hotkey, Open, Quit; same state as Now) and **one-time "still running" notice** after pressing ✕ on the faux window | #14a #10 | OS chrome is mocked (`.mk-wmenu`, `.mk-wtoast`); window uses the real `.vs-titlebar/.vs-winbtn-close`; tray icon = real ghost |
| Narrow (≤760 px): bottom nav + a top strip with status pill **and** TH/EN/theme | open topic "language/theme at every width" | real `.vs-bottomnav`, `.vs-mobile-status` |

New components (no existing equivalent), each styled like its nearest sibling in `mockup-extra.css`: the side drawer (`.vs-dialog` surface + dialog head + `.vs-savebar`), rules rows (`.vs-mapping` look), pin popover menu, toast (`.vs-savebar` pill), tray/desktop mock.

### Polish / audit problems fixed (and not repeated)
- **Contrast**: `--vs-ink3` #A8A8A8 (2.3:1 on the page) → #6E6E6E (4.9:1) for captions/sub-lines/placeholders; warn text darkened (#B25E09 → #8F4A05); dark-theme red lifted (#ed4245 3.6:1 → #ff8587); dark-theme filled button #4752c4 (white 6:1 instead of 4.2:1). Preview card keeps the real fixed Discord-dark surface with explicit light text.
- **Language/theme on narrow widths** (B J11): visible in the top strip at every width + Settings.
- **Clear = hidden pause / controls buried** (A J6): Pause and Hide are on Now; no Clear.
- **"Live on Discord · No matching app"** (A J1/M4): Now says "No ruled app open — Discord shows nothing".
- **Dead companion blamed on Discord** (B J15) and **misleading page after Quit** (B 10.10): dedicated state; Quit lands in it.
- **110-tile app wall** (A J4, B 11.4): running tiles + search.
- **"Draft" tag on saved Scenes**, **Thai in EN UI**: none; all strings go through one TH/EN switch.
- **Untruthful "saved"**: Saving… → Saved *HH:MM* only after the simulated save returns; failure keeps the draft and offers Retry.

## Screenshots (`screens/`)
`NN-name.png` = 1280×800; `m-NN-name.png` = 390×844. Captured from an Orca browser tab with `set viewport`; each was verified for dimensions and a sample of PNGs viewed. Groups: `0x` first run, `1x` Now states, `2x` Add rule, `3x` drawer, `4x` library, `5x` settings, `6x` tray, `7x` dark / Thai.

## Open design questions (noticed while building)
1. **Auto-hide scope**: hide while the app is merely *open* (as built, most reliable) or only while *focused*? Open-in-background also hides during unrelated work.
2. **Web vs app rule precedence**: Chrome focused with a "Figma" tab while Figma.exe is also open — which wins? Mock assumes "most recently focused window"; needs an explicit server rule.
3. **Pin vs auto-hide**: does an auto-hide rule override a Pinned Scene (privacy says yes)? The mock treats them as exclusive modes. Also confirm "Show again" after Hide returns to the previous mode.
4. **Pause availability**: Pause is disabled when nothing is shown, hidden or pinned. Acceptable?
5. **`{window}` fallback**: empty/very long titles, or hidden-by-rule — needs a length cap and fallback text.
6. **Preview theme**: the real preview is always Discord-dark; Discord light-theme users see something different. Keep as "always dark, labelled"?
7. **History scope**: rows store Scene + app + duration; should `{window}` text ever be stored? Is a "don't keep" retention option needed in addition to the toggle?
8. **Import conflicts**: merge/replace shown, but ID/name clashes aren't previewed before Apply.
9. **First-run edits**: step 3 edits the shared sample Scene directly; clone it instead so samples stay pristine? And an app that already has a rule?
10. **Hotkey/tray failure modes**: if `Ctrl+Alt+H` is taken, the mock only promises an inline message; also the ghost mark at 16 px in the tray (real `tray.png`) was not re-checked here.

Verified in the browser tab: opening the drawer from a rule's Edit Scene button and closing it with ✕ returns focus to that button (DOM check); all 55 screenshots were captured at the exact requested viewport (PNG dimensions checked) and a sample of each group was viewed.

Known gap: the narrow dark/Thai set (m-70, m-71, m-72, m-74, m-75) was not re-captured after the D1-M2 change (capture timed out); the desktop set and the other narrow shots were.
