# D1-M / D1-M2 — Clickable mockup of the new Studio journey

Mockup only. Nothing under `scripts/`, `electron/` or `public/` was edited (files were *copied* into this folder). Simulated activity and app pairings, real Discord identity via a local read-only bridge; no build, vanilla HTML/CSS/JS.

## Real-device trial (2026-10-02)

### Owner UX correction: one switch, one Scene, app artwork

The real-device surface removes the separate Discord test banner and its Send/Check/Clear controls. The master switch stores the owner's enabled preference separately from RPC's applied state and remains operable with no pairing, no Scene, a loading catalog or a disconnected RPC client. Choose a Scene in the status card or Pin a paired app; changes save and apply while enabled. Editing an inactive Scene offers **Use this Scene**; the editor otherwise has Done, not another Send button. Selected Scene/app and enabled preference persist in the isolated workspace. No continuous automatic foreground switching is introduced; the owner's manual selection remains authoritative.

`{app}` resolves from the selected real pairing in activity name, details/state and hover text; with no pairing it uses the Scene name, preserving the original template. Both editor preview and delivery use that resolution. Window-title sharing is not enabled and `{window}` is rejected explicitly. Empty details/state are valid optional fields and do not gain invented replacement text. Real identity remains visible when presence is off or a refresh is pending. The left column groups status/apps independently of preview height, eliminating the large inter-card gap.

The image gallery includes a selectable **App icon** card and tab. Known app icons use existing approved public PNG assets; common desktop apps also use public vendor favicons. Unrecognized apps without a public icon fall back to Discord's default image instead of blocking presence. Native local icons cannot be sent directly to Discord without a public host; there is no simulated upload. The profile-avatar artwork now uses the actual account avatar in the real gallery.

Verified: 12 focused controller/UX tests and the full 158/158 suite passed. A DOM + real HTTP/RPC probe used the actual Chrome catalog entry and public icon, enabled sharing, received acknowledgement with resolved activity name and blank state, edited text and observed automatic application without Send, found the App icon gallery action, then toggled off/on with no Scene. The probe used a separate temporary workspace; SHA-256 of the owner's workspace was unchanged and test activity was cleared. Public OBS icon URL returned image/png HTTP 200. Browser screenshots and Discord profile visual acceptance remain owner checks. The mechanical scan reports the same five existing animation warnings outside this change.

Connection correction: opening port 17349 now selects real-device/live mode even without query parameters. The page establishes and retains the Discord RPC connection before loading identity; connection status says "Connected to Discord · ready to send" separately from whether an activity is active. This does not publish an activity. Check status reconnects explicitly. Clearing activity on the real-device surface keeps RPC connected. Verified over the real-device proxy: connect acknowledged with `connected:true, active:false`, identity loaded, and connection remained true afterward.

Open `http://127.0.0.1:17349/?screen=now&real=1&live=1&dev=0`. Start `live-server.mjs` first, then `real-app-server.mjs` from this directory if restarting services. The real-device surface reads visible running Windows apps and Start Menu executable shortcuts, using actual executable identity and extracted icons. It removes seeded app pairings, fake running apps/browser tabs, fake Browse, GIF search/upload, prototype controls, and simulated Settings. The initial Scenes are editable templates; app pairings start empty. Refresh rereads the machine on demand. No background detector stays running after a read.

Add app → search by app name or executable → select → add/move. Scene drafts and pairings save atomically in an isolated workspace under `%TEMP%/vibe-real-app-demo/workspace.json` and reload across page refreshes. The owner's installed profile, secrets and autostart are untouched. Discovery covers visible process windows and Start Menu `.exe` shortcuts, not every Windows package or all background processes. Previously paired portable apps retain their saved identity when not open.

Discord delivery still uses the manual Send/Pin mode chosen by the owner. This surface proxies to the existing live server on 17348, preserving its active session instead of restarting it. No automatic selection/scheduling or browser-title matching is claimed. Artwork supports approved built-ins and public HTTPS links; local app icons cannot be published without image hosting.

Verified: this machine returned 9 visible running apps and 100 executable shortcuts; deduplication left 96 non-running choices in the picker. Real renderer/DOM + HTTP checks searched Google Chrome, added its executable pairing, saved to the isolated workspace, and restored it on reload. Original trial workspace was restored after the probe; that probe did not change Discord activity. Six focused discovery/storage tests passed, full suite passed 151/151. Browser layout, native packaging/installer, and a cold launch after reboot remain unverified. Real-device service is available on 17349; manual live service remains on 17348.

