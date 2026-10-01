# P0-C2b: Background footprint baseline

[measured] S1–S3 retained; S4 repeated after a sampling suspension; S5 repeated on frozen source; S6 completed. No application source changes, commits, installs, Chrome control, or real Discord presence were performed.

## Reproduce and scope

Run from `C:/letmecook-lab/spotify-vibe`: `python docs/improvement-review/execution/p0/footprint-summarize.py`. This validates CSV formulas, aggregates, timestamps, sampling gaps, source hashes and cleanup, then regenerates this report. Means use equal sample weights; p95 uses nearest rank ceil(0.95 × samples); spawns/min = observed new PIDs × 60 / summed intervals. Values round to three decimals.

Isolation: `%TEMP%/vibe-p0-c`; `PRESENCE_CONFIG_PATH=$d/presence-config.json`, `PRESENCE_SECRETS_PATH=$d/secrets.json`, `PRESENCE_STUDIO_PORT=47393`, `PRESENCE_AUTOSTART_DISABLE=1`, `PRESENCE_DISABLE_DEFAULT_APPLICATION=1`; app detection enabled. Electron: `--user-data-dir=$d/electron-user-data`, preseed `vibe-electron.json` with `{"loginItemDefaultApplied":true}`. No owner profile/secrets or ports 17345/17346/47391/47392/47394/47396 used.

**Limitations:** no configured Discord application ID, so RPC send/reconnect load is unmeasured. Development Electron does not run packaged update checks. S6 changes focus with an unmapped isolated profile. S2/S3 include Node and descendants only; shared Orca renderer CPU/memory are excluded. S4/S5 include cmd/npx wrappers, Electron renderer/GPU, and detector. Sampler/test apps are excluded from tree totals but included in machine CPU. Serial captures on a busy workstation and dirty source prevent attributing all scenario differences to visibility.

## Results [measured]

| Scenario | n | CPU avg % | p95 % | max % | WS avg MB | max MB | Private avg MB | max MB | Threads avg | Handles avg | Processes avg/max | Spawns/min |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| S1: CLI idle; no tab | 120 | 1.949 | 2.553 | 2.705 | 213.220 | 222.051 | 175.410 | 185.664 | 32.275 | 1496.967 | 4.000/4 | 0.000 |
| S2: CLI + visible Orca tab | 120 | 1.635 | 2.055 | 2.497 | 220.853 | 235.754 | 184.438 | 198.980 | 32.208 | 1531.725 | 4.000/4 | 0.000 |
| S3: CLI + same tab hidden | 120 | 1.743 | 2.183 | 2.703 | 223.980 | 237.238 | 187.194 | 200.121 | 31.900 | 1571.867 | 4.000/4 | 0.000 |
| S4: Electron visible | 120 | 2.442 | 3.158 | 4.431 | 611.958 | 705.555 | 450.773 | 503.203 | 163.383 | 4230.442 | 11.033/13 | 0.000 |
| S5: Electron closed to tray | 120 | 2.009 | 2.670 | 3.766 | 591.329 | 690.840 | 411.234 | 472.598 | 163.033 | 4236.433 | 11.017/13 | 0.000 |
| S6: CLI + focus alternation | 36 | 1.801 | 2.330 | 2.339 | 211.972 | 222.695 | 175.084 | 187.277 | 34.167 | 1305.889 | 4.000/4 | 0.000 |

CPU is normalized to all logical processors; WS sums double-count shared pages, private means PrivateMemorySize64 rather than private working set. Short-lived between-sample processes and exit-tail CPU are unobserved, so CPU/spawns are lower bounds. Startup/warm-up processes are excluded from new-PID rate.

