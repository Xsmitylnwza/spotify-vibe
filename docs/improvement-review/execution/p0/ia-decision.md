# D1 — Journey / IA decision (in progress)

Status: **Draft — discussion with owner ongoing (2026-10-02).** P2 starts only after this file is marked Agreed.
Inputs: `journey-audit-a.md`, `journey-audit-b.md`, `footprint-baseline.md`, P4-1 results.

## Decisions so far (owner, round 1)

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Mental model | **App → Scene first.** Home ("Now") shows what Discord is showing and why, plus an **App rules** list (`App → Scene`, edit/add/remove inline). Scenes become a library of text/art the rules point to. Settings secondary. |
| 2 | Pin ("Show on Discord") | **Pinned until the owner cancels.** No hidden 1-hour expiry. Now clearly shows "Pinned: <Scene>" with "Back to Auto". (Changes current server contract: 1-hour manual override → indefinite; needs server + renderer task.) |
| 3 | Pause / Clear / Hide | **Two controls only:** **Pause** = keep the current Scene, stop switching by app; **Hide from Discord** = show nothing until turned back on. Both on Now. Remove the separate Clear concept. |

## Decisions (owner, round 2)

| # | Topic | Decision |
| --- | --- | --- |
| 4 | No rule matches | **Show nothing** (current behaviour). Now says so plainly ("No ruled app open — Discord shows nothing"), never "Live". |
| 5 | Several ruled apps open | **Most recently focused ruled app wins** (current policy, unchanged). |
| 6 | Add rule → pick app | **Running apps first + search installed apps**, system/uninstaller entries filtered out, plus "Browse for .exe…". No 110-tile wall. |
| 7 | Scene editor | Opens as a **side drawer** from a rule or from the Scene library, with live Discord preview; closing returns to where you were. |

## Decisions (owner, round 3)

| # | Topic | Decision |
| --- | --- | --- |
| 8 | First run | **3-step guided setup:** Discord connected? → pick a running app → pick/edit a Scene and see it on Discord immediately → land on Now. |
| 9 | Editor fields | Visible: Scene name, activity type, two text lines, main artwork. Collapsed "Advanced": buttons, links, small artwork. **Timer is removed from the UI** (owner: not wanted). Existing timer values in saved Scenes are preserved untouched on disk (F09); new Scenes have no timer. |
| 10 | Close (X) | **Hide to tray**, with a one-time notice that the companion keeps running; Quit lives in the tray menu (and Settings). |
| 11 | Logo | ~~D3 Nori~~ → **rejected by owner after refinements (looked scary).** Decision: **refine the ORIGINAL ghost logo** (same silhouette, wink, indigo gradient), polish only. Chosen 2026-10-02: **ghost-v2 direction 1 (round eye + wink + smile) with the bolt replaced by an eye sparkle**; final treatment pending (P3-L5). Superseded note: D3 Nori (mascot). Known risk to address in refinement: headphones read as "music app"; 16 px tray legibility; check against Scene art style. |

## Decisions (owner, round 4)

| # | Topic | Decision |
| --- | --- | --- |
| 12 | Discord setup | **Zero-config:** the bundled Discord Application ID (`scripts/discord-application.mjs:2`) is used by default; the ID field moves to Settings → Advanced. No Discord login/OAuth (RPC is local IPC; OAuth `rpc` scope needs Discord approval and conflicts with local-only). |
| 13 | Visual direction | **Keep the CURRENT UI look; refine details only** (owner: existing UI is good). Reuse existing components/CSS; only rearrange for the new journey and polish contrast/spacing/copy. Logo stays the ghost (refined). |
| 14 | New features (all requested) | (a) **Tray controls**: Pin/Pause/Hide and pick a Scene from the tray menu. (b) **Global hotkey** to hide/show Presence. (c) **Auto-hide rules**: when a chosen app is open (e.g. banking), Presence hides. (d) **Export/Import** Scenes + rules as a file. (e) **Text variables** `{app}`, `{window}` in Scene text, opt-in per Scene. (f) **Web rules**: match browser tab/window title (e.g. Figma in Chrome → Design). (g) **History**: what Discord showed today. |

Feature constraints: all local, no new network services. (e)/(f)/(g) read window titles — privacy: opt-in, never sent unless the owner's Scene text uses them, history stored locally with bounded retention and a clear button. Footprint budget from P4 must hold (window-title reads only for the foreground window, no extra polling loop).

## Decisions (owner, round 5 — mockup feedback)

| # | Topic | Decision |
| --- | --- | --- |
| 15 | Opening the editor | No full-page re-render and no moving/sliding animation (owner felt dizzy). The page behind stays still; the editor appears with at most a short fade (none under reduced motion). |
| 16 | Editor fields | **Show every supported Discord field** (supersedes the "Advanced collapsed" part of #9), grouped in clear sections: activity type + name; Details line (+ link); State line (+ link); Large image (+ hover text, + link); Small image (+ hover text, + link); Buttons (up to 2: label + URL). Timer stays removed. |
| 17 | Preview placement | Preview must stay visible while editing: wider editor with the form on one side and a **sticky preview** on the other (stacked sticky preview on narrow widths). Never scroll back up to see the result. |
| 18 | Field help | Every field gets a circled **?** icon; hover/focus shows what the field changes and where it appears on the Discord card, and **highlights that area in the preview**. Keyboard and touch accessible. |
| 19 | Typography | **IBM Plex only**: IBM Plex Sans + IBM Plex Sans Thai (+ Plex Mono for code/paths). Drop Fraunces (serif) — the serif/sans mix felt inconsistent. Bundle fonts locally instead of Google Fonts (offline, CSP). Discord preview card keeps a Discord-like font only inside the card. |

## Decisions (owner, round 6)

| # | Topic | Decision |
| --- | --- | --- |
| 20 | Interaction motion | Every interaction gets a **short, smooth transition** instead of an instant swap (owner: instant render feels odd), while respecting #15 (no large movement, page behind never slides). One motion system: durations ~120–220 ms, one standard ease-out curve, opacity + tiny translate (≤ 8 px) / scale (0.98–1) only. Covers: route/screen changes (cross-fade), drawer/modal/tooltip enter-exit, button/press feedback, state chips and Now-state changes (cross-fade text, not jump), list rows add/remove (height + fade), save status transitions, toggles. Under `prefers-reduced-motion` → instant or opacity-only. No animation may delay input or block focus. |

| 21 | Discord identity | **No OAuth login.** Use the local Discord Desktop RPC connection: after `login`, the client READY event provides `user` (id, username, global/display name, avatar). Show **"Connected as @user" with the real avatar** in the shell/Now and use the real avatar + name in the Scene preview. Updates on reconnect/account switch; falls back to the placeholder when Discord is not running. Avatar loaded from Discord's CDN only for display (no token, nothing stored except optional cached display fields). Bundled Application ID stays default (#12). |

## Open topics
- Language/theme placement (default proposal: Settings, reachable at every window width).
- Visual direction for the new screens (via mockups).
- Window/tray behaviour, language/theme placement.
- Logo direction (concepts in `../p3/logo/`).