## Manual live Discord test (owner authorized, 2026-10-02)

Run `node docs/improvement-review/execution/p2/mockup/live-server.mjs`, then open `http://127.0.0.1:17348/?screen=now&apps=6&live=1&dev=0`. Opening the page only reads identity/status. **Send current Scene**, **Pin**, or **Send to Discord** in the editor delivers the selected Scene through the real IPC `SET_ACTIVITY` command. The presence switch hides/sends; **End test & clear** clears the activity and closes this test's IPC session. In this manual mode, clicking an already pinned app clears the activity; there is no automatic app fallback. The preview and live banner reflect the last acknowledgement, not unsent edits. Editor changes are in-memory drafts until Send; no owner's config/secrets, app detection, scheduling, autostart, or disk persistence is used. The separate profile-only mockup on 17347 continues working.

Built-in artwork resolves to the existing public Hinata assets. The avatar artwork uses the connected account's real Discord avatar. Other live artwork must use a public HTTPS URL. App/window variables must be disabled because there is no real detector in this manual test. Invalid drafts leave the previous acknowledged activity in place and show the error. Real activity sharing still depends on Discord's own activity/privacy settings.

Verified through real IPC: Design and Coding sends were acknowledged, with public artwork and text; server state read-back showed the applied Scene; hide and end were acknowledged and left no active test activity. Renderer functions were exercised against the real HTTP bridge for send, invalid draft, hide, second Scene, and end. Five focused fake-IPC/HTTP tests passed; full suite passed 145/145. No browser/Discord GUI was controlled; visual appearance on the owner's profile remains for owner testing. The server stays available, with activity cleared, for the owner's next click.

## Add app correction (2026-10-02)

Reproduced: clicking Add app builds the picker with `app: null`; `updatePicker()` called `appBy(null)` while constructing the selection description, throwing on `id.slice` before the dialog entered its visible state. The description now reads a name only after selection. Available fixture apps show immediately; search filters name and executable, without the old invented 127-app count. Confirmation sits outside the scrolling results. Empty selections and already paired apps cannot mutate rules; blank web-title rules cannot be submitted. Eight DOM checks exercised opening, search input, adding a chip, duplicate prevention, no-results, moving a rule and Undo. Browser visual verification remains pending.

## Real Discord profile (2026-10-02)

Run `node docs/improvement-review/execution/p2/mockup/profile-server.mjs`, then open `http://127.0.0.1:17347/?screen=settings&dev=0`. Existing mockup tabs also read that bridge on reload. The bridge reads the Discord IPC handshake using the bundled public application ID, then closes IPC; it never sets/clears activity, reads the owner's config/secrets, or writes identity to disk. Profile image comes from Discord's CDN.

Settings shows display name, @username, User ID, Copy, and Refresh profile. Sidebar and previews use the same real identity. One read on opening plus explicit refresh; no polling. The label is "Profile loaded", not a claim that the simulated companion/activity is connected. Loading/failure clears the shown identity instead of falling back to golf/@golf. Refresh after switching Discord accounts. TH/EN labels use the existing theme tokens.

Verified: live bridge returned identity, name, ID, and avatar; real identity rendered through the mock's profile function; avatar CDN returned HTTP 200. Five focused IPC/HTTP boundary tests and the full 137/137 suite passed. Identity escaping, failed reads, and rejected non-Discord avatar URLs passed VM checks. Browser rendering and clipboard behavior were not inspected. The mechanical scan still reports five existing animation warnings outside this change.

## Owner correction (2026-10-02): pin the paired app, one presence switch

Follow-up: the status card puts its mode and presence switch on one header row, with Scene name and following-app explanation below. Grid cards no longer inherit the vertical card-stack margin. Pin/Unpin uses bordered buttons with hover, pressed, and focus states. Pair rows are compact; below 560px the pairing wraps without compressing the pin target.

**Scale demo:** Now defaults to **36 paired apps**. Use the PROTOTYPE toolbar's **Paired apps** selector for 6 / 36 / 120, or `?screen=now&apps=120&dev=0` (also `&lang=th&theme=dark`). These are fake fixtures, including long names and repeated Scene assignments. Above 8 pairings, search by app, browser-tab text, or Scene name; the matching/total count updates, and the list scrolls within a height capped at 420px / 55vh. The preview and status do not grow with the list. A no-results message keeps the search available. The scroll region supports keyboard focus. Small lists show all rows without an internal scroll cap.