| Scenario | Start UTC | End UTC | Intervals total s | Gap min/max s | Logical CPUs | Machine CPU avg/p95/max % |
|---|---|---|---:|---|---:|---|
| S1 | 2026-10-01T15:08:57.6076358Z | 2026-10-01T15:18:57.9207185Z | 600.313 | 4.754/5.350 | 12 | 42.021/72.566/97.066 |
| S2 | 2026-10-01T15:34:45.6861557Z | 2026-10-01T15:44:46.0321170Z | 600.346 | 4.756/5.323 | 12 | 18.558/45.493/82.199 |
| S3 | 2026-10-01T15:45:22.4903802Z | 2026-10-01T15:55:22.8164589Z | 600.326 | 4.687/5.375 | 12 | 21.480/51.101/91.857 |
| S4 | 2026-10-01T19:46:12.8034390Z | 2026-10-01T19:56:16.3600210Z | 603.557 | 4.136/7.766 | 12 | 72.831/97.088/100.000 |
| S5 | 2026-10-01T19:58:01.7516777Z | 2026-10-01T20:08:04.2555437Z | 602.504 | 4.199/6.949 | 12 | 75.200/98.693/99.922 |
| S6 | 2026-10-01T20:13:59.8740580Z | 2026-10-01T20:17:00.7591455Z | 180.885 | 4.324/5.900 | 12 | 35.354/62.297/68.694 |

| Scenario | Process name | Mean CPU % | Mean WS MB | Mean private MB |
|---|---|---:|---:|---:|
| S1 | powershell.exe | 1.916 | 122.459 | 101.605 |
| S1 | node.exe | 0.032 | 73.102 | 70.962 |
| S1 | conhost.exe | 0.001 | 17.660 | 2.842 |
| S2 | powershell.exe | 1.595 | 122.356 | 101.138 |
| S2 | node.exe | 0.039 | 80.756 | 80.466 |
| S2 | conhost.exe | 0.000 | 17.740 | 2.834 |
| S3 | powershell.exe | 1.690 | 126.133 | 105.204 |
| S3 | node.exe | 0.051 | 80.123 | 79.177 |
| S3 | conhost.exe | 0.002 | 17.724 | 2.813 |
| S4 | powershell.exe | 1.987 | 129.388 | 107.889 |
| S4 | electron.exe | 0.455 | 347.866 | 240.551 |
| S4 | node.exe | 0.000 | 100.535 | 89.284 |
| S4 | conhost.exe | 0.000 | 17.782 | 2.951 |
| S4 | cmd.exe | 0.000 | 16.387 | 10.098 |
| S5 | powershell.exe | 1.971 | 129.825 | 109.340 |
| S5 | electron.exe | 0.038 | 321.182 | 199.509 |
| S5 | cmd.exe | 0.000 | 16.408 | 10.509 |
| S5 | node.exe | 0.000 | 107.735 | 88.899 |
| S5 | conhost.exe | 0.000 | 16.179 | 2.976 |
| S6 | powershell.exe | 1.772 | 125.153 | 104.093 |
| S6 | node.exe | 0.029 | 69.207 | 68.179 |
| S6 | conhost.exe | 0.000 | 17.612 | 2.813 |

## Harness audit and failed captures

[source] `footprint-measure.ps1` re-enumerates CIM parent/child ancestry for every snapshot. Per-process creation timestamps distinguish reused PIDs. CPU = 100 × summed delta TotalProcessorTime / (actual timestamp interval × logical CPUs); machine CPU = 100 × (delta(kernel+user) − delta(idle))/delta(kernel+user). Both formulas validate against every retained CSV row. Snapshot collection is non-atomic; ancestry uses parent PID without parent creation validation, and an escaped/reparented child may be missed. No such event appears in retained PID sets.

