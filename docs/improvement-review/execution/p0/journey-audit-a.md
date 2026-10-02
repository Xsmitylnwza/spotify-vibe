# P0-A2 — Real-app UX journey audit (core journeys)

Auditor: Sonnet 5.5 (frontend/design reviewer), 2026-10-02. Repo HEAD `0748b44f939b1a2a26b8d2e913d5a64a0be9f376` (branch `improve/flow-ux`, includes 745dceb, 3e477d0, bcda96b). **All 36 screenshots were re-taken on this HEAD**; the 10 PNGs from the interrupted attempt were deleted (older code). Rejected report not used.

## Method, limits (read first)
- Isolated profile (`%TEMP%\vibe-p0-a`, port 47391, autostart disabled), CLI companion for J1–J7, then Electron once (see E-section). Real Discord RPC to the owner account; presence cleared at the end.
- Studio rendered in my own Orca tab. **Viewport:** shots 01–07 emulated 1280×800; later shots are the native Orca pane (≈1246×670 CSS px @1.25 → 1558×838 / 1569×906 PNG) because `set viewport` made `orca click` land at wrong coordinates. Shots named `…zoom055/060` have `document.body.style.zoom` set (read-only view trick) because the capture tool corrupts any page scrolled mid-document (blank/black-offset PNGs; those were deleted). Fade-in mid-states are capture artefacts (DOM opacity stayed 1, 0 animations — checked).
- `orca click` stopped delivering events to the page after I changed window focus (0 pointer events recorded); from J3 on many clicks were DOM `.click()` via `eval` (same handler, no pointer). Typing used `orca fill`. Marked "(DOM click)" where it matters.
- **Discord verification = own user-panel activity line from the Discord accessibility tree only** (no chat/DM/server capture, no screenshot of Discord; one read of ~1000 nodes was filtered to my tokens + the own panel line; the owner display name is not recorded). Details/state lines are **not** exposed in that tree, so Discord-side text equality is verified only for the **activity name**.
- **Verification caveat [observed]:** Discord's own app-detection also publishes a *Playing* activity (panel read "Orca", "Google Chrome", "mspaint", "File Explorer" at different times). When that was present the panel did not show our *Listening* Scene although Studio said "Live" and `lastSuccessAt` advanced. Our *Playing* Scene ("Doodle Hour") showed when pinned. [inferred] Discord ranks Playing above Listening in the panel; I could not prove this without opening the profile card (not allowed).
- Not tested: Thai-language walkthrough (TH toggle click not found by my script), 760px/narrow layout, GIPHY, timers, buttons, settings save, F03/F10 races.
- Tool quirks, not product bugs: first click after reload often lost; refs stale after layout shift.

## Environment / PIDs
Started by me: CLI companion `node` PID 19856 (stopped), Electron main PID 27240 + children 4872, 19760, 42112 (all exited after `/api/quit`), `mspaint` 19400 and `CalculatorApp` 11752 (stopped), one Explorer folder window on the temp dir (closed), a Notepad I opened (PID 47712, closed gracefully with CloseMainWindow; it restored an unrelated owner tab "start.ps1", untouched). I also re-launched `Discord.exe` (existing process 11684) because its window was hidden; no clicks in Discord except one synthetic click on the own-panel profile button (no popup observed). Not touched: 17345/17346, 47396, installed app. Cleanup verification below.

---
## J1 First run — onboarding to first useful state
(localStorage cleared to force first run.)

| # | Screen/route | Owner action | UI does | Discord | Friction | Sev | Shot |
|---|---|---|---|---|---|---|---|
| 1 | `/` → `#/status` + modal | open Studio | Thai onboarding modal over blurred Status; 3 steps: "connect Discord – app ID pre-filled, **one button**", "pick first Scene – 4 samples", "leave it open" [observed] | nothing published | Language defaults to Thai after reset, EN toggle hidden behind modal; copy promises a button/steps that do not exist as actions | Minor | 02 |
| 2 | modal | click **เริ่มใช้งาน (Start)** | closes modal, lands on **Status** (same as Skip) [observed; source `discord-presence-studio.html:3849`] | none | Start ≠ start: no Scene chosen, no "connect" action; page says "Live on Discord – **No matching app**" while Discord shows nothing (N1/M4) | Major | 03, 01 |
| 3 | `#/scenes` | click Scenes, switch EN | library of 4 sample scenes, all tagged "Draft"; first "Editing"; mixed Thai/EN inside "Your apps" panel ("การสลับอัตโนมัติ", "เปิดแอปที่ผูกไว้ Scene…") [observed] | – | "Draft" on saved scenes reads as unsaved; Thai strings in EN mode (NEW-A3, NEW-A6) | Minor | 04, 05 |
| 4 | `#/scenes` detail (in-page, no route) | click Good Morning | editor + Discord preview, badge "Draft — not on Discord yet", button **Show on Discord**; preview avatar "golf.wav / Discord profile inspection" | – | Detail view is not in the URL (reload returns to list) (NEW-A15); pairing tiles are ~110 entries far below (page 6667 px) | Major | 06 |
| 5 | detail | click **Show on Discord** | button → "Update on Discord", badge "Live on Discord", note "This Scene is live · saving updates it automatically" [observed] | own panel: **"Morning Vibe"** (read ≈1–2 min after click) | UI says live ✔ matches; but this is a **1-hour pin** (`studio-server.mjs:622` `+3600000`), never said on this screen (NEW-A1); "Update" vs "saves automatically" contradictory | Major | 07 |