Supersedes the Pin/Pause/Hide control row described below. Each Now paired-app tile has separate edit and Pin/Unpin buttons. Pin targets that exact app/tab pairing, including when two pairings use the same Scene; unpin returns to automatic switching. The status card has one Show on Discord switch. Off clears the mock activity; On restores the previous mode and pin. Auto-hide rules still apply after an off/on cycle. Pin is unavailable while hidden, hidden by rule, or disconnected. Existing paused fixtures keep a recovery action. TH/EN labels and focus styles use the existing theme tokens.

Validation: JavaScript syntax check passed; VM behavior/render smoke passed 35/35 (including scale, search, pinning a deep-list app, and reducing fixture counts); repository `npm test` passed 132/132. Mechanical design scan reports five pre-existing animation warnings outside these changes. Browser screenshots, actual layout, and real Discord were not verified in this task; browser control was not requested.

**Direction change applied (owner, high priority):** the current Studio look is kept as-is. `studio-ci.css` is an unmodified copy of `scripts/studio-ci.css`; every screen is built from its real `vs-*` components, the real sidebar/nav icons, the ghost logo (now `p3/logo/final/ghost-final-d.svg`; the original `assets/logo-ghost.svg` is the favicon) and real art (`public/art/*`, copied into `assets/art/`). Only the content/arrangement follows the new journey, plus contrast and spacing polish. The Nori mark is **not** used.

## D1-M7 Apps are paired inside the Scene editor (decision #29, supersedes the Now rules table of #1)

