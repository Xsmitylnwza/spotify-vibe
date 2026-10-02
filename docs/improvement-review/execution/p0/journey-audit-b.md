# P0-B2 — Journey audit B (J8–J15: settings, lifecycle, responsive, language/theme, keyboard, recovery)

Auditor: Sonnet 5.5 (frontend/design reviewer), read-only. Date 2026-10-02.
Repo HEAD at run: `0748b44f939b1a2a26b8d2e913d5a64a0be9f376` (branch improve/flow-ux). Working tree was dirty (another worker was editing `scripts/studio-server.mjs`, `windows-apps.*`); my companion ran from that working tree.
Setup: isolated `%TEMP%\vibe-p0-b` config/secrets, port 47392, `PRESENCE_AUTOSTART_DISABLE=1`, `PRESENCE_DISABLE_DEFAULT_APPLICATION=1` → **Discord never connected** (every screen is the "not connected" state: no App ID, no live scene). A fake key `FAKEKEY-notreal-000000` was used and cleared; no real key, no real profile read.

Evidence tags: **[observed]** = I saw it (PNG ref `NN` = file `screens-b/NN-*.png`, all in `execution/p0/screens-b/`), **[source]** = file:line, **[inferred]**, **[not observed]**.

**Older-code screenshots.** `01`–`21` were taken 2026-10-01 21:19–21:42, i.e. before commits 745dceb / 3e477d0 / bcda96b / 0748b44 (server persistence, Electron lifecycle). The renderer files (`discord-presence-studio.html`, `studio-ci.css`) have not changed since 2904f32 (2026-10-01 16:22), so those captures are still valid for UI. Screenshots `30`+ were taken on HEAD above. I viewed every kept PNG; blank/invalid ones were deleted (old GIF-modal capture was an empty dark frame; two 768-wide captures; two of my own were mid-fade or duplicates; two Electron captures that included the Orca window were deleted unsaved/unused).

**Tool limits (so nothing is over-claimed).**
- `orca click` on an element below the fold silently does nothing (e.g. Search GIPHY, Save keys in one attempt) — those steps used JS `.click()`/`focus()`; keyboard steps were real key events.
- `orca keypress` only reaches the page right after an in-page click; any `eval`/screenshot between keys drops focus. Key sequences were therefore done in bursts and read back once. Escape/Enter on Electron dialogs: `window_not_focused` → [source] only.
- 768×1024 captures show the real page for ~905 px and then a duplicated top strip (capture artifact, not an app bug).
- "200% zoom" = emulated 640×400 CSS-px viewport (1280×800 ÷ 2); no real browser zoom control was available.
- Electron window shots are screen-region grabs of the window rect; I forced my own window topmost, cropped 12 px edges and re-viewed each (first two grabs showed other windows and were deleted).
- **Tray icon: not observed.** Neither UI Automation of the taskbar nor of the hidden-icons overflow listed a Vibe/Electron icon, so tray menu items are [source] only.
- Live Discord / "Show on Discord" / Live Scene states not testable (RPC disabled by task).