J1: **5 steps, 4 view changes** (modal→Status→Scenes→editor), time-to-confidence ≈ 60–90 s to a visible Live state, but the owner has no idea it expires in 1 h and that nothing is paired to an app yet.

## J2 "What is Discord showing right now, and why?"

| # | Screen | Owner action | UI does | Discord | Friction | Sev | Shot |
|---|---|---|---|---|---|---|---|
| 1 | `/` Status, nothing running | open Studio | "Live on Discord · **No matching app** · Following app, no matching app yet · Pair an app" | no activity (panel empty) | headline claims "Live on Discord" when nothing is shown (M4) | Major | 01 |
| 2 | Status after Show | open Studio | "Live on Discord · Good Morning · Temporarily pinned"; Source "Pinned manually"; Next change "**09:26 · 37:03**" (clock · countdown, unlabeled); stray text "Pinned for 1 hour" under the card [observed] | panel "Morning Vibe" | answers *what* and *why* in one glance ✔; cryptic next-change, orphan line (NEW-A8, NEW-A9) | Minor | 09 |
| 3 | Status, app-follow | open Studio with Chrome/Orca paired | "Good Morning · Following app · Google Chrome is open now · Source: Following app (Google Chrome)" [observed] | panel showed Discord's own "Google Chrome" (native detection), not our Scene | Studio cannot know Discord overrode it; "Live" is Studio's belief only (NEW-A4) | Major | 09b, 27, 37 |

J2: **1 step, 0 view changes**, time-to-confidence ≈ 5 s *for the Studio-side answer*; the Discord side is unverifiable from Studio. The best screen in the app.

## J3 Change text/art of an existing Scene so Discord shows it

| # | Screen | Action | UI does | Discord | Friction | Sev | Shot |
|---|---|---|---|---|---|---|---|
| 1 | Status → Scenes | click Scenes | library; live scene tagged "Pinned for 1 hour" [observed] | – | tag is static text, never counts down | Minor | 11, 16 |
| 2 | library → editor | click scene | editor opens at top | – | on a 5+ scene library the target row can be below the fold | Nit | – |
| 3 | editor | type Main line | preview updates instantly with outline; server config + `presence.details` changed <1 s (API) [observed]; pill "Everything saved" | detail text not readable via a11y [not observed] | autosave live-publish is great; but button still reads "Update on Discord" | Minor | 12 |
| 4 | editor | change Activity name → "Planning Hour" | preview "LISTENING TO PLANNING HOUR"; `lastSuccessAt` advanced ≈40 s later than previous (only change events) | panel **"Planning Hour"** [observed] | none | – | 13 |
| 5 | art | not exercised (GIPHY not configured; built-in art only) | – | – | – | – | – |

J3: **3 steps, 2 view changes**, time-to-confidence ≈ 15 s (preview) + Discord confirmation only if native app detection is not active. Note: my first attempt edited the wrong Scene because the pointer landed on the neighbour row — a stray click silently edits and **publishes** another Scene (autosave) with no undo (NEW-A18, Minor).

## J4 New Scene, pair with a running app, switch focus

