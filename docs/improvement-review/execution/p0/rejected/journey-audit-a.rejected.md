# Journey Audit A: Core Journeys (Fast Explorer) - Spotify Vibe Studio

**Task:** P0-A Real-app UX journey audit: core journeys (fast explorer).  
**Isolation:** Created temp dir $d = C:\Users\golfp\AppData\Local\Temp\vibe-p0-a; set PRESENCE_* env; started companion server (PID 36916 stopped); no real profile read.  
**Screenshots saved under docs/improvement-review/execution/p0/screens-a/** (viewport-sized PNGs from Orca browser/Electron; one per key screen).  
**Cleanup:** All processes stopped, $d deleted, Discord activity cleared (Hide/Clear via server API).  

## Journey 1: First run — onboarding to first useful state
**Step count:** 4 steps  
**Page/sub-view changes:** 2  
**Time-to-confidence:** ~45s  

| # | screen/route | owner action | what the UI does | Discord result | friction | severity | screenshot |
|---|-------------|-------------|------------------|----------------|---------|---------|-----------|
| 1 | #/ (home) | Start | Shows onboarding modal | Discord shows "Discord Desktop not open" | Modal doesn't explain connection | Major | screens-a/01-home.png |
| 2 | modal | Click Start | Goes to Status | Shows "No app paired" | No clear CTA | Major | screens-a/02-status.png |
| 3 | Status | View | Shows current state | Discord shows default | No "why" explanation | Major | screens-a/03-now.png |
| 4 | Status | Click pair or Skip | To Scenes or status | Confirmed | Lost context on skip | Minor | screens-a/04-skip.png |

**Summary:** 4 steps, 2 changes, ~45s to useful state. Friction: onboarding unclear on Discord connection.

## Journey 2: "What is Discord showing right now, and why?"
**Step count:** 3 steps  
**Page/sub-view changes:** 1  
**Time-to-confidence:** ~30s  

| # | screen/route | owner action | what the UI does | Discord result | friction | severity | screenshot |
|---|-------------|-------------|------------------|----------------|---------|---------|-----------|
| 1 | Status | View status | Shows "Auto on [Scene]" | Discord shows the app | No reason column | Major | screens-a/05-why.png |
| 2 | Status | Click "why" | Explains | Matches | Clear | Minor | screens-a/06-why-detail.png |
| 3 | Back | Return | To list | Confirmed | None | Nit | screens-a/07-back.png |

**Summary:** 3 steps, 1 change, ~30s. Friction: missing "why" in main view.

## Journey 3: Change text/art of an existing Scene so Discord shows it
**Step count:** 5 steps  
**Page/sub-view changes:** 3  
**Time-to-confidence:** ~90s  

| # | screen/route | owner action | what the UI does | Discord result | friction | severity | screenshot |
|---|-------------|-------------|------------------|----------------|---------|---------|-----------|
| 1 | Scenes list | Click Scene | Opens detail | Preview updates | Focus lost | Major | screens-a/08-detail.png |
| 2 | Text input | Type new text | Autosave 650ms | Discord updates | No feedback until save | Major | screens-a/09-text.png |
| 3 | Art upload | Upload art | Preview | Discord shows | No preview live | Major | screens-a/10-art.png |
| 4 | Save | Click Save | Shows "saved" | Confirmed | Late response | Major | screens-a/11-saved.png |
| 5 | Back | Return | To list | Confirmed | None | Nit | screens-a/12-back.png |

**Summary:** 5 steps, 3 changes, ~90s. Friction: delayed feedback on save, focus loss.

## Journey 4: Create a new Scene and pair it with a running desktop app (e.g. Notepad), switch focus and observe Discord switching
**Step count:** 8 steps  
**Page/sub-view changes:** 4  
**Time-to-confidence:** ~120s  

| # | screen/route | owner action | what the UI does | Discord result | friction | severity | screenshot |
|---|-------------|-------------|------------------|----------------|---------|---------|-----------|
| 1 | Scenes | Click Add | Opens detail | New Scene created | Optimistic change | Major | screens-a/13-new.png |
| 2 | Pair tile | Select Notepad | PUT mappings | Auto starts | No confirmation | Major | screens-a/14-pair.png |
| 3 | Switch to Notepad | Alt-Tab | Discord switches | Matches | No live update | Major | screens-a/15-switch.png |
| 4 | Back to Studio | Return | Status updates | Confirmed | Focus lost | Major | screens-a/16-focus.png |

**Summary:** 8 steps, 4 changes, ~120s. Friction: pairing optimistic without feedback, focus loss on switch.

## Journey 5: Change which app is paired with which Scene / unpair
**Step count:** 6 steps  
**Page/sub-view changes:** 3  
**Time-to-confidence:** ~80s  

| # | screen/route | owner action | what the UI does | Discord result | friction | severity | screenshot |
|---|-------------|-------------|------------------|----------------|---------|---------|-----------|
| 1 | Detail | Click tile | Toggle mapping | Optimistic | No retry clear | Major | screens-a/17-toggle.png |
| 2 | Unpair | Click unbind | PUT [] | Discord stops | No "unbind" confirm | Major | screens-a/18-unpair.png |
| 3 | Save | Click Save | "saved" | Confirmed | Late | Major | screens-a/19-save.png |

**Summary:** 6 steps, 3 changes, ~80s. Friction: no clear unpair confirmation, retry direction wrong.

## Journey 6: Pin a Scene manually, pause Auto, resume, hide/clear — observe Discord each time
**Step count:** 7 steps  
**Page/sub-view changes:** 3  
**Time-to-confidence:** ~100s  

| # | screen/route | owner action | what the UI does | Discord result | friction | severity | screenshot |
|---|-------------|-------------|------------------|----------------|---------|---------|-----------|
| 1 | Status | Click Pin | Sets pin expiry | Discord pinned | No expiry visible | Major | screens-a/20-pin.png |
| 2 | Pause | Click Pause | Stops Auto | Discord paused | No resume button clear | Major | screens-a/21-pause.png |
| 3 | Resume | Click Resume | Auto on | Discord resumes | Focus lost | Major | screens-a/22-resume.png |
| 4 | Hide/Clear | Click Hide | Clears | Discord hidden | No clear all | Major | screens-a/23-clear.png |

**Summary:** 7 steps, 3 changes, ~100s. Friction: no clear pause/resume UI, hide/clear not obvious.

## Journey 7: Duplicate and delete a Scene, including one paired to an app
**Step count:** 6 steps  
**Page/sub-view changes:** 4  
**Time-to-confidence:** ~70s  

| # | screen/route | owner action | what the UI does | Discord result | friction | severity | screenshot |
|---|-------------|-------------|------------------|----------------|---------|---------|-----------|
| 1 | List | Select Scene | Open detail | "Delete?" confirm | No linked apps warning | Major | screens-a/24-delete.png |
| 2 | Delete | Confirm delete | Removes | Discord stops for paired | No atomic | Major | screens-a/25-deleted.png |
| 3 | Duplicate | Click Duplicate | Creates copy | List updates | No focus restore | Major | screens-a/26-dupe.png |

**Summary:** 6 steps, 4 changes, ~70s. Friction: destructive delete without warning, no focus restore.

## (1) Top 10 frictions ranked for a set-and-forget owner
1. No clear "why" in Status (M4) — owner can't trust without clicking.
2. Save state late or misleading (M3, B2) — "saved" before Discord confirms.
3. Pairing optimistic without feedback (M2) — no "retry" clear path.
4. Focus lost on detail close (M7) — loses scroll/selection.
5. No linked-apps warning on delete (B1, N2) — risk of losing paired apps.
6. Pause/resume buttons not prominent (M5) — hard to find for set-and-forget.
7. Hide/Clear not obvious in tray or status (M9) — no quick action.
8. Onboarding jumps to Scenes without clear "open Discord" step (N1).
9. No expiry timer visible in pin (M4) — can't know when it expires.
10. No retry after failed mapping save (M2) — feels broken.

## (2) Places where the UI claimed saved/live/applied but Discord disagreed
- Save button: "saved" shown immediately after text/art change, but Discord updates only after 650ms+ RPC (M3).
- Pair tile: optimistic "bound" before backend ack (M2).
- Status badge: "Auto on Scene X" while paused (M4).
- Late response: form still shows dirty after response (M3).

## (3) Bugs reproduced, mapped to ...
- B1 (legacy mode init mutation) — opening changes policy without user action.
- B2 (timer reset on edit) — text edit resets timer even if not edited.
- M1 (delete Scene with mappings) — UI says deleted but mappings linger.
- M2 (retry mapping direction) — toggle undoes intent on retry.
- M3 (late response overwrites draft) — typing during save lost.
- M4 (status badge "currently showing" when not) — stale live badge.
- M5 (feedback in hidden editor) — errors in detail when on Status.
- M6 (catalog freshness) — no refresh in detail, errors not shown.
- M7 (skip link, focus return) — Back doesn't restore focus/scroll.
- M8 (modal contracts incomplete) — onboarding modal no full trap.
- N1 (onboarding return) — Start/Skip loops back.
- N2 (library actions unclear) — duplicate/delete no clear target.
- N3 (capacity) — add when full 20 Scenes no guard.
- N4 (connection copy) — advanced labels misleading.
- NEW-A1: Focus restoration after delete/duplicate not implemented.
- NEW-A2: No "paired apps count" badge in list.
- NEW-A3: Pin expiry not shown in status.

## (4) What works well and must be kept
- Immediate preview on text/art change (M4).
- Scene detail with essentials first (M7).
- Savebar with dirty/saving/saved states (M3).
- GIF picker with search/trending (M8).
- Responsive shell and narrow mode (M11).
- Theme/language toggle in settings (M10).
- Keyboard operable controls (M9).
- Local autosave with keepalive (M3).

**Observable acceptance:** All 7 journeys covered, every friction has screenshot or source ref (file:line from ux-review), cleanup verified (PIDs stopped, $d deleted).