[measured/source] Original S4 is preserved in `footprint-raw/original/S4.*`: a long sampling interruption was followed by the original fixed-deadline loop catching up in rapid succession. Windows System event evidence (`footprint-eventlog.json`) identifies Modern Standby: Kernel-Power 506 at 23:03:37 (Lid), 507 at 23:09:30 (Power Button), another 506 at 23:09:30 (Lid), then 507 at 23:09:53. These align with the 358.604 s and 24.066 s sampling gaps. Actual-interval CPU stays mathematically valid, but equal-weight CPU/memory p95/means become biased; the capture is superseded. Resume harness skips missed deadlines instead of emitting catch-up bursts.
[measured] Original S4: 120 rows, 853.874 s total, longest gap 358.604 s, shortest 0.389 s; runner progress jumps from 420.5 to 840.7 s. S1–S3 have regular intervals and consistent Node/detector/conhost membership.

[measured] Original S5 has 31 CSV rows (progress logs stop at row 24), lasted 155.851 s, then process counts fell from 11 to 2 to 0. stdout says `Presence Studio stopped.` and stderr is empty; Windows Application events 1000/1001 contain no Electron crash in 23:00–23:15 (`footprint-eventlog.json`). Close was posted before sampling; survival for minutes contradicts immediate tray failure. Harness Stop-Process runs only in finally, after the zero-process sample triggers the error, so that cleanup did not cause the observed exit.

[source] Frozen `electron/main.js:80` prevents close; if a tray exists it hides, otherwise calls quitApp. Tray creation errors are swallowed at :142. `window-all-closed` at :283 does not quit; `before-quit` at :286 routes through orderly shutdown. `/api/quit` at `scripts/studio-server.mjs:929` calls onQuit after a request. Original logs contain no quit-event/request provenance, so the historical trigger cannot be determined from them; graceful termination could be external UI/API/quit or a signal: scripts/studio-server.mjs:748 installs SIGINT/SIGTERM stop handlers, without logging the cause. No source defect is established solely by that interrupted capture.

[measured] Reproduction: frozen S4 snapshot was closed with WM_CLOSE once before S5 sampling; the full descendant tree was observed throughout the ten-minute capture. The success/failure and visibility values below establish whether the original exit recurred.
S5 replay: error=None, minimized=False, visible owned windows at start=0; root PID=43932. No diagnostic hooks changed app code.

## Exact commands and source provenance

Frozen assembly is encoded in `footprint-measure-resume.ps1`: copy package.json/scripts/public and Electron assets into `$d/app`, overlay verified `footprint-raw/frozen-source` (identical to original S4 hashes), junction node_modules, then launch from the copy. Frozen launch manifests hash all copied scripts/Electron files/package.json in each metadata `frozenHashes`. Live Electron source was never used for the accepted reruns.