| # | Screen | Action | UI does | Discord | Friction | Sev | Shot |
|---|---|---|---|---|---|---|---|
| 1 | library | **+ Add Scene** | immediately persists "New Scene 5" with placeholder "Playing · Vibe Presence · *Just created this Scene / Setting things up…*", "V" art; opens editor, name field focused (5 scenes on server at once) [observed] | none until paired/shown | placeholder text is real config: if paired it goes live as is (NEW-A16) | Minor | 14 |
| 2 | editor | rename + 3 text fields | autosave; "Everything saved" | – | no Cancel/discard for an unwanted new Scene | Minor | 15 |
| 3 | editor, pairing section | search "paint" | **"No app named paint"** — Paint was launched after Studio loaded; running list is stale until **page reload**, and reload drops the editor back to the list [observed] | – | lost context + hidden dependency on reload (M6, NEW-A15) | Major | 16 |
| 4 | editor | after reload: Edit scene, search, click tile "mspaint · In use" | tile → "Bound to this scene", feedback "Bound mspaint to this scene", badge **Live on Discord** [observed] | server: Paint Time live; panel read **"mspaint"** (native), not "Doodle Hour" | pairing instantly cancelled the 1 h pin of Good Morning (`manualOverride` null; M2) without telling | Major | 18, 19 |
| 5 | library | back | paired apps shown as tiny unlabeled icons next to the Live tag; copy not in list otherwise [observed] | – | icons have no text/tooltip in the list view | Minor | 20 |
| 6 | OS | foreground Paint ↔ Chrome (programmatic) | server switched Scene in **0.5–1.3 s** (3 transitions measured) | with non-detected apps (Orca ↔ File Explorer): Explorer fg → server "Paint Time/Doodle Hour" lastOk 02:50:00; panel then read "Orca"/"File Explorer" (native) | switching works; verification confounded (see caveat) | – | 27, 37 |
| 7 | pairing | Task Manager / Windows Settings tile | Task Manager pairs but is **never detected** (elevated), Windows Settings tile appears/disappears between loads [observed API `/api/apps`] | – | UWP/elevated apps silently never match; no hint (F12/M6) | Major | 21 |

J4: **≈7 steps, 3 view changes (+1 forced reload that drops the editor)**, time-to-confidence ≈ 3–4 min (mostly the stale-list detour).

## J5 Re-pair / unpair

| # | Screen | Action | UI does | Friction | Sev | Shot |
|---|---|---|---|---|---|---|
| 1 | editor of Scene B | search "chrome"; tile reads **"Google Chrome · Bound to Good Morning"**; click | one click moves it: feedback "Moved Google Chrome from Good Morning"; API shows mapping now → Paint Time [observed] | clear and quick ✔; no undo, mapping move is silent for Scene A's own page | Nit | [observed via DOM snapshot text + API; shot 22 shows the editor state only] |
| 2 | same | click a bound tile | "Unbound mspaint" (API confirms) | unbind is the same click as bind (toggle) — fine, but result is only a transient message | Nit | 21 |
| 3 | Scene bound to nothing | – | Status says "Following app · no matching app yet · Pair an app" even though Orca (paired) is foreground *when paused* | contradictory copy (M4) | Minor | 26 |

J5: 3–4 steps, 0 view changes if you stay in the editor, time-to-confidence ≈ 20 s. **Best flow in the product** besides J2.

## J6 Pin, pause Auto, resume, hide/clear

| # | Screen | Action | UI does | Discord | Friction | Sev | Shot |
|---|---|---|---|---|---|---|---|
| 1 | Status → "Show another Scene" | click | navigates to Scenes list (no picker) | – | pinning a Scene = Status → Scenes → editor → Show = 3 clicks, 2 view changes | Major | 23 |
| 2 | editor | Show on Discord (Paint Time) | server `src=override`, override expiry = +1 h; Status "Paint Time · Temporarily pinned · Pinned manually · **10:53 · 58:39**, Unpin / Pause" | panel **"Doodle Hour"** (Playing) ✔ | countdown format unlabeled; orphan line "Pinned for 1 hour" | Minor | 24, 25 |
| 3 | Status | **Pause all auto-switching** | pin silently dropped (`override=null`), `src=paused`, Discord keeps "Doodle Hour"; page: "Source: Auto-switch is paused" but also "Next change: While your app is open" and "Following app · no matching app yet" with Orca focused [observed] | unchanged ("Doodle Hour") | Pause = cancel pin (undisclosed); contradictory lines (M4) | Major | 26 |
| 4 | Status | **Resume auto-switch** | `src=app`, Scene follows foreground app (Good Morning/Planning Hour) in <3 s; headline "Following app · Orca is open now" ✔ | panel "File Explorer" (native), not "Planning Hour" | Studio "Live", Discord disagrees (NEW-A4) | Major | 27 |
| 5 | Settings (bottom, below fold) | **Clear** ("Stop & clear – Pause auto-updates until resumed") | presence cleared and **auto-switch paused** (`active=false, src=paused`); Status then shows "Live on Discord · **No matching app**" + Resume button [observed] | panel: **no activity** ✔ | the only "hide" lives at the bottom of Settings, is a pause in disguise, and the pause **persisted across a full restart** (Electron run read `paused` from the same config) (NEW-A2); Status still says "Live on Discord" (M4) | Major | 29, 31 |