- **Editor → "Shows when these apps are open"** (right after Scene name and Activity). Chips with the app icon + name; a web-tab rule shows the browser icon with the globe badge and "title contains “…”". × removes a chip (it collapses with the #20 animation, a toast offers **Undo** for 5 s, focus goes to *Add app*). **+ Add app** opens the existing picker (running apps first, search installed, system entries hidden, Browse for .exe…, web-tab tab) **pre-targeted to this Scene**: no Scene select, no hide toggle, primary button *Add app*. The picker sits in its own layer above the editor, so the editor node and its scroll are untouched (checked in the Orca tab).
- **One app/tab = one Scene.** If the selected app or tab already belongs to another Scene the dialog shows an inline warning — **“Move Visual Studio Code from Coding to this Scene?”** — and the primary button becomes *Move here* (Cancel closes). Moving re-targets the existing rule; a toast offers Undo. Selecting something this Scene already has shows "already shown by this Scene" and disables the button.
- **Empty state:** "Not shown automatically yet — add an app".
- **Now:** the App-rules table is gone (see D1-M7b for the simplified Now). One-line summary card: stacked app icons + **“6 apps paired · 1 auto-hide rule”**, **Manage in Scenes** and **Privacy settings** (the status card also gets an *Edit this Scene* button, since the table's *Edit Scene* buttons are gone). Updates go through the keyed DOM morph (#28).
- **Settings → Privacy** (new card, before History): the **Auto-hide rules** list (e.g. MyBank Desktop → Hide from Discord while open) with remove (+Undo) and **Add auto-hide rule** (same picker in `hide` mode: app or web tab, no Scene), plus the privacy notes (window titles are read only for the foreground window; `{window}` goes to Discord and is off by default; history stays local — see History). The Now "auto-hide" state and summary link here.
- **Library:** rows keep the icon stack (#24). The dashed **+ app** now opens the Scene's editor scrolled to the pairing section **with the picker already open** (focus returns to *Add app* when the picker closes).
- **First run** is unchanged: step 2 picks the app, step 3 picks the Scene; Finish pairs the app to that Scene (if the app already belongs to another Scene its rule is moved, keeping one-app-one-Scene).

Verified in the Orca tab (script): editor and its scroll container stay the same nodes while the picker opens/closes; add → Move confirm → Move re-targets the rule and shows a chip (3 chips), Undo restores it (2); removing a chip shows the exit state, then 1 chip / 6 rules, Undo restores 2 / 7; Library "+ app" opens drawer + picker titled “Add app to “Focus (names the app)””.

Screenshots: `26`/`26b` (editor pairing section EN/TH), `27`/`27b` (move confirm EN/TH), `28` (empty state), `29` (library "+ app" flow), `10`/`72` (Now summary EN/TH), `57`/`57b` (Settings → Privacy EN/TH), `58` (Add auto-hide picker); narrow equivalents `m-…`.


## D1-M8 "App icon (automatic)" image choice (#33)

The image picker (Large and Small) has a new first tab **App icon**. Choosing it makes the well read "App icon · automatic — follows the app that's showing" (with a small app glyph on the thumbnail) and the preview shows the icon of the Scene's paired app (the most recently used one; with several paired apps a note says "App icon changes with the app that is showing"). The tab has a short explainer and a per-paired-app list: **Ready** (hosted icon) or **Needs upload — uses a generic icon until uploaded** with an *Upload icon* button that runs the existing upload-confirm flow (#27: public-host confirmation, progress, then the icon becomes Ready and the preview updates; disabled with a hint if no image host key is set). No app paired → "No paired app yet" and a generic icon. Motion (#20) and the stable frame (#28) are unchanged. Checked by a DOM script (list shows Figma "Needs upload", Chrome "Ready"; choose → well + preview update; Upload icon → confirm → Figma Ready); no screenshots taken (speed-over-evidence rule).

## D1-M7b Now simplified (#30), rules table gone, sidebar pinned

**Now (#30).** One focal point: the Discord preview. Layout: title → **one status line** (app icon + “Showing **Design** · following Figma” + one state chip: Auto / Pinned / Paused / Hidden / Hidden by rule / Not shown) → the preview, centred (small Profile popout / Member list toggle) → **one control row** → the one-line pairing summary. Removed: the headline + explanation paragraph, the Why / Also open / Discord facts, the "Connected as" duplicate (the account panel has it), the "You can close this window…" paragraph (only the one-time close notice remains) and the kicker/sub-copy. Above the preview there is one line of copy plus the small preview caption.
- Control row = three equal buttons with consistent icons: **Pin… · Pause · Hide**; contextual labels — pinned: **Back to Auto** replaces Pause; paused: **Resume**; hidden: single **Show again**.
- Non-normal states replace the status line with one short message and one action: Discord not running → *Check again*; companion unreachable → *Reconnect* (preview dimmed, "Last known"); nothing shown → *Manage in Scenes*; hidden by auto-hide rule → *Privacy settings*. No banners or extra paragraphs.
- The Scene name in the status line is a quiet link that opens its editor.

**App rules table removed everywhere.** No "App rules"/"Add rule" card remains on Now, only the pairing summary (stacked icons, "6 apps paired · 1 auto-hide rule", *Manage in Scenes*, *Privacy settings*). Dead paths were deleted (`addrule`, `scrollrules`, the free-mode picker branch, the old hero/`modeInfo`); the old rules rows now exist only as the **auto-hide list in Settings → Privacy**. The prototype toolbar's old *Add rule* / *Web rule* are now **Pair app (editor)** and **Pair web tab (editor)** (open the Design Scene's editor with the pairing picker) and **Auto-hide rule (Settings)** (opens Settings with the auto-hide picker).

**Sidebar pinned (bug).** The shell now uses a sticky, full-viewport-height sidebar (`top: var(--dev-h)`, `height: calc(100dvh - var(--dev-h))`, own background, nav at the top, account panel at the bottom) and the prototype toolbar is sticky with its measured height exported as `--dev-h`, so nothing is offset and no strip appears under the account panel. The document is the only scroll owner; at ≤760 px the bottom nav stays fixed and content scrolls behind it with bottom padding. Screenshots scrolled to the bottom at 1280×640: `95` (Settings, light), `95b` (Settings, dark, TH), `95c` (Scenes, dark), `95d` (Now).

Screenshots: Now in every state, EN `10`–`17` and TH `10t`–`17t`, member list `18`/`19`; narrow `m-10`…`m-18`.


## D1-M6 Modals never cut off (first-run step 3 could not be submitted)

**Bug:** at 1280×800 the first-run step 3 (Scene chips + preview + Line 1/2 + status) was taller than the window; the footer (Back / Show on Discord / Finish) sat below the fold and the modal did not scroll.

**Fix, for every modal/dialog:**
- Max height = viewport minus margin (`calc(100dvh - 32px)`, `-24px` on narrow); layout = **fixed header + scrolling body (`overflow:auto`, `overscroll-behavior: contain`) + footer that is always visible**.
- **First run:** header = logo + stepper (hidden logo under 700 px height); body = title/sub + step content in `.mk-ob-scroll`; footer = `.mk-ob-foot` (Back / primary / Skip), separate from the body, so #28 still holds (frame, header, stepper and footer stay mounted; only the body cross-fades; the frame height animates).
- **Step 3 at ≥ 720 px:** the modal widens to 880 px (animated) and the step is two columns — chips, Line 1, Line 2 and the status on the left, the preview card (scaled 0.85) on the right — so it fits **without scrolling at 1280×800 and 1280×640**. Under 720 px it stacks, the body scrolls and the footer stays pinned; the primary button goes full-width on its own row, Back/Show/Skip below.
- **Image picker, delete confirm, add rule:** the panel scrolls and the action row (`.vs-form-actions`) is `position: sticky; bottom: 0` with its own background, so Apply / Upload / Cancel / Delete / Add rule never scroll away.
- **Enter submits:** pressing Enter in a first-run text field clicks the enabled primary action — *Show on Discord* first, then *Finish* once Discord confirmed.
- Toasts sit **below** every overlay (z-index) and ignore pointer events except their Undo button, so they can't cover dialog buttons.
- Motion (#20) unchanged.

**Check list (Orca tab, script-driven: each footer button must be inside the viewport *and* be the element hit at its centre point):**

| Step / modal | 1280×800 | 1280×640 | 390×844 |
| --- | --- | --- | --- |
| First run 1, 2, 3 (Back / Continue / Show / Finish / Skip) | ✓ all visible + hit | ✓ all visible + hit | ✓ all visible + hit |
| Enter in step 3 sends, then Finish enabled | ✓ | ✓ | ✓ |
| Add rule (Cancel / Add rule) | ✓ all visible + hit | ✓ all visible + hit | ✓ all visible + hit |
| Image picker — Link tab, Upload confirm | ✓ all visible + hit | ✓ all visible + hit | ✓ all visible + hit |
| Delete confirm | ✓ all visible + hit | ✓ all visible + hit | ✓ all visible + hit |

Screenshots of step 3 at the three sizes: `04-first-run-3-scene-idle` (1280×800), `04b-first-run-3-short-window` (1280×640), `m-04-first-run-3-scene-idle` (390×844), and the confirmed state `05-…`/`m-05-…`.

Result of the final script run: every footer/action button (first run steps 1–3 incl. Finish after send, Add rule, image Link + Upload-confirm, Delete confirm) was inside the viewport and the element hit at its centre at 1280×800, 1280×640 and 390×844.

## Render rules (no full re-render anywhere)

Owner bug: in the first-run modal, picking an app tile or pressing Continue/Back flashed the page behind *and* the whole modal. Rules now applied across the mockup:
1. **Overlay interactions never rebuild the shell or the page behind.** The backdrop/scrim, sidebar, top strip and `#main` keep their DOM nodes while a modal, drawer, picker or confirm is used.
2. **Selection = attributes/classes on existing nodes.** All renders go through `morph()` (a small keyed DOM reconciler in `mockup.js`): it updates only changed attributes/text, keeps node identity, focus, scroll position and running transitions, and syncs form state (`checked`, `value`, `selected`). Tile/option rings and fills therefore *animate in place* (#20) instead of being recreated. Changed text/images get a short fade-in (`.mk-flash`).
3. **Steps inside a modal** (first run, image-picker tabs, add-rule tabs/states): the frame, header, stepper and footer stay mounted; only the step body is swapped with `swapRegion()` — outgoing body fades out (120 ms) as an inert overlay while the new one fades in with a 6 px rise (180 ms), and the modal height animates from old to new (220 ms). Stepper chips update in place (the check mark pops). Same-step updates (typing, choosing a Scene, Discord check, upload progress, delete busy/error) are plain morphs with no swap.
4. **Drawer, Now, rules, library:** field edits, activity-type/toggle/image changes, Now state changes, rule add/remove/undo and library changes are keyed incremental updates; only a *screen* change cross-fades (ghost of the old content). The drawer keeps its scroll and focus when a segment or image changes.

DOM check (Orca tab, first run → Now → editor): the onboard modal, scrim, stepper, logo mark, app shell, sidebar and `#main` are the same nodes before/after choosing a tile and after Continue/Back; all five tiles are the same nodes (only `aria-pressed` changed); typing in a field keeps focus and the preview card node; switching Scene/Send keeps the modal node; on Now the hero, sidebar, first rule row and `#main` are the same nodes after a state change; in the editor the drawer and its scroll container (scrollTop stays 300) are the same nodes after changing the activity type.

## D1-M5 Scene library icons, delete, image picker + upload (decisions #24–#27)

**#24 Library rows.** Each row is *artwork → name (bold) + one detail line → right-aligned cluster [app icons][status chip]*, vertically centred. The old "Used by: …" text is gone. Bound apps are an overlapping icon stack (24 px icons, 28 px tiles with a surface-colour ring, max 4 then `+N`); a web/tab rule shows the browser icon with a small globe badge; hovering or keyboard-focusing the stack shows a tooltip with the names (TH/EN, also the `aria-label`). A Scene no rule uses shows a dashed **“+ app”** button (opens *Add rule* with that Scene preselected) and a "Not used" chip; the live Scene shows "On Discord". The same 24 px icon tiles are used in the delete dialog's affected-rules list. The row is a `div` holding a main button (opens the editor) plus the cluster, so the "+ app" button is not nested in a button; on narrow widths the cluster wraps under the name.

**#25 Delete Scene.** At the bottom of the editor form there is a *Delete Scene…* danger section (not next to Done). The confirm dialog names the Scene, lists affected rules with app icons, and offers **Reassign them to [select]** (default) or **Remove these rules**. Deletion is a mock save (700 ms, spinner on the button); the Scene is removed only after it succeeds — with *Make next save fail* (dev toolbar) the dialog stays open with an inline error and nothing changes. On success the editor closes, the library row collapses, focus returns to the library, and a toast offers **Undo for 5 s** (restores the Scene, the position, and the rules/reassignments). The last remaining Scene cannot be deleted: the button is disabled with an explanation.

**#26 Image picker.** Large and Small image are now an **image well** (thumbnail, source label, *Change*/*Choose*, remove ✕). It opens a picker dialog **above the editor** with four tabs: *Built-in art* (grid of the real `public/art` images; Small also has "None") · *GIF search* (search box, results grid; searching/loading spinner, "No GIFs found", and a "GIPHY isn't set up" state linking to Settings → Image hosting) · *Link* (https URL → live thumbnail + validation before **Apply**: must be https, a full link, and end in an image extension) · *Upload*. Keyboard: tabs use ←/→, the art and GIF grids use arrow keys/Home/End, Enter selects, Escape closes, and focus returns to the image well. Choosing an image updates the editor preview immediately (a short fade on the preview image, #20).

**#27 Upload + hosting.** The Upload tab has a drag-and-drop zone + **Browse…**. After a file is chosen it shows a thumbnail and an explicit confirmation — **“This image will be uploaded to <host> and become public so Discord can show it.”** — with *Upload* / *Cancel*; nothing is uploaded before Upload. Then a progress bar; success fills the field with the (fake) public link and shows a toast; failure (with *Make next save fail*) keeps the file and offers *Try again*. Non-images and files over 8 MB are rejected inline. **Settings → Image hosting** (new card) has the GIPHY key (masked, Set/Not set, Save/Remove) and the upload host (provider select ImgBB / Imgur / Cloudinary — placeholders, final choice is for implementation — plus masked API key). With no host key the Upload tab is disabled and links to Settings. Local thumbnails are only used as a cache for the preview. Deep links for review: `?screen=now&open=drawer&img=lg:gif|builtin|link|upload` (+ `gq=`, `lnk=`, `up=confirm|busy`, `giphy=0`, `host=0`), `…&del=1|remove|err|done` with `screen=scenes&scenesdrawer=1`.

Screenshots: `38`–`39` (editor wells, delete section), `40`/`43` (library EN/TH), `44`–`47` (delete confirm reassign/remove-TH/error/undo toast), `48`–`50i` (every picker tab and state incl. upload confirm in TH), `55`/`56` (Settings → Image hosting set / not set); narrow equivalents are `m-…`.

## D1-M4b Discord-style account panel (sidebar footer)

The cluttered footer (connected-as chip, status pill, TH/EN + theme toggles, "companion runs in the background") is replaced by **one ~54 px account bar** modelled on Discord's bottom-left user panel, on a slightly darker surface than the sidebar:
- round avatar with a **status dot** (green = connected/showing, amber = paused/hidden/hidden-by-rule, grey = Discord not running / companion unreachable), display name (bold) on line 1, short status on line 2 ("Showing: Design", "Pinned: …", "Paused", "Hidden", "Hidden by rule", "Nothing to show", "Discord not running", "Companion not responding"; TH/EN), and a **gear** button at the right → Settings (tooltip "Settings").
- Clicking avatar/name opens a tiny popover (name,  or "Not connected", status, "Open Discord"); Escape or an outside click closes it (fade + 4 px, exit animates).
- **TH/EN and theme moved to Settings → Appearance** (reachable at every width). The "companion runs in the background" text is gone from the footer (it stays in the Now card footnote).
- **Narrow (≤760 px):** the bar becomes avatar (with dot) + gear in the top strip; the bottom nav is unchanged.
- Motion (#20): status text and the avatar cross-fade in place and the dot colour transitions — the panel is patched, never rebuilt. The mockup has no collapsible sidebar rail, so the collapsed state is not mocked (the bar would reduce to avatar + dot).
- Screenshots: – (connected, Discord not running, paused in Thai, popover, hidden in dark) and  (Settings → Appearance), plus the narrow set , .

## D1-M4 Discord-faithful preview

**Why isn't the account real?** The mockup is a static prototype with fake data on purpose (`golf` / `@golf`, a placeholder avatar, fake apps/scenes) — it never talks to Discord. The real app (P2) will use the live `state.discordUser = { id, username, displayName, avatarUrl }` that the server already exposes from the local RPC READY event (commit `371fce0`), and fall back to the grey placeholder when Discord is not running.

The preview (Now and the Scene editor use the same component, `dcCard()` in `mockup.js`, styles `.dcp*` in `mockup-extra.css`) is now a replica of Discord Desktop's dark **user profile popout**:
- Banner strip (solid colour), large round avatar overlapping it with a status-dot ring, bold display name and `@username`, thin divider.
- Activity panel: section label by type (Playing / Listening to / Watching / Competing in), a 72 px rounded large image with the small image as a circle overlay at the bottom-right, then the activity name (bold), Details and State; Details/State get an underline-on-hover when a link is set; large/small hover texts show as Discord-style dark tooltips on hover; up to two full-width stacked secondary buttons.
- Discord's own colours (`#111214` / `#1e1f22` / `#f2f3f5` / `#dbdee1` / `#4e5058`, `#23a55a` status), radii and sizes, "gg sans" with fallbacks **only inside the card** (the app UI stays IBM Plex). No Discord logos or wordmarks. The card is always Discord-dark, in light and dark app themes.
- The card is labelled outside it: "Preview — how others see you on Discord" (TH: "ตัวอย่าง — คนอื่นเห็นคุณบน Discord แบบนี้").
- A toggle under the card switches **Profile popout ⇄ Member list**; the member list is the compact row (avatar + status dot + name + one-line "Playing **name**"). In that view only the activity type/name are visible, and a note says so. `?pv=list` deep-links it.
- #18 highlights still map to the right part: heading label + bold activity name (`act`), Details line, State line, large image, small badge, each button; #20 motion unchanged. On narrow widths the sticky preview shows only the activity panel (banner/name hidden) to stay compact.

Screenshots re-captured: all desktop (1280×800) and the narrow (390×844) set, EN and TH; new `18-now-member-list`, `19-now-member-list-th`, and the editor tooltip+highlight shots `34`, `35`, `74` (TH). Because the Orca tab only ticks animation frames when a screenshot is taken, each capture takes a throw-away shot first so transitions finish.

## D1-M3b Discord identity (decision #21, no OAuth)

Fake identity `golf` / `@golf` with a placeholder avatar (`assets/art/avatar-2.svg`), as it would arrive from the local RPC READY event.
- **Connected:** sidebar footer shows a round avatar + "Connected as @golf"; Now's *Discord* fact shows avatar + "Connected as @golf"; the Scene preview card (Now, editor, first run) uses the avatar + display name `golf` / `@golf` instead of "Your name"; Settings → Discord connection shows "Connected as @golf" (read from local Discord Desktop, no login, nothing stored) with the Application ID still under *Advanced*.
- **Discord not running / companion unreachable:** grey placeholder avatar + "Open Discord Desktop" in the sidebar, mobile strip, Now fact, Settings and preview ("Discord user · Not connected").
- **Switching:** the sidebar identity cross-fades (180 ms, same motion tokens) when the state flips; Now content and preview use the normal cross-fade. (Superseded by D1-M4b: the footer is now the account panel.)
- Screenshots: `90`, `91`, `92` (desktop) and `m-90`, `m-91` (390 px). The five narrow shots missing earlier (`m-70`, `m-71`, `m-72`, `m-74`, `m-75`) are now captured. Other screenshots predate the identity change (they show "Your name" in the preview) — re-capture before G1.

## D1-M3 motion system (decision #20, within #15)

Everything is CSS/JS in the mockup (`mockup-extra.css` tokens + `mockup.js` orchestration); no source edits.

| Token | Value |
| --- | --- |
| `--mk-dur-fast` | 120 ms — press feedback, colours, menus, tooltips, exit of small things |
| `--mk-dur` | 180 ms — content cross-fade, toasts, toggle knob, status colours |
| `--mk-dur-slow` | 220 ms — drawer / dialog enter, row grow, save-status pop |
| curve | one ease-out: `cubic-bezier(.2,.8,.2,1)` |
| properties | opacity, translate ≤ 8 px, scale 0.98–1 only (plus `height` on list rows / alerts via `interpolate-size`) |

| What | Behaviour |
| --- | --- |
| Screen changes (nav, tray tabs, first-run steps) | Outgoing content is snapshotted into an inert, fixed ghost that fades out (120 ms) while the new content fades in with a 6 px rise (180 ms, 40 ms delay). The sidebar, top strip and bottom nav are **reconciled, not rebuilt** — same DOM nodes, only the active pill/colours transition — so chrome never moves or flashes. |
| Now state changes (Auto / Pinned / Paused / Hidden / …) | Same cross-fade of headline, chips, facts and preview. The hero card has a stable `min-height` (380 px desktop) so the page below does not jump; alert banners (Discord closed / companion down) grow in by height instead of popping. |
| Editor drawer, add-rule dialog, backdrops | Enter: opacity + 8 px (drawer slides 8 px in from the right, dialog rises 8 px and scales from .98). Exit mirrors it: `mk-in` is removed, the transition runs, then the node is deleted after `transitionend` (260 ms safety timeout). The page behind is never re-rendered or moved; the layer is `inert` while it leaves, so it never blocks input. |
| Menus, tooltips, toasts, tray mock menu/notice | Pin menu and toast fade + 4–8 px with matching exit; `?` tooltip fades/scales via a class (no `display` flip); tray menu/notice use the same pop-in. |
| Buttons, segmented controls, chips, tiles, art thumbs, nav links | Colour/border/shadow transitions (120 ms) and a `scale(.98)` press (100 ms). Toggle knobs slide (180 ms). |
| App rules / Scene library | New rows grow from height 0 and fade in (220 ms); removed rules collapse + fade out (180 ms) and are deleted afterwards (Undo re-adds with the grow-in); duplicated/new Scenes grow in. Focus moves immediately (to *Add rule* after a removal). |
| Save status | *Saving… → Saved / failed*: dot pops (scale .4→1.25→1) and the text rises 3 px/fades in, colours cross-fade. |
| `prefers-reduced-motion: reduce` | Durations collapse to 1 ms, no translate/scale anywhere, no ghost cross-fade, drawer/dialog/rows/toasts are instant (opacity-only where a class transition remains); exits finish immediately. |

Input is never delayed: handlers run first and update the DOM synchronously, animations are layered on top (ghosts and leaving layers are `pointer-events:none` / `inert`), and focus moves in the same tick (verified: the drawer's name field is focused in the click handler; closing returns focus to the opener while the panel is still fading).

Verification in the Orca tab: after a nav click the sidebar element is the same node at the same coordinates, one ghost exists during the fade and none afterwards; the drawer is in the DOM and focused immediately and is removed after its exit; removing a rule shrinks 14→13 rows after the collapse. Note: the Orca tab does not tick animation frames until a screenshot is taken, so timing was verified by DOM state plus `screens/80-motion-mid-transition-nav-click.png` (not retained).

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


> **Note (capture stopped by the owner):** the last screenshot re-capture (after #29/#30 and the sidebar fix) was stopped before it finished, so `screens/` holds only part of the new set and some older shots may no longer match. Per the new "speed over evidence" rule, review the mockup in the browser (`index.html`); re-capture only for gate G1.
