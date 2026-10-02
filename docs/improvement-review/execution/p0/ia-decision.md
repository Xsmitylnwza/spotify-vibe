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

## Decisions (owner, round 7 — mockup feedback)

| # | Topic | Decision |
| --- | --- | --- |
| 22 | Preview realism | Preview = faithful Discord dark **profile popout** (banner, ringed avatar + status dot, name/@username, activity panel), with a toggle to the **member-list** row. Real identity from #21. |
| 23 | Sidebar footer | One **Discord-style account panel** (avatar + status dot, display name, short status, gear → Settings). Language/theme move to Settings > Appearance. |
| 24 | Scene library rows | Bound apps shown as an **icon stack on the right** (+N, tooltips, browser+globe badge for web rules, "+ app" when none); 2-line rows; focal flow artwork → name/detail → right cluster. |
| 25 | Delete Scene | Delete action inside the Scene editor; confirm names the Scene and lists affected rules (remove or reassign); removed only after successful save; Undo toast; last Scene cannot be deleted. |
| 26 | Image picker | Large/small image fields use an image well + picker: **Built-in art · GIF search (GIPHY) · Link (https, live preview + validation) · Upload from computer**. |
| 27 | Upload hosting | Upload sends the file to a **public image host** (owner choice) so Discord viewers can see it: explicit per-upload confirmation that the image becomes public; host configured in Settings > Image hosting (provider/API key like GIPHY, stored in secrets); no silent uploads; local thumbnail kept only as cache. Provider choice finalized in implementation (must allow anonymous/API upload, https direct links, acceptable ToS). |
| 28 | Rendering | **No full re-render on any interaction.** Overlays never rebuild the page behind; modal/drawer frame, header, stepper and footer stay mounted while only the step body cross-fades and height animates; selections toggle state on existing nodes; lists/Now/editor use keyed incremental updates preserving scroll and focus. (Implementation rule for P2 renderer too.) |

| 29 | Where apps are paired | **Supersedes the App-rules-on-Now part of #1.** Apps are paired **inside each Scene's editor** (section "Shows when these apps are open": app/web-tab chips with remove, "+ Add app" opening the #6 picker). One app/tab belongs to one Scene; picking an app already used elsewhere asks to move it. Now keeps only the status card plus a compact summary ("5 apps paired · 1 auto-hide") linking to Scenes. Auto-hide rules (not Scene-bound) move to **Settings → Privacy**. Selection policy (#5) unchanged. |

| 30 | Now page focus | Single focal point = the Discord preview. One-line status (app icon + "Showing Design · following Figma" + one state chip), preview centred, one compact control row (Pin/Pause/Hide with contextual labels). Removed: Why/Also open/Discord facts row, duplicate "Connected as", close-window paragraph. Problem states = one short message + one action. |

| 31 | Shell & scrolling | One scroll owner: full-height shell; sidebar fixed to the viewport with its background full height, nav top + account panel pinned bottom; only main content scrolls; on narrow the bottom nav stays fixed with content padding (fixes owner-reported sidebar gap and UX M11). |

| 32 | Logo (final) | **Option 09 "Swooping ghost"** from execution/p3/logo/generated/ (owner pick). Redraw as SVG (app icon + single-colour tray) before applying to app assets in P3. Supersedes earlier logo choices. |

| 33 | App icon as image | Image picker gains an **"App icon (automatic)"** choice for Large and/or Small image: the image follows the matched app's icon. Uses hosted icons where available (today: scripts/application-badges.mjs set); other apps fall back to a generic icon or a one-time confirmed upload of the extracted icon to the image host (#27), cached. The current silent small-image override in withApplicationBadge becomes opt-in only (truthful UI). |

| 34 | Now layout | Two columns filling the width: left = status hero (chip, one line, Pin/Pause/Hide) + "Paired apps" tile grid (icon → Scene, running dot, active highlighted, click opens Scene editor); right = fixed-size preview panel with Profile/Member tabs in its header (switch cross-fades inside the box; no page re-layout). No duplicate Manage buttons. Stacks below 1024 px. Refines #30. |

| 35 | Status card content | Status card is read-only: shows the Scene that is showing now (thumb + bold name) and why (paired app icon + "from Figma", or "Pinned" / "Paused"). No Scene dropdown. Choosing another Scene only via **Pin…** (opens a Scene picker); Pause and Show-on-Discord toggle stay. Nothing shown → one line + no dropdown. |

| 36 | Starting data | The real app ships with **no sample Scenes**; the library starts empty and first-run step 3 creates the first Scene. Mockup sample Scenes are demo data only. Existing owners keep their saved Scenes. |
| 37 | Library row chips | Remove the "On Discord" and "Not used" chips: the dashed "+ app" already signals unused, and the live Scene is marked by the existing left accent bar + a small green dot on its thumbnail. Page copy no longer mentions "Rules on Now". |

| 38 | After Done | Pressing **Done** closes the editor and opens a compact summary modal: Scene thumb + "<Scene> saved" + when it shows ("Shows when VS Code is open" / "Not paired — won't show automatically") + actions **Show on Discord now** (primary), **+ Add app** (only if unpaired), **Close**. The editor footer keeps a single primary (Done); "Use this Scene" moves into the modal. |

## Open topics
- Language/theme placement (default proposal: Settings, reachable at every window width).
- Visual direction for the new screens (via mockups).
- Window/tray behaviour, language/theme placement.
- Logo direction (concepts in `../p3/logo/`).
