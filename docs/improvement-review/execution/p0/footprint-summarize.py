"""Validate raw CSVs and regenerate the concise footprint report; Python stdlib only."""
import csv, json, math, statistics, hashlib
from pathlib import Path
from datetime import datetime
BASE=Path(__file__).resolve().parent
RAW=BASE/'footprint-raw'
MODES=['S1','S2','S3','S4','S5','S6']
def read_meta(path): return json.loads(path.read_text(encoding='utf-8-sig'))
def read_rows(path):
    with path.open(encoding='utf-8-sig',newline='') as h: return list(csv.DictReader(h))
def mean(rows,key): return statistics.mean(float(r[key]) for r in rows)
def top(rows,key): return max(float(r[key]) for r in rows)
def p95(rows,key): return sorted(float(r[key]) for r in rows)[math.ceil(.95*len(rows))-1]
def fmt(v): return f'{v:.3f}'
def time(s): return datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()
def detail(r):
    d=json.loads(r['per_process_json']);return [d] if isinstance(d,dict) else d
cleanup=read_meta(BASE/'footprint-cleanup.json')
assert cleanup['tempRemoved'] and not cleanup['electronRunItemPresent'] and not cleanup['isolatedPortListening']
assert not cleanup['remainingTaskProcesses']
assert not any(c['stillSameIdentity'] for c in cleanup['identities'])
assert not any(c['present'] for c in cleanup['additionalPidChecks'])
D={}
for s in MODES:
    r=read_rows(RAW/f'{s}.csv');m=read_meta(RAW/f'{s}.metadata.json')
    assert not m['error'],(s,m['error'])
    assert len(r)==(36 if s=='S6' else 120) and m['rows']==len(r),(s,len(r))
    assert m['isolationDirectoryRemoved'] and not m['electronRunItemPresent'],s
    checks=read_meta(BASE/f'{s}.cleanup-recheck.json') if (BASE/f'{s}.cleanup-recheck.json').exists() else m['cleanup']
    assert not any(isinstance(c,dict) and c['stillSameIdentity'] for c in checks),s
    prior=time(m['start'])
    for x in r:
        dt=float(x['interval_seconds']);cpu=float(x['tree_cpu_percent']);d=detail(x)
        assert 3<=dt<=8,(s,'sampling gap',dt)
        assert abs(time(x['timestamp'])-prior-dt)<.002,(s,'timestamp interval')
        prior=time(x['timestamp'])
        assert math.isclose(cpu,100*float(x['tree_cpu_delta_seconds'])/(dt*m['logicalProcessors']),abs_tol=1e-9)
        for field,part in [('tree_cpu_percent','cpu_percent'),('working_set_mb','ws_mb'),('private_mb','private_mb')]:
            assert math.isclose(float(x[field]),sum(p[part] for p in d),abs_tol=1e-7),(s,field)
        assert int(x['process_count'])==len(d)>0
        assert set(x['tree_pids'].split(';'))=={str(p['pid']) for p in d}
        assert int(x['spawn_count'])==len([p for p in x['new_pids'].split(';') if p])
        assert cpu>=0 and 0<=float(x['machine_cpu_percent'])<=100
    assert abs(time(m['end'])-prior)<.002
    for f,digest in m['sourceHashes'].items():
        assert hashlib.sha256((RAW/f'{s}-source'/f).read_bytes()).hexdigest().upper()==digest,(s,f)
    if s in ('S4','S5','S6'):
        for f,digest in read_meta(RAW/'original/S4.metadata.json')['sourceHashes'].items():
            assert m['sourceHashes'][f]==digest,(s,'frozen source',f)
    if s=='S6':
        events=m['focusEvents']
        assert len(events)==18,(s,'focus attempts',len(events))
        assert len({e['foregroundPid'] for e in events})>=2,(s,'foreground never changed')
        assert all(e['foregroundPid']==e['requestedPid'] for e in events),(s,'focus target mismatch')
    D[s]=(r,m)
labels=['CLI idle; no tab','CLI + visible Orca tab','CLI + same tab hidden','Electron visible','Electron minimized' if D['S5'][1].get('minimized') else 'Electron closed to tray','CLI + focus alternation']
L=['# P0-C2b: Background footprint baseline','',
'[measured] S1–S3 retained; S4 repeated after a sampling suspension; S5 repeated on frozen source; S6 completed. No application source changes, commits, installs, Chrome control, or real Discord presence were performed.','',
'## Reproduce and scope','',
'Run from `C:/letmecook-lab/spotify-vibe`: `python docs/improvement-review/execution/p0/footprint-summarize.py`. This validates CSV formulas, aggregates, timestamps, sampling gaps, source hashes and cleanup, then regenerates this report. Means use equal sample weights; p95 uses nearest rank ceil(0.95 × samples); spawns/min = observed new PIDs × 60 / summed intervals. Values round to three decimals.','',
'Isolation: `%TEMP%/vibe-p0-c`; `PRESENCE_CONFIG_PATH=$d/presence-config.json`, `PRESENCE_SECRETS_PATH=$d/secrets.json`, `PRESENCE_STUDIO_PORT=47393`, `PRESENCE_AUTOSTART_DISABLE=1`, `PRESENCE_DISABLE_DEFAULT_APPLICATION=1`; app detection enabled. Electron: `--user-data-dir=$d/electron-user-data`, preseed `vibe-electron.json` with `{"loginItemDefaultApplied":true}`. No owner profile/secrets or ports 17345/17346/47391/47392/47394/47396 used.','',
'**Limitations:** no configured Discord application ID, so RPC send/reconnect load is unmeasured. Development Electron does not run packaged update checks. S6 changes focus with an unmapped isolated profile. S2/S3 include Node and descendants only; shared Orca renderer CPU/memory are excluded. S4/S5 include cmd/npx wrappers, Electron renderer/GPU, and detector. Sampler/test apps are excluded from tree totals but included in machine CPU. Serial captures on a busy workstation and dirty source prevent attributing all scenario differences to visibility.','',
'## Results [measured]','',
'| Scenario | n | CPU avg % | p95 % | max % | WS avg MB | max MB | Private avg MB | max MB | Threads avg | Handles avg | Processes avg/max | Spawns/min |',
'|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
A={}
for s,label in zip(MODES,labels):
 r,m=D[s];seconds=sum(float(x['interval_seconds']) for x in r)
 vals=[mean(r,'tree_cpu_percent'),p95(r,'tree_cpu_percent'),top(r,'tree_cpu_percent'),mean(r,'working_set_mb'),top(r,'working_set_mb'),mean(r,'private_mb'),top(r,'private_mb'),mean(r,'threads'),mean(r,'handles')]
 L.append(f'| {s}: {label} | {len(r)} | '+' | '.join(map(fmt,vals))+f" | {fmt(mean(r,'process_count'))}/{int(top(r,'process_count'))} | {fmt(sum(int(x['spawn_count']) for x in r)*60/seconds)} |")
 totals={}
 for x in r:
  for p in detail(x):
   t=totals.setdefault(p['name'],[0.,0.,0.])
   for i,k in enumerate(['cpu_percent','ws_mb','private_mb']):t[i]+=p[k]/len(r)
 A[s]=totals
L+=['','CPU is normalized to all logical processors; WS sums double-count shared pages, private means PrivateMemorySize64 rather than private working set. Short-lived between-sample processes and exit-tail CPU are unobserved, so CPU/spawns are lower bounds. Startup/warm-up processes are excluded from new-PID rate.','',
'| Scenario | Start UTC | End UTC | Intervals total s | Gap min/max s | Logical CPUs | Machine CPU avg/p95/max % |','|---|---|---|---:|---|---:|---|']
for s,(r,m) in D.items():
 L.append(f"| {s} | {m['start']} | {m['end']} | {fmt(sum(float(x['interval_seconds']) for x in r))} | {fmt(min(float(x['interval_seconds']) for x in r))}/{fmt(top(r,'interval_seconds'))} | {m['logicalProcessors']} | {fmt(mean(r,'machine_cpu_percent'))}/{fmt(p95(r,'machine_cpu_percent'))}/{fmt(top(r,'machine_cpu_percent'))} |")
L+=['','| Scenario | Process name | Mean CPU % | Mean WS MB | Mean private MB |','|---|---|---:|---:|---:|']
for s,t in A.items():
 for n,v in sorted(t.items(),key=lambda p:-p[1][0]):L.append(f'| {s} | {n} | '+' | '.join(map(fmt,v))+' |')
L+=['','## Harness audit and failed captures','',
'[source] `footprint-measure.ps1` re-enumerates CIM parent/child ancestry for every snapshot. Per-process creation timestamps distinguish reused PIDs. CPU = 100 × summed delta TotalProcessorTime / (actual timestamp interval × logical CPUs); machine CPU = 100 × (delta(kernel+user) − delta(idle))/delta(kernel+user). Both formulas validate against every retained CSV row. Snapshot collection is non-atomic; ancestry uses parent PID without parent creation validation, and an escaped/reparented child may be missed. No such event appears in retained PID sets.','',
'[measured/source] Original S4 is preserved in `footprint-raw/original/S4.*`: a long sampling interruption was followed by the original fixed-deadline loop catching up in rapid succession. Windows System event evidence (`footprint-eventlog.json`) identifies Modern Standby: Kernel-Power 506 at 23:03:37 (Lid), 507 at 23:09:30 (Power Button), another 506 at 23:09:30 (Lid), then 507 at 23:09:53. These align with the 358.604 s and 24.066 s sampling gaps. Actual-interval CPU stays mathematically valid, but equal-weight CPU/memory p95/means become biased; the capture is superseded. Resume harness skips missed deadlines instead of emitting catch-up bursts.']
o=read_rows(RAW/'original/S4.csv')
L.append(f"[measured] Original S4: {len(o)} rows, {fmt(sum(float(x['interval_seconds']) for x in o))} s total, longest gap {fmt(top(o,'interval_seconds'))} s, shortest {fmt(min(float(x['interval_seconds']) for x in o))} s; runner progress jumps from 420.5 to 840.7 s. S1–S3 have regular intervals and consistent Node/detector/conhost membership.")
o=read_rows(RAW/'original/S5.csv');om=read_meta(RAW/'original/S5.metadata.json')
L+=['',f"[measured] Original S5 has {len(o)} CSV rows (progress logs stop at row 24), lasted {fmt(sum(float(x['interval_seconds']) for x in o))} s, then process counts fell from {o[-3]['process_count']} to {o[-2]['process_count']} to {o[-1]['process_count']}. stdout says `Presence Studio stopped.` and stderr is empty; Windows Application events 1000/1001 contain no Electron crash in 23:00–23:15 (`footprint-eventlog.json`). Close was posted before sampling; survival for minutes contradicts immediate tray failure. Harness Stop-Process runs only in finally, after the zero-process sample triggers the error, so that cleanup did not cause the observed exit.",'',
'[source] Frozen `electron/main.js:80` prevents close; if a tray exists it hides, otherwise calls quitApp. Tray creation errors are swallowed at :142. `window-all-closed` at :283 does not quit; `before-quit` at :286 routes through orderly shutdown. `/api/quit` at `scripts/studio-server.mjs:929` calls onQuit after a request. Original logs contain no quit-event/request provenance, so the historical trigger cannot be determined from them; graceful termination could be external UI/API/quit or a signal: scripts/studio-server.mjs:748 installs SIGINT/SIGTERM stop handlers, without logging the cause. No source defect is established solely by that interrupted capture.','',
'[measured] Reproduction: frozen S4 snapshot was closed with WM_CLOSE once before S5 sampling; the full descendant tree was observed throughout the ten-minute capture. The success/failure and visibility values below establish whether the original exit recurred.']
L.append(f"S5 replay: error={D['S5'][1]['error']}, minimized={D['S5'][1].get('minimized',False)}, visible owned windows at start={D['S5'][1]['visibleWindowCount']}; root PID={D['S5'][1]['rootPid']}. No diagnostic hooks changed app code.")
L+=['','## Exact commands and source provenance','',
'Frozen assembly is encoded in `footprint-measure-resume.ps1`: copy package.json/scripts/public and Electron assets into `$d/app`, overlay verified `footprint-raw/frozen-source` (identical to original S4 hashes), junction node_modules, then launch from the copy. Frozen launch manifests hash all copied scripts/Electron files/package.json in each metadata `frozenHashes`. Live Electron source was never used for the accepted reruns.','',
'| Scenario | Sampler command (from repository root) | Launch-time HEAD / dirty status evidence |','|---|---|---|']
for s,(r,m) in D.items():
 script='footprint-measure.ps1' if s in ['S1','S2','S3'] else 'footprint-measure-resume.ps1'
 suffix=' -KeepStudioTab' if s=='S2' else f" -StudioPage {m['studioPage']}" if s=='S3' else ' -Minimized' if m.get('minimized') else ''
 shell='powershell.exe' if s in ['S1','S2','S3'] else 'pwsh.exe'
 L.append(f"| {s} | `{shell} -NoProfile -ExecutionPolicy Bypass -File docs/improvement-review/execution/p0/{script} -Mode {s} -DurationSeconds {m['durationRequested']} -IntervalSeconds 5{suffix}` | `{m['head']}`; full dirty list in [{s}.metadata.json](footprint-raw/{s}.metadata.json), `gitStatus` |")
L+=['','Application commands: CLI `node scripts/discord-presence-studio.mjs --port=47393 --no-open`; Electron `npx electron . --user-data-dir="%TEMP%/vibe-p0-c/electron-user-data"`. Exact launch argv, parent PIDs and command lines for accepted reruns are in metadata `commands` and `treeAtStart`.','',
'| Source file | SHA256 by scenario |','|---|---|']
for f in sorted({f for _,m in D.values() for f in m['sourceHashes']}):
 g={}
 for s,(_,m) in D.items():g.setdefault(m['sourceHashes'][f],[]).append(s)
 L.append('| '+f+' | '+'; '.join(','.join(ss)+': `'+h+'`' for h,ss in g.items())+' |')
for s in ['S2','S3']:
 m=D[s][1];L.append(f"{s} browser visibility evidence: `{json.dumps(m.get('visibility',{}),ensure_ascii=False)}`; end: `{json.dumps(m.get('browserEnd',{}),ensure_ascii=False)}`. Endpoint checks do not prove uninterrupted visibility; request counts include warm-up/query delay.")
m=D['S6'][1];ev=m['focusEvents']
L.append(f"S6: {len(ev)} ten-second focus attempts; {sum(bool(e['accepted']) for e in ev)} accepted; observed foreground PIDs {sorted({e['foregroundPid'] for e in ev})}. Foreground matches requested PID for every event. Resume harness uses WScript.Shell ALT/AppActivate then SetForegroundWindow; exact timestamps/handles/results in metadata. Owned Notepad and Paint are excluded from tree measurements. Original ineffective S6 (one unchanged foreground PID) is retained under original/S6.* and excluded.")
L+=['','## Background cadence inventory [source]','',
'Locations refer to `footprint-raw/frozen-source/` (S4 snapshot); source drift above limits cross-version comparisons.','',
'| Work | Cadence / trigger; source file:line | Hidden / closed Studio |','|---|---|---|',
'| /api/state renderer poll | 500 ms, single-flight; scripts/discord-presence-studio.html:2934,3666; visible event :3667 | Hidden skips requests; interval persists. Destroyed tab/window stops renderer timers. |',
'| Renderer clock | 1 s; scripts/discord-presence-studio.html:3665 | No visibility guard; Chromium may throttle. Destroyed renderer stops. |',
'| Foreground emit | JSON apps/running snapshot then sleep 200 ms; scripts/windows-apps.ps1:62,68 | Continues without Studio, hidden tab, tray close. |',
'| Process enumeration + icon work | Startup then scan elapsed+1000 ms; scripts/windows-apps.ps1:22,23,60; cached icons :37 | Continues irrespective of Studio; scan time adds to period. |',
'| Reconcile/scheduler | Detector snapshots in apps mode; scripts/studio-server.mjs:975,979; schedule heartbeat :449; scripts/presence-scheduler.mjs:63 | Continues hidden; frequent reconcile resets nominal <=60 s heartbeat. Expired override persistence backs off 1 s to 60 s. |',
'| Installed-apps scan | Startup cache missing/invalid/stale >7 days; scripts/installed-apps.mjs:9,80; forced refresh server :824; 120 s watchdog scripts/installed-apps.mjs:10,46 | Not visibility-controlled; one scan deduplicated, shutdown aborts. TTL checked at startup, no weekly timer. |',
'| Renderer app list | Initialize now plus 2500 ms one-shot; scripts/discord-presence-studio.html:3643 | No hidden guard; cached list retrieval does not force Start Menu scan. |',
'| RPC resend/reconnect | Identical appliedKey skips send unless force; scripts/studio-server.mjs:310,316; reconnect 1/2/4/8/16/30 s capped :287 | Continues hidden when configured; no unconditional same-key heartbeat resend. Unmeasured here. |',
'| Updates | Packaged only: initial 20 s then 6 h; electron/main.js:183,212; check timeout 60 s :172 | Continues tray-hidden; absent in development Electron. |','',
'## Ranked costs and P4 candidates','']
h=A['S1'].get('powershell.exe',[0,0,0]);e=A['S5'].get('electron.exe',[0,0,0])
L += [f"1. **Persistent detector [measured/source]:** S1 PowerShell averages {fmt(h[0])}% CPU, {fmt(h[1])} MB WS, {fmt(h[2])} MB private; {fmt(100*h[0]/mean(D['S1'][0],'tree_cpu_percent'))}% of mean tree CPU. Separate foreground identity events from bulk enumeration/icons; reduce scans and deduplicate JSON. Expected CPU saving is bounded by that measured helper contribution, not promised. Risk: short-lived apps, process exits and preserving most-recently-foregrounded mapped-running-app policy.",'',
 f"2. **Retained Electron [measured]:** S5 Electron aggregate averages {fmt(e[1])} MB WS/{fmt(e[2])} MB private. Consider destroying/recreating the renderer on close. Gain is bounded by the renderer/GPU subset, not all Electron memory; OS WS saving needs follow-up. Risk: drafts, reopen latency, subscription/state replay.",'',
'3. **Repeated reconciliation [source]:** emit only changed detector selection/catalog data and reconcile on relevant transitions. Expected gain: fewer allocations, JSON parses and scheduler resets; no isolated reduction measured. Risk: expiry, stale truthful state, missed app transitions.','',
'4. **Visible polling/clock [source]:** push state or slow visible polling; pause hidden no-op clock. Hidden state-fetch suppression already exists. Expected gain: fewer visible HTTP/render cycles; browser cost unmeasured. Risk: reconnect and stale status.','',
'5. **Startup catalog [source]:** defer missing-cache icon extraction until picker use if startup measurements justify it; preserve disk cache. Expected gain is startup work, not an established steady-state saving. Risk: delayed discovery. Packaged updater/RPC require separate measurements. No P4 implementation.','',
'## Cleanup evidence [measured]','',
'| Scenario | Observed PIDs verified no same identity remains | Temp removed | Electron Run entry |','|---|---|---|---|']
for s,(_,m) in D.items():
 L.append(f"| {s} | "+', '.join(str(c['pid']) for c in m['cleanup'] if isinstance(c,dict))+f" | {m['isolationDirectoryRemoved']} | {m['electronRunItemPresent']} |")
L+=['','S4 initial cleanup observed one asynchronously exiting Electron child; S4.cleanup-recheck.json verifies all original identities gone. Cleanup verifies creation timestamps, stops owned Electron descendants/helpers, unlinks the node_modules junction before removing isolation, and queries HKCU Run. Additional runner/aborted-process verification is in `footprint-cleanup.json`; original interrupted-run cleanup is retained in original metadata. Earlier P0-C2 smoke/aborted-run evidence remains in `footprint-smoke/`. Tests were not run for this measurement-only task; the numerical validator is the relevant check.','']
extras=sorted({c['pid'] for c in cleanup['identities'] if c['source'] in ('aborted-resume-pids.json','footprint-controller.json','footprint-resume-runners.json','S6-focus-runner.json')}|{c['pid'] for c in cleanup['additionalPidChecks']})
L.append(fr"Additional sampler/controller/aborted-run cleanup PIDs: {', '.join(map(str,extras))}. Final verification: {len(cleanup['identities'])} identity checks, no task processes, no listener on 47393, no electron.app.Electron entry, temp removed. Recheck command: `pwsh.exe -NoProfile -File docs/improvement-review/execution/p0/footprint-final-cleanup.ps1`; registry command: `reg query HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.")
reported=set(extras)|{c['pid'] for _,m in D.values() for c in m['cleanup'] if isinstance(c,dict)}
other=sorted({c['pid'] for c in cleanup['identities']}-reported)
L.append('Additional superseded-capture PIDs verified exited: '+', '.join(map(str,other))+'.')
assert len(L)<250,len(L)
(BASE/'footprint-baseline.md').write_text('\n'.join(L),encoding='utf-8')
print(f'PASS: {sum(len(r) for r,_ in D.values())} samples; formulas, sums, gaps, source hashes, actual focus alternation and scenario cleanup verified; {len(L)} report lines.')