| Scenario | Sampler command (from repository root) | Launch-time HEAD / dirty status evidence |
|---|---|---|
| S1 | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File docs/improvement-review/execution/p0/footprint-measure.ps1 -Mode S1 -DurationSeconds 600 -IntervalSeconds 5` | `b401d34b523f8b1e219985d3cca6e54a7dfb8d8b`; full dirty list in [S1.metadata.json](footprint-raw/S1.metadata.json), `gitStatus` |
| S2 | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File docs/improvement-review/execution/p0/footprint-measure.ps1 -Mode S2 -DurationSeconds 600 -IntervalSeconds 5 -KeepStudioTab` | `b401d34b523f8b1e219985d3cca6e54a7dfb8d8b`; full dirty list in [S2.metadata.json](footprint-raw/S2.metadata.json), `gitStatus` |
| S3 | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File docs/improvement-review/execution/p0/footprint-measure.ps1 -Mode S3 -DurationSeconds 600 -IntervalSeconds 5 -StudioPage ad5e6f32-6e40-4683-9b2d-ded874984a58` | `b401d34b523f8b1e219985d3cca6e54a7dfb8d8b`; full dirty list in [S3.metadata.json](footprint-raw/S3.metadata.json), `gitStatus` |
| S4 | `pwsh.exe -NoProfile -ExecutionPolicy Bypass -File docs/improvement-review/execution/p0/footprint-measure-resume.ps1 -Mode S4 -DurationSeconds 600 -IntervalSeconds 5` | `b401d34b523f8b1e219985d3cca6e54a7dfb8d8b`; full dirty list in [S4.metadata.json](footprint-raw/S4.metadata.json), `gitStatus` |
| S5 | `pwsh.exe -NoProfile -ExecutionPolicy Bypass -File docs/improvement-review/execution/p0/footprint-measure-resume.ps1 -Mode S5 -DurationSeconds 600 -IntervalSeconds 5` | `b401d34b523f8b1e219985d3cca6e54a7dfb8d8b`; full dirty list in [S5.metadata.json](footprint-raw/S5.metadata.json), `gitStatus` |
| S6 | `pwsh.exe -NoProfile -ExecutionPolicy Bypass -File docs/improvement-review/execution/p0/footprint-measure-resume.ps1 -Mode S6 -DurationSeconds 180 -IntervalSeconds 5` | `745dcebac35115541344bf0eff10e57e62d71831`; full dirty list in [S6.metadata.json](footprint-raw/S6.metadata.json), `gitStatus` |

Application commands: CLI `node scripts/discord-presence-studio.mjs --port=47393 --no-open`; Electron `npx electron . --user-data-dir="%TEMP%/vibe-p0-c/electron-user-data"`. Exact launch argv, parent PIDs and command lines for accepted reruns are in metadata `commands` and `treeAtStart`.

| Source file | SHA256 by scenario |
|---|---|
| electron/lifecycle.mjs | S1,S2,S3,S4,S5,S6: `FED82FCB2B225C82C4B4C3362E7796F26AAE32659C189E1CA0342F9CCF014F43` |
| electron/main.js | S1,S2,S3,S4,S5,S6: `26923E26379B00A4433AB4FBA9112199EBE5F9728FA9F9BCB410DE9BD021436A` |
| electron/preload.cjs | S1,S2,S3,S4,S5,S6: `C1FF1A28EEDD6D888B0EE4C4CEA2C1A740BBB8368CAB47280BCE404F5800FC77` |
| scripts/app-presence.mjs | S1,S2,S3,S4,S5,S6: `B7DD19ADFE1D9606DFF4EB1A6B7D8ABE60662643C60979584B601C7AEC98DA9D` |
| scripts/app-secrets.mjs | S1: `55C06B1AF9F6145B0DE5E5103AA446F7E799BC4416D21515A23708FB4E7AF2BB`; S2,S3,S4,S5,S6: `06698A12007563DCB3E65E1D1291FE079F93DB38EB5E4BBA8308C93192DD34CD` |
| scripts/discord-presence-studio.html | S1,S2,S3,S4,S5,S6: `15B79564FD958598B4C5EEC029532EDDD2B4ADD5EC568F8DC4E9FF14439C019E` |
| scripts/installed-apps.mjs | S1,S2,S3,S4,S5,S6: `97084C6C3B321E4F325A252CFFACC280B008A1EA552331BEC37C19EDDFD748C5` |
| scripts/local-config-store.mjs | S1: `3899D1A2D1FB58F5CEFD33186D2D1289BBFB66AE01994C2EC9DE2718D56CD29D`; S2,S3,S4,S5,S6: `FAD06EA79341A504A6983B83534CAA3FB9AE77B15B3CFF9EF69C536DC461C237` |
| scripts/presence-scheduler.mjs | S1,S2,S3,S4,S5,S6: `0FCFD5911C7CD840FD6CB61266288FAAB3BEB05B28AD7266B4B026CA81BCF9AF` |
| scripts/studio-server.mjs | S1: `A43439D46B24615FC526976EC98C7572C83E4796D50FC74CEB0E6B3E9C1CAF54`; S2,S3,S4,S5,S6: `B54AB172A8A506EE86DBE903D9388E8EC42CA74CFF80B89EF8E7DADA97775CDC` |
| scripts/windows-apps.mjs | S1,S2,S3,S4,S5,S6: `EC5397DFE21E305AE36A257F24C59DB95B95E0DD2C432E16B3CAFE66775CF0D3` |
| scripts/windows-apps.ps1 | S1,S2,S3,S4,S5,S6: `BCDF5244E5ACA28EF8C6B8E23BFE1BC3B6A366DBAF635FB082959EAC35B1CDF4` |
S2 browser visibility evidence: `{"result": "{\"hidden\":false,\"visibilityState\":\"visible\",\"url\":\"http://127.0.0.1:47393/#/status\"}", "origin": "http://127.0.0.1:47393/#/status"}`; end: `{"result": "{\"hidden\":false,\"visibilityState\":\"visible\",\"stateRequests\":1207}", "origin": "http://127.0.0.1:47393/#/status"}`. Endpoint checks do not prove uninterrupted visibility; request counts include warm-up/query delay.
S3 browser visibility evidence: `{"result": "{\"hidden\":false,\"visibilityState\":\"visible\",\"url\":\"http://127.0.0.1:47393/#/status\"}", "origin": "http://127.0.0.1:47393/#/status"}`; end: `{"result": "{\"hidden\":false,\"visibilityState\":\"visible\",\"stateRequests\":1206}", "origin": "http://127.0.0.1:47393/#/status"}`. Endpoint checks do not prove uninterrupted visibility; request counts include warm-up/query delay.
S6: 18 ten-second focus attempts; 18 accepted; observed foreground PIDs [26164, 40652]. Foreground matches requested PID for every event. Resume harness uses WScript.Shell ALT/AppActivate then SetForegroundWindow; exact timestamps/handles/results in metadata. Owned Notepad and Paint are excluded from tree measurements. Original ineffective S6 (one unchanged foreground PID) is retained under original/S6.* and excluded.

## Background cadence inventory [source]

Locations refer to `footprint-raw/frozen-source/` (S4 snapshot); source drift above limits cross-version comparisons.

| Work | Cadence / trigger; source file:line | Hidden / closed Studio |
|---|---|---|
| /api/state renderer poll | 500 ms, single-flight; scripts/discord-presence-studio.html:2934,3666; visible event :3667 | Hidden skips requests; interval persists. Destroyed tab/window stops renderer timers. |
| Renderer clock | 1 s; scripts/discord-presence-studio.html:3665 | No visibility guard; Chromium may throttle. Destroyed renderer stops. |
| Foreground emit | JSON apps/running snapshot then sleep 200 ms; scripts/windows-apps.ps1:62,68 | Continues without Studio, hidden tab, tray close. |
| Process enumeration + icon work | Startup then scan elapsed+1000 ms; scripts/windows-apps.ps1:22,23,60; cached icons :37 | Continues irrespective of Studio; scan time adds to period. |
| Reconcile/scheduler | Detector snapshots in apps mode; scripts/studio-server.mjs:975,979; schedule heartbeat :449; scripts/presence-scheduler.mjs:63 | Continues hidden; frequent reconcile resets nominal <=60 s heartbeat. Expired override persistence backs off 1 s to 60 s. |
| Installed-apps scan | Startup cache missing/invalid/stale >7 days; scripts/installed-apps.mjs:9,80; forced refresh server :824; 120 s watchdog scripts/installed-apps.mjs:10,46 | Not visibility-controlled; one scan deduplicated, shutdown aborts. TTL checked at startup, no weekly timer. |
| Renderer app list | Initialize now plus 2500 ms one-shot; scripts/discord-presence-studio.html:3643 | No hidden guard; cached list retrieval does not force Start Menu scan. |
| RPC resend/reconnect | Identical appliedKey skips send unless force; scripts/studio-server.mjs:310,316; reconnect 1/2/4/8/16/30 s capped :287 | Continues hidden when configured; no unconditional same-key heartbeat resend. Unmeasured here. |
| Updates | Packaged only: initial 20 s then 6 h; electron/main.js:183,212; check timeout 60 s :172 | Continues tray-hidden; absent in development Electron. |

## Ranked costs and P4 candidates

1. **Persistent detector [measured/source]:** S1 PowerShell averages 1.916% CPU, 122.459 MB WS, 101.605 MB private; 98.308% of mean tree CPU. Separate foreground identity events from bulk enumeration/icons; reduce scans and deduplicate JSON. Expected CPU saving is bounded by that measured helper contribution, not promised. Risk: short-lived apps, process exits and preserving most-recently-foregrounded mapped-running-app policy.

2. **Retained Electron [measured]:** S5 Electron aggregate averages 321.182 MB WS/199.509 MB private. Consider destroying/recreating the renderer on close. Gain is bounded by the renderer/GPU subset, not all Electron memory; OS WS saving needs follow-up. Risk: drafts, reopen latency, subscription/state replay.

3. **Repeated reconciliation [source]:** emit only changed detector selection/catalog data and reconcile on relevant transitions. Expected gain: fewer allocations, JSON parses and scheduler resets; no isolated reduction measured. Risk: expiry, stale truthful state, missed app transitions.

4. **Visible polling/clock [source]:** push state or slow visible polling; pause hidden no-op clock. Hidden state-fetch suppression already exists. Expected gain: fewer visible HTTP/render cycles; browser cost unmeasured. Risk: reconnect and stale status.

5. **Startup catalog [source]:** defer missing-cache icon extraction until picker use if startup measurements justify it; preserve disk cache. Expected gain is startup work, not an established steady-state saving. Risk: delayed discovery. Packaged updater/RPC require separate measurements. No P4 implementation.

## Cleanup evidence [measured]

| Scenario | Observed PIDs verified no same identity remains | Temp removed | Electron Run entry |
|---|---|---|---|
| S1 | 36128, 35608, 29392, 22308 | True | False |
| S2 | 34212, 28900, 23716, 8604 | True | False |
| S3 | 37852, 35324, 28764, 10512 | True | False |
| S4 | 48788, 48576, 47448, 46944, 46504, 45840, 45764, 45388, 44696, 43264, 39656, 37108, 31144, 22776 | True | False |
| S5 | 47512, 46556, 45452, 44532, 43932, 43860, 43292, 43136, 42916, 42440, 40608, 28628, 12684, 6016, 5676 | True | False |
| S6 | 47248, 47204, 47140, 41996, 40652, 40440, 26164, 22924 | True | False |

S4 initial cleanup observed one asynchronously exiting Electron child; S4.cleanup-recheck.json verifies all original identities gone. Cleanup verifies creation timestamps, stops owned Electron descendants/helpers, unlinks the node_modules junction before removing isolation, and queries HKCU Run. Additional runner/aborted-process verification is in `footprint-cleanup.json`; original interrupted-run cleanup is retained in original metadata. Earlier P0-C2 smoke/aborted-run evidence remains in `footprint-smoke/`. Tests were not run for this measurement-only task; the numerical validator is the relevant check.

Additional sampler/controller/aborted-run cleanup PIDs: 2184, 4548, 18784, 25912, 28316, 30800, 33004, 39632, 42584, 43816, 43920, 44200, 45200, 47324, 48880. Final verification: 93 identity checks, no task processes, no listener on 47393, no electron.app.Electron entry, temp removed. Recheck command: `pwsh.exe -NoProfile -File docs/improvement-review/execution/p0/footprint-final-cleanup.ps1`; registry command: `reg query HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
Additional superseded-capture PIDs verified exited: 252, 5380, 6432, 20652, 21168, 21200, 21240, 22352, 22712, 25380, 27096, 27728, 28136, 28388, 31824, 32704, 33032, 33304, 33520, 33972, 35068, 35448, 36876, 37148, 39648, 39720, 40276, 40844, 41876, 44128, 47832.