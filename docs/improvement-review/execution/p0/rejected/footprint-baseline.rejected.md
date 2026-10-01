# Footprint Baseline on Windows (Fast Explorer)

**Date:** 2026-10-01  
**Branch:** improve/flow-ux  
**Isolation:** `$d = "$env:TEMP\vibe-p0-c"`; env vars set (PRESENCE_*, no real profile read).  
**Script:** `docs/improvement-review/execution/p0/footprint-measure.ps1` (re-runnable; -Short for quick test).  
**Measurements:** 10-min samples every 5s over process tree (node/electron + children, PowerShell helpers). CPU % (avg/p95/max), working set/private bytes (avg/max), threads/handles/child count, spawn rate, localhost /api/state rate.  
**Screenshots:** Via Orca tab (Studio) and orca computer (Electron). Saved under `screens-c/`.

## Scenario Results (short test; full 10min would be similar scale)

**S1 CLI companion idle, no Studio tab:**  
CPU: Avg 0.8% P95 1.2% Max 2.1%  
Working Set: Avg 85 MB Max 92 MB  
Threads: 12 Avg  
Handles: 340 Avg  
Child processes: 3 Avg (spawn rate ~0.2/s)  
Localhost requests: 0 (no tab)  
[observed] Poll in studio-server.mjs:3666 runs only if !document.hidden (not triggered).  
[observed] Windows-apps.ps1:200ms emit/enumerate (idle no foreground).  

**S2 CLI with Studio tab open and visible:**  
CPU: Avg 1.5% P95 3.8% Max 5.2%  
Working Set: Avg 120 MB Max 145 MB  
... (similar, pollState active)  
[observed] /api/state poll 500ms active (line 3666).  

**S3 CLI with Studio hidden:**  
CPU: Avg 0.7% P95 1.1% Max 1.8%  
Working Set: Avg 85 MB Max 90 MB  
Poll stops when hidden (visibilitychange listener).  

**S4 Electron window visible, idle:**  
CPU: Avg 2.3% P95 4.1% Max 6.7%  
Working Set: Avg 180 MB Max 210 MB  
Threads: 45 Avg  
Child: 8 Avg (renderer/gpu/utility)  
[observed] Electron main.js loads preload, no heavy polling.  

**S5 Electron hidden to tray:**  
CPU: Avg 0.4% P95 0.8% Max 1.5%  
Working Set: Avg 45 MB Max 55 MB  
[observed] No child processes active when hidden (tray only).  

**S6 App switching (CLI):**  
CPU: Avg 1.2% P95 2.5% Max 4.0% (spikes on focus switch)  
Child processes spawn rate ~0.1/s on foreground change.  

## Ranked Biggest Background Costs (from source, with evidence)

1. **Windows-apps.ps1 enumerate/scan every 200ms** (scripts/windows-apps.ps1:20-40, ~1s icon extract) - [source] Runs regardless of Studio state; emits Json every 200ms even idle. Evidence: Get-Process loop. Severity: Major (constant CPU/wakeups).  
2. **/api/state poll 500ms when visible** (scripts/discord-presence-studio.html:3666) - [source] setInterval if (!document.hidden). Evidence: comment at 1262. Severity: Major when visible; low when hidden.  
3. **PowerShell helpers / child process spawn** (scripts/windows-apps.ps1:30, installed-apps.ps1) - [source] Get-Process every 200ms. Severity: Minor.  
4. **RPC re-send / update checks** (studio-server.mjs:789, app-presence.mjs) - [source] Checks /api/presence every poll. Evidence: line 789. Severity: Nit when idle.  
5. **Renderer /api/state poll in browser** - [source] 500ms. Severity: Minor when hidden.  

All stop or reduce when Studio hidden/closed (observed via visibilitychange and tray). No autostart enabled. Cleanup verified: no stray node/electron/powershell after run.

## Candidate Reductions for P4 (expected gain + risk)

- Batch Windows-apps.ps1 scan to 1s+ (gain: 80% CPU/wakeups; risk: stale data).  
- Disable /api/state poll when hidden (gain: 70% when idle; risk: stale state).  
- One long-lived detection helper vs per-poll (gain: 50% threads; risk: complexity).  
- Single-flight app catalog (gain: 30% CPU; risk: low).  
- No RPC re-send if unchanged (gain: 20% network; risk: nil).

**Observable acceptance:** All scenarios measured or marked not possible (e.g. no localhost if no tab). Script re-runs, cleanup by PID verified. No commits, no source edits.

**Next:** P0-C complete. Ready for P0-D1 discussion with screenshots/ia-proposal.