J6: **Pin 3 steps / 2 view changes; pause 2; resume 1; clear 3 (Status→Settings→scroll→Clear)**; time-to-confidence ≈ 30 s each, but pause/clear states leave the owner believing different things than Discord shows.

## J7 Duplicate and delete (incl. a Scene paired to an app)

| # | Screen | Action | UI does | Discord | Friction | Sev | Shot |
|---|---|---|---|---|---|---|---|
| 1 | library | **Duplicate** (acts on the *Editing* scene) | "Paint Time (copy)" appended at the bottom, selected "Editing"; **app mappings not copied**; no toast, new row can be off-screen [observed] | – | silent, target implicit | Minor | 32 |
| 2 | library | **Delete Scene** on the copy | confirm dialog "Delete Scene "Paint Time (copy)"?", buttons **ยกเลิก** / Delete Scene (Thai Cancel hard-coded at html:3883) [observed] | – | Thai button in EN UI (NEW-A12); dialog same for every Scene | Minor | 33 |
| 3 | library | Delete **Paint Time** (paired + live) | same generic dialog, **no mention of the paired app / live status** (M1/F04) [observed] | – | – | Major | 34 |
| 4 | library | confirm | library shows the Scene **gone** within ~1 s; server still has it and the mapping; DOM holds error "An application references a missing preset. Remove or reassign its mapping first" and savebar "Save failed / Save now", both in the hidden editor (savebar width 0) [observed API + DOM] | still showing Paint Time while Explorer fg | **UI says deleted, Discord/server disagree, failure invisible** | **Blocker** (truth-state) | 35 |
| 5 | reload | reload | the "deleted" Scene is back, tagged Live [observed] | – | draft lost silently | Major | 36 |

J7: 4–5 steps, 0 view changes, time-to-confidence: never (state is wrong).

## E Electron (differences, one run)
- With a separate `--user-data-dir` the app started (main PID 27240 owns the 47391 listener, per 3e477d0); window title "Vibe Studio" captured with `PrintWindow` (the `orca computer` screenshot returned the Orca window, deleted) → shot **38**: fresh profile shows the same Thai onboarding modal [observed].
- Closing the window (WM_CLOSE) leaves process + server running (background companion; tray not inspected) [observed]. `POST /api/quit` ended **all 4 electron PIDs and the listener within 6 s** [observed] — the earlier "Electron stayed alive" F16 evidence no longer reproduces on this HEAD.
- HKCU Run has no `electron.app.Electron` value after the run. Tray menu not captured (not attempted).