---
## J8 Settings — language, theme, connection ID, GIPHY key
| # | screen | action | result | friction | sev | shot |
|---|---|---|---|---|---|---|
| 8.1 | any | find language + theme | TH/EN segmented control + moon button live at the **bottom of the sidebar** (desktop ≥~800 px). Not in Settings. [observed] | Owner looking for "language" inside Settings won't find it; both controls vanish below ~800 px (see J11). | Major | 10-status-1280, 13 |
| 8.2 | any | click TH / EN | Whole UI re-renders; choice persisted (`vibe.lang`). [observed] | Re-render leaves Thai strings in EN (J12). | – | 03, 05 |
| 8.3 | any | click theme toggle | Light/dark switch persisted (`vibe.theme`). [observed] | Light theme has contrast defects (J13). | – | 14–17 |
| 8.4 | Settings | open with no ID | Two status pills "Required · not set yet", "Optional · not set yet"; field placeholder "17–20 digit ID"; helper "**A starter ID is already filled in — this field is only for switching to your own**". [observed] | Helper is **untrue**: field is empty and pill says Required. (True only when the default app is enabled; I disabled it, but the same state occurs whenever the default is missing.) Top banner also says "add your application ID". | Major | 12-settings-1280, 31 |
| 8.5 | Settings | type `12345` + Save | Red inline error "Discord Application ID must be a 17–20 digit number…" [observed 06; HTTP 400 re-verified on HEAD via API]. Draft stays in field. | Error is good; no hint where to find the ID. | Nit | 06 |
| 8.6 | Settings | type fake GIPHY key + Save keys | Green "Keys saved — you still need your Discord application ID"; pill → "Set · app-secret" after reload. [observed 20 old code, 31 HEAD] | Immediately after Save (HEAD, 30) the pill still read "Optional · not set yet" for >5 s until reload — [observed 30]. Note: my first two UI save attempts did not persist (secrets file stayed empty) although the first showed "Keys saved"; later I saved via API. Cause unproven (tool click vs. app) → **[not conclusive]**, recorded as NEW-B9 to re-test by hand. | Major | 30, 31, 20 |
| 8.7 | Settings | placeholder after key set | still "Paste a free key" though source (`discord-presence-studio.html:2530`) intends "leave empty to keep"; helper text carries it. [observed] | Minor inconsistency | Nit | 31 |
| 8.8 | Settings | Clear GIPHY key | Cleared via PUT (API) and verified in secrets file; UI path not separately captured. | – | – | – |
| 8.9 | Settings (browser) | "Start with Windows" | Disabled, "Windows only · auto-start isn't supported on this system". [observed] | On Windows the line is false; caused by my `PRESENCE_AUTOSTART_DISABLE=1` — copy should say "disabled by environment". Electron shows a different single toggle (J10). | Minor | 06, 12 |
| 8.10 | Settings | Quit companion (browser) | See J10.7. | | | 63, 64 |

## J9 GIF/artwork picker
| # | screen | action | result | friction | sev | shot |
|---|---|---|---|---|---|---|
| 9.1 | Scene detail → Scene artwork | open "Search GIPHY" with **no key** | Centered dialog "Find a GIF for the main artwork" + "**GIF search isn't connected yet** — Add a GIPHY key in settings … or paste your own HTTPS GIF link" + "Go to Settings". [observed] | Good: tells the next step. Page behind dims; close button in top-right. | – | 19 |
| 9.2 | same | open with **fake key** | Headline unchanged "GIF search isn't connected yet", body "GIF search needs a valid GIPHY key in settings", no loading spinner state caught. [observed] | Headline says *not connected* although a key **is** set and was rejected — misleading; user is sent to Settings where the pill says "Set". No "retry"/"key rejected" distinction. | Major | 32 |
| 9.3 | dialog | visible close label | Close button text reads **"Off"** (aria-label "Close GIF search"). [observed, DOM + 32] | Mistranslated visible label (Thai "ปิด" → "Off"); label-in-name mismatch. | Major | 32 |
| 9.4 | dialog | keyboard | Enter on focused Search GIPHY → opens, focus lands on close button; Tab cycles *Go to Settings ⇄ Off* (trapped); **Escape closes and focus returns to Search GIPHY**. [observed] | Works as designed (source 2465–2487, 3088–3092). Focus ring on close visible. | – | 34 (mid-fade) |
| 9.5 | dialog | fade-in | Dialog and page dim fade ~0.5 s; captures taken early show ghosted text. [observed 32 first attempts, 34] | Nit. | Nit | 34 |
| 9.6 | empty/loading/error states with a *valid* key | – | **[not observed]** (no real key allowed). [source] `searchGifs` handles empty/"load more"/retry (html:2644–2716). | Cannot judge. | – | – |
| 9.7 | status regions | after dialog closes | Hidden live regions keep stale text "Loading trending GIFs…" and "The local companion is not responding" in the DOM `role=status`. [observed, DOM text] | Possible stale screen-reader announcements. | Minor | – |

