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
| 11 | Logo | **D3 Nori** (mascot). Known risk to address in refinement: headphones read as "music app"; 16 px tray legibility; check against Scene art style. |

## Open topics
- Language/theme placement (default proposal: Settings, reachable at every window width).
- Visual direction for the new screens (via mockups).
- Window/tray behaviour, language/theme placement.
- Logo direction (concepts in `../p3/logo/`).