---
## (1) Top 10 frictions for a set-and-forget owner
1. **Deleting a Scene that has an app mapping looks successful, silently fails server-side and reappears after reload; failure text lives in a hidden editor** — J7-4/5 [observed] (F04/M1/M5). Blocker.
2. **"Show on Discord" is an undisclosed 1-hour pin** — owner walks away, Discord reverts to nothing/app-follow after 1 h (`studio-server.mjs:622`); copy says only "Live" and "saving updates it automatically" — J1-5, J6-2 (NEW-A1). Major.
3. **"Live on Discord" headline shown when nothing is on Discord** (first run "No matching app", after Clear, when Discord's own detected app wins) — J1-2, J2-1/3, J6-5 (M4, NEW-A4). Major.
4. **Pause and Pairing silently cancel the pin; Clear is a persistent pause** that survives restart and hides at the bottom of Settings — J4-4, J6-3/5 (M2, NEW-A2). Major.
5. **Running-app list is stale until page reload, and reload drops the editor back to the list** — J4-3 (M6, NEW-A15). Major.
6. **Pairing section is a 110-tile wall (page 6667 px) incl. "Uninstall…", "Reload Configuration", "dfrgui"; elevated/UWP apps (Task Manager, Settings) pair but never match** — J1-4, J4-7 (F12/M6). Major.
7. **Onboarding "Start" goes nowhere useful**; promises one-button connect and pick-first-Scene — J1-2 (N1). Major.
8. **Pinning needs Status → Scenes → editor → Show (3 clicks, 2 page changes);** no pin from Status — J6-1. Major.
9. **Mixed languages in EN UI** (Thai section titles, "ยกเลิก", "ไม่บังคับ") and "Draft" label on saved Scenes — J1-3, J7-2 (NEW-A3/A6/A12). Minor.
10. **Cryptic/contradictory Status copy**: "Next change 10:53 · 58:39", orphan "Pinned for 1 hour", "Next change: While your app is open" while paused — J2-2, J6-3. Minor.

## (2) UI said saved/live/applied but Discord/server disagreed
- J7-4: "deleted" in library; server kept Scene + mapping; failure invisible [35, 36].
- J6-5/J1-2: "Live on Discord · No matching app" with nothing in Discord [01, 31].
- J6-4: Status "Live · Good Morning · Following app" while Discord's own panel showed a native activity ("File Explorer"/"Google Chrome") instead of the Scene [27, 09b]. [inferred cause: Discord ranking]
- J4-4: "Live on Discord" after pairing while panel read native "mspaint".
- J6-3: pause hides a lost pin: Status shows no pin, Discord holds last text.
- Pin label "Pinned for 1 hour" never decrements (list tag, [11, 16]).

## (3) Bugs reproduced → mapping
| ID | Finding | Mapping | Evidence |
|---|---|---|---|
| A-1 | Delete paired Scene: optimistic remove, server rejects, resurrects, error hidden | **F04 / M1 / M5 / F17** reproduced | 34–36, API |
| A-2 | Pair app cancels pin; Pause drops pin | **M2** reproduced | 18, 26, API `override` |
| A-3 | Status says Live / "no matching app" inconsistently | **M4** reproduced | 01, 26, 31 |
| A-4 | App list stale until reload | **M6** reproduced | J4-3 |
| A-5 | Skip/Start identical; onboarding promises | **N1** reproduced | 02–03 |
| A-6 | Elevated/UWP apps never detected / list flaps | F12-adjacent (detector work in flight by Codex, not diagnosed) | API |
| NEW-A1 | Show on Discord = silent 1 h pin | new | `studio-server.mjs:622`, 07, 25 |
| NEW-A2 | Clear = pause that persists across restart; only in Settings bottom | new | 29, 31, Electron run |
| NEW-A3 | Thai strings in EN UI (Your apps panel, pairing section, "ไม่บังคับ") | new (M10-adjacent) | 05, 18, 33 |
| NEW-A4 | Discord native app detection hides Listening Scene; Studio claims Live | new (verification gap) | panel reads |
| NEW-A5 | `Auto-switch Scene by` is a combobox with one option ("App mode") | new | snapshot (j1) |
| NEW-A6 | "Draft" tag on saved Scenes | new | 04 |
| NEW-A8 | "Next change 09:26 · 37:03" unlabeled | new | 09, 25 |
| NEW-A9 | orphan "Pinned for 1 hour" under Status card | new | 09, 25 |
| NEW-A10 | Absolute `C:\Users\…\secrets.json`/config path shown in Settings | new, Minor | 28, 29 |
| NEW-A11 | CLI banner "Daily Time Slots keep running after the browser closes" (removed feature) | new, Nit | server stdout |
| NEW-A12 | Hard-coded Thai "ยกเลิก" Cancel (`html:3883`), Settings "Clear" button label `ล้าง` source | new | 33 |
| NEW-A13 | Duplicate drops mappings, no feedback, bottom-of-list | new | 32 |
| NEW-A15 | Editor not in route; reload loses it | new (M7-adjacent) | 23 |
| NEW-A16 | Add Scene persists placeholder text immediately | new | 14 |
| NEW-A18 | Mis-click autosaves/publishes into another Scene, no undo | new | J3 note |

## (4) What works well — keep
- Status card: one glance answers what / why / source (09, 25, 27, 37) — `Following app (Orca)`.
- Instant live preview with "Updates as you type" + autosave publishing within ~1 s (12, 13).
- Pairing tile feedback ("Bound/Unbound/Moved … from Good Morning") and one-click move between Scenes (J5).
- App-follow switching measured 0.5–1.3 s (J4-6); Clear really removes the Discord activity (J6-5).
- Resume restores app-follow immediately; reduced scope (no schedule UI) makes pages simple.
- Light theme renders cleanly (37); Electron owns its listener and `/api/quit` now exits all processes.

## Cleanup (verified)
Stopped PIDs: node 19856; electron 27240, 4872, 19760, 42112 (exited via `/api/quit`); mspaint 19400; CalculatorApp 11752; Notepad 47712 (graceful). Explorer temp window closed. `Get-NetTCPConnection -LocalPort 47391 -State Listen` → 0. Discord own panel read after cleanup: no activity. `%TEMP%\vibe-p0-a` deleted (`Test-Path` False). HKCU Run: no `electron.app.Electron`. Orca tabs closed.

Screenshots: `screens-a/` (36 PNG, all viewed after saving; dimensions vary as noted). Discord evidence is text-only (own-panel activity line) by privacy rule.