## J10 Desktop lifecycle (Electron dev, `--user-data-dir=%TEMP%\vibe-p0-b\electron-user-data`)
Launch: `node_modules\electron\dist\electron.exe . --user-data-dir=…` (npx shim failed under Start-Process). Sentinel `vibe-electron.json` created first. Main PID **35996**, children gpu 40864, utility 26676, renderer 17660. Port 47392 listener = **35996** (server runs in the main process). `HKCU\…\Run` had **no** `electron.app.Electron` value before/after. [observed]
| # | screen | action | result | friction | sev | shot |
|---|---|---|---|---|---|---|
| 10.1 | window | first run, fresh profile | Frameless window with in-page onboarding dialog "เริ่มใช้งาน Vibe Studio" (Thai, language not remembered from browser). [observed] | Onboarding promises "App ID already filled in" while Settings says Required (same untrue copy as 8.4). | Minor | 70, 71 |
| 10.2 | titlebar | minimize | `IsIconic=True`; window restored via script. [observed] | – | – | – |
| 10.3 | titlebar | maximize / restore | window rect 1619×996 → 1938×1004 @(-9,25) → back. [observed] | Control labels exposed to AT in OS language (Thai) regardless of app language. | Nit | 71 |
| 10.4 | titlebar | close (X) | Window **hidden, not closed**: `IsWindowVisible=False`, all 4 PIDs alive, server still answering HTTP 200 and listener still 35996. [observed] | Close-to-tray is the behaviour. Because the tray icon could not be found (see top), an owner may have a running app with no visible way to reopen. Settings text says "closing keeps it in the system tray — right-click the icon to quit" [observed 75]. | Major (inferred risk) | 72, 75 |
| 10.5 | reopen | launch same exe/profile again (single instance) | Second process exits (code 0) and the hidden window becomes visible again. [observed] | OK reopen path. Tray left/double-click and menu **[not observed]**; [source] menu = "Open Vibe Studio / Check for updates / version / Quit Vibe Studio", **English only** (`electron/main.js:110–129`). | Minor | – |
| 10.6 | Settings (Electron) | app section | "แอป Vibe Studio — เวอร์ชันเดสก์ท็อป — ทำงานเบื้องหลังเงียบๆ", v1.0.7, "Check for updates", "Start with system — open hidden at every login" toggle, then Companion section. [observed] | Update area exists only in Electron, near the bottom. | – | 75 |
| 10.7 | Settings | Check for updates (dev, unpackaged) | Status line "**เป็นเวอร์ชันล่าสุดแล้ว · ตรวจเมื่อ 09:00**" (up to date, checked 09:00). [observed] | **Untrue**: `checkForUpdates` returns immediately when `!app.isPackaged` (`main.js:167`) — no check occurred. Packaged update states (available/downloading/error) **[not observed]**. | Major | 75 |
| 10.8 | Settings | Quit → confirm dialog | Dialog "ออกจาก Vibe Studio? … companion จะหยุดทำงาน" with ยกเลิก / ออกเลย. Escape handling [source html:1413], not observed in Electron. [observed 76] | Good: names the consequence. | – | 76 |
| 10.9 | Settings | confirm Quit | Within **≤1 s**: all four electron PIDs gone, port 47392 free, no leftover processes (sampled at 1/2/4/8/15 s). Run key unchanged. [observed] | **Quit really stops the companion on dev HEAD.** (Coordinator's installed-app failure is the pre-3e477d0 behaviour, F16 — not reproduced here.) | – | – |
| 10.10 | Settings (browser/CLI) | Quit → confirm | CLI companion PID 47320 exited; UI showed only a transient "Companion stopped" toast. After it fades the page looks unchanged and the sidebar still says "**Discord offline · retrying**" and "**companion runs in the background**". [observed] | Misleading end state after Quit; no "companion stopped — start it again" banner on Settings. | Major | 63, 64 |

## J11 Responsive (dark, EN). Breakpoint measured: sidebar → bottom nav between 760 and 820 px.
| # | viewport | screen | result | friction | sev | shot |
|---|---|---|---|---|---|---|
| 11.1 | 390×844 | Status | Banner + "Discord offline" pill + bottom tab bar; cards stack; page scrolls (document is the scroller; no inner scrollers). Last button ("Pause all auto-switching") sits under the bottom bar until scrolled. [observed] | Banner + pill + tab bar ≈ 40 % of height. | Minor | 10-status-390 |
| 11.2 | 390×844 | Scene detail | "Back to Scene library" and "Show on Discord" wrap into two tall buttons; form stacks. [observed] | Hefty header; "Everything saved" toast floats over fields. | Minor | 11-scene-detail-390 |
| 11.3 | 390×844 | Settings | Stacked; all key fields reachable; Quit reachable at bottom. [observed] | **Language and theme controls do not exist at this width** (sidebar hidden; nothing in Settings or the bottom bar) → Thai owner on a narrow window cannot switch language or theme. DOM check at 760/700/660/640 px: `#langSeg` and theme toggle not rendered. | **Major** | 12-settings-390, 13 |
| 11.4 | 768×1024 | Status / Settings / Scene detail | Sidebar rail still shown; no horizontal overflow (`scrollWidth 753 ≤ 768`); no inner scroller. Scene detail document height **8 767 px** (app-pairing grid lists every installed Start-Menu item). [observed] | Very long page; pairing grid dumps hundreds of tiles incl. "Add a new dco-win virtual network adapter", "Administrative Tools". | Minor | 40-status, 40-settings, 41 |
| 11.5 | 1280×800 | all | reference layout; sidebar fixed, content column ≤ ~900 px, preview card right of form. [observed] | – | – | 10/11/12-…-1280 |
| 11.6 | 1440×900 | all | Same as 1280, extra margin only; content does not widen. [observed] | Nit: wasted width. | Nit | 10/11/12-…-1440 |
| 11.7 | 640×400 (≈200 % zoom) | Status, Settings, Scene detail | Bottom nav shown, language/theme absent (as 11.3). Banner + pill + nav leave ≈ 55 % of height for content; toast "Everything saved" **overlaps "Show on Discord"** button. No horizontal overflow. [observed] | Cramped; toast covers the primary action. | Major | 42-status, 42-settings, 42-scene-detail |
| 11.8 | all | which element scrolls | Always the **document** (`scrollingElement`); zero nested scrollers except the GIF results list. In Electron the sidebar and banner scroll away with the page on long Settings (75: sidebar header gone), so nav is not reachable without scrolling back up. [observed] | Minor. | Minor | 75 |

## J12 Thai vs English
| # | screen | action | result | friction | sev | shot |
|---|---|---|---|---|---|---|
| 12.1 | Settings (draft) | typed `12345` / key, switched TH↔EN | Field values preserved; page and scroll kept. [observed] | – | – | 05, 06 |
| 12.2 | Scene detail | typed " DRAFT" into Main line (autosaved to disk within 3 s — verified in config), switched EN→TH | Value, detail view and preview retained; focus moves to the clicked TH button (normal) — **no data loss**. [observed] | Autosave means a *typo is live-saved* silently; "Everything saved" is true here. | – | 35, 36 |
| 12.3 | Status (EN) | server error | Alert "ใส่ Discord Application ID ที่ API keys เพื่อเชื่อมต่อ" shown in Thai in EN (string comes from the server, `runtime.lastError`). [observed DOM+API] | Server-supplied Thai-only text. | Minor | – |
| 12.4 | Status (EN) | companion down | "companion ในเครื่องไม่ตอบสนอง" Thai in EN. [observed] | Same. | Minor | 60, 21 |
| 12.5 | Scenes / detail (EN) | headings | "แอปที่ผูกกับ Scene นี้", "การสลับอัตโนมัติ" eyebrow, "เปิดแอปที่ผูกไว้…" Thai in EN; GIF dialog/confirm "ยกเลิก" Thai Cancel inside English dialog; "Off" for Close. [observed] | Untranslated/mistranslated strings in EN mode. | Major (cumulative) | 08, 18, 41, 63 |
| 12.6 | TH mode | long labels | Thai labels fit; nav "Scenes" and "Companion" stay English by design; Thai sidebar section label "เมนู" has its top vowel clipped by line-height. [observed] | Nit. | Nit | 03, 36 |
| 12.7 | `<html lang>` | load with `vibe.lang=en` | `document.documentElement.lang` stays `th` on load (static `<html lang="th">`, html:2) and only updates on a language click. [observed] | Screen readers read English UI as Thai. | Minor | – |
| 12.8 | Electron | first run | Thai onboarding regardless of OS/browser pref. [observed] | – | Nit | 70 |

## J13 Light vs dark (Status, Scenes list, Scene detail, Settings; Thai not rechecked in light)
| # | screen | result | friction | sev | shot |
|---|---|---|---|---|---|
| 13.1 | Status light | Readable, warm banner. | – | – | 14 |
| 13.2 | Scenes list light | Readable; secondary lines pale but legible. | Nit | Nit | 15 |
| 13.3 | **Scene detail light** | Preview card: username "golf.wav", "Discord profile inspection" and **"Starting the day slowly / Coffee · fresh air · good music" are near-invisible (white on light card, computed ratio 1.0:1)**. [observed + computed] | The very thing the owner edits (the preview) is unreadable in light theme. | **Major** | 16 |
| 13.4 | Settings light | Secrets file path text ≈ **2.1:1** (rgb 168 on 243) — fails AA. [observed + computed] | Minor | Minor | 17 |
| 13.5 | Dark | Red "Clear" / "Delete Scene" ≈ 3.6:1 at 13 px (computed) — below AA. All other dark screens fine. | Nit | Nit | 12-…, 07 |
| 13.6 | scan caveat | My generic contrast scan mis-reads layered sidebar backgrounds, so only 13.3–13.5 (visually confirmed) are claimed. | – | – | – |

## J14 Keyboard-only
| # | screen | action | result | friction | sev | shot |
|---|---|---|---|---|---|---|
| 14.1 | Status | Tab from top | 1 Skip link (appears at 12,12, 128×40, visible) → 2 banner **Settings** button → Status, Scenes, Settings → TH, EN → theme → collapse menu → page links (Go to settings, Pair an app, Pause, Show another Scene, walkthrough). Every stop has a solid ~1.6 px outline. [observed] | Banner button precedes the nav; order Status → Scenes → Settings fine. | – | 50 |
| 14.2 | any | Enter on skip link | `href="#main"` triggers `hashchange` → router sends unknown hashes to **Status** (`navigateStudio`, html:3340–3345). Verified from `#/settings`: hash became `#/status`. [observed] | Skip link **navigates away** instead of skipping (F18/M7). | **Major** | – |
| 14.3 | Scenes | open scene (click) | Focus moves to the detail title `h2#editorTitle`. [observed] | Good. | – | – |
| 14.4 | Scene detail | "Back to Scene library" | Focus stays on the now-hidden `h2` (BODY effectively) – not returned to the scene row. [observed] | Keyboard user loses place. | Minor | – |
| 14.5 | Scene detail | browser Back | Goes to Status (detail is not a history entry; Scenes list skipped). [observed] | M7. | Minor | – |
| 14.6 | GIF dialog | see 9.4 | Esc closes, focus returns, trap works. | – | – | 34 |
| 14.7 | Quit confirm | Escape | Dialog closes (browser). Focus return inconclusive (opened by script). Electron Esc [not observed]. | – | – | 63 |
| 14.8 | Tab → Scene detail → Settings full chain | **[not completed]** keyboard automation unreliable (see Tool limits). | – | – | – |

## J15 Error / recovery (companion stopped while Studio open)
Timeline on HEAD (CLI companion PID 14860 killed with Studio on Status): [observed]
| # | t | UI | friction | sev | shot |
|---|---|---|---|---|---|
| 15.1 | +3 s … +25 s (and still after 30 s) | Status shows a **bare row "companion ในเครื่องไม่ตอบสนอง"** (Thai, EN mode) *above the unchanged "Live on Discord / No matching app" card*; sidebar says "Discord offline · retrying" and "companion runs in the background". | UI blames *Discord*, not the dead companion; "Live on Discord" card stays; no restart hint; no spinner. | **Major** | 60 |
| 15.2 | click Pause while down | Toast/status "The local companion is not responding"; button remains enabled. (hidden text; capture identical to 60, removed.) | Actions allowed but fail afterwards. | Minor | – |
| 15.3 | Restart companion (PID 34780), **no reload** | Within ≤3 s: alert row disappears and the normal "Add your Discord application ID…" row returns. Polling recovers by itself. [observed] | Good. Stale hidden status strings remain (9.7). | – | 62 |
| 15.4 | Quit via UI (CLI) | See 10.10. | | Major | 64 |

---
## Top 10 frictions (owner = set-and-forget)
1. **Scene detail preview unreadable in light theme** (13.3).
2. **Language/theme controls absent below ~800 px** (11.3, 11.7) – narrow/zoomed window cannot switch language.
3. **Skip link goes to Status** (14.2).
4. **Companion-down state blames Discord, keeps "Live on Discord" card, Thai text in EN** (15.1).
5. **After Quit (browser) the page still says "companion runs in the background"** (10.10).
6. **"Up to date" shown although no update check ran (dev/unpackaged)** (10.7).
7. **"A starter ID is already filled in" next to an empty Required field** (8.4, 10.1).
8. **GIF dialog headline "isn't connected" when a key is set but rejected; Close button reads "Off"** (9.2, 9.3).
9. **Close-to-tray with no tray icon discoverable** (10.4) – owner may think app quit/hung.
10. **Mixed-language strings in EN** (Thai headings/Cancel/server errors) (12.3–12.5); 200 % zoom toast covers "Show on Discord" (11.7).

## Untrue / misleading UI states
- "Live on Discord · No matching app" while Discord not connected and while companion is dead (60, 21).
- "Waiting for Discord · Evening Vibe" chip names a *schedule-chosen* scene (Evening Vibe / Good Morning varied between runs) although schedule is out of scope; "Draft" chip on stored scenes (07, 08).
- "A starter ID is already filled in" (8.4).
- "Windows only · auto-start isn't supported on this system" on Windows (8.9).
- "Everything saved" + hidden "Save now" button in DOM while companion down (60 DOM) [observed text].
- Update "Up to date · checked 09:00" in an unpackaged build (75).
- Sidebar "companion runs in the background" after Quit/crash (64, 60).
- Right after "Keys saved" the GIPHY pill still "not set yet" (30).

## Bugs → IDs
| finding | ID |
|---|---|
| Skip link navigates, Back from detail loses focus/history, modal/focus contract gaps | F18 / ux M7, M8 |
| Companion-down copy, hidden-editor feedback, stale status strings | F17 / ux M5 |
| "Live on Discord" with no Discord / dead companion | ux M4 |
| Light-theme preview + secrets-path contrast; dark red 3.6:1 | F19 / ux M10 |
| Language/theme missing on narrow, bottom-nav overlap, no clear scroll owner | F19 / ux M11 |
| Starter-ID copy | ux N4 |
| Quit / tray / startup ownership — **Quit verified fixed on HEAD (dev Electron)**; tray unverified | F16 (verify packaged) |
| NEW-B1 | Close button visible text "Off"; label-in-name mismatch (9.3) |
| NEW-B2 | GIF dialog headline "not connected" when key rejected (9.2) |
| NEW-B3 | `<html lang>` not synced on load (12.7) |
| NEW-B4 | Server-supplied Thai-only `lastError` and "companion ในเครื่อง…" strings shown in EN (12.3, 12.4) |
| NEW-B5 | Update status "up to date" when check skipped (10.7; main.js:167) |
| NEW-B6 | Tray menu English-only; tray icon not found on Win11 hidden-icons (10.4/10.5) |
| NEW-B7 | Quit leaves "companion runs in background" + no persistent stopped banner (10.10) |
| NEW-B8 | Scene detail 8 767 px tall: pairing grid renders every installed item incl. system utilities (11.4); 200 % zoom toast overlaps primary action (11.7) |
| NEW-B9 | Re-test by hand: Save keys with typed key did not persist in 2 of 3 automated attempts (8.6) — may be tool artefact |
| NEW-B10 | GIPHY pill stale right after save (8.6) |

## What works well — keep
- Status headline "Right now" + one card + explicit "you can close this page" message (10, 14).
- Autosave preserves drafts across language switch, error and reload (12.1–12.2); typed input persisted in config within 3 s.
- Key validation error is specific (06); key never echoed (password field).
- GIF dialog: focus moves in, is trapped, Escape closes and returns focus; no-key state gives the next step (9.1, 9.4).
- Quit confirm names the consequence, and **Quit cleanly stops all Electron processes + server in ≤1 s** (10.8–10.9); close-to-tray keeps server alive; second launch reopens (10.4–10.5).
- Companion-down UI **self-recovers without reload** in ≤3 s (15.3).
- Consistent visible focus outline on every stop (14.1), skip link appears on focus.
- Bottom tab bar at narrow widths; no horizontal overflow at any tested width.
- Sidebar order Status → Scenes → Settings matches the owner's visit pattern.

## Process cleanup (PIDs, verified)
Started by me and confirmed dead: CLI companions 14860, 13180, 34780, 47320, 42584; Electron main 35996 + gpu 40864 / utility 26676 / renderer 17660; second-instance probe 31192 (exited). Port 47392 free; no process command line contains `vibe-p0-b`; `HKCU\…\Run` has no `electron.app.Electron`. No Discord activity was ever published (RPC disabled, no App ID). `%TEMP%\vibe-p0-b` deleted and my Orca tab closed at the end.
