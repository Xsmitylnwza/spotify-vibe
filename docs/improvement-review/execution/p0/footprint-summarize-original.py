"""Validate and summarize only the measured S1..S6 CSVs (standard library)."""
import csv, json, math, statistics, hashlib
from pathlib import Path
from datetime import datetime

BASE = Path(__file__).resolve().parent
RAW = BASE / 'footprint-raw'
MODES = ['S1','S2','S3','S4','S5','S6']
LABELS = ['CLI idle, no tab', 'CLI + visible Orca Studio', 'CLI + same Orca tab hidden', 'Electron visible idle', 'Electron close to tray', 'CLI + app focus alternation']

def avg(rows, key): return statistics.mean(float(r[key]) for r in rows)
def maximum(rows, key): return max(float(r[key]) for r in rows)
def p95(rows, key):
    ordered = sorted(float(r[key]) for r in rows)
    return ordered[math.ceil(.95*len(ordered))-1]
def f(value): return f'{value:.3f}'
def browser(meta, key):
    item = meta.get(key, {})
    return json.loads(item['result']) if item.get('result') else {}

data = {}
for mode in MODES:
    with (RAW/f'{mode}.csv').open(encoding='utf-8-sig', newline='') as handle:
        rows = list(csv.DictReader(handle))
    meta = json.loads((RAW/f'{mode}.metadata.json').read_text(encoding='utf-8-sig'))
    assert not meta['error'], (mode, meta['error'])
    assert len(rows) == (36 if mode=='S6' else 120), (mode,len(rows))
    assert meta['rows']==len(rows)
    assert meta['isolationDirectoryRemoved'] and not meta['electronRunItemPresent']
    assert not any(isinstance(x,dict) and x['stillSameIdentity'] for x in meta['cleanup'])
    for row in rows:
        cpu=float(row['tree_cpu_percent'])
        computed=100*float(row['tree_cpu_delta_seconds'])/(float(row['interval_seconds'])*meta['logicalProcessors'])
        assert math.isclose(cpu, computed, rel_tol=1e-10,abs_tol=1e-10), (mode,row['timestamp'],'cpu formula')
        detail=json.loads(row['per_process_json'])
        if isinstance(detail,dict): detail=[detail]
        assert math.isclose(cpu,sum(p['cpu_percent'] for p in detail),rel_tol=1e-10,abs_tol=1e-10)
        assert math.isclose(float(row['working_set_mb']),sum(p['ws_mb'] for p in detail),abs_tol=1e-8)
        assert math.isclose(float(row['private_mb']),sum(p['private_mb'] for p in detail),abs_tol=1e-8)
        assert int(row['process_count'])==len(detail)
        assert int(row['spawn_count'])==len([x for x in row['new_pids'].split(';') if x])
        assert cpu>=0 and 0<=float(row['machine_cpu_percent'])<=100
    data[mode]=(rows,meta)

lines=['# P0-C2: Windows background footprint baseline','',
'[measured] All five ten-minute scenarios completed with 120 interval samples each; S6 completed the specified three minutes with 36 samples. No scenario was shortened. Only measurement scripts, raw evidence, source snapshots, and this report were written under execution/p0; no application source edits or commits were made by this worker.','',
'## Scope and reproducibility','',
'The initial repository inspection was clean at HEAD `b401d34b523f8b1e219985d3cca6e54a7dfb8d8b`. Other workers began changing source before the baseline launches. Each scenario records its launch-time HEAD, complete Git status, source SHA256 hashes, and copied source in `footprint-raw/Sn-source/`; the measurements describe the code loaded at that scenario launch, not a frozen clean HEAD. Hash differences below are a comparison limitation.','',
'Each run uses `%TEMP%\\vibe-p0-c` with isolated presence-config.json, secrets.json and electron-user-data. PRESENCE_CONFIG_PATH and PRESENCE_SECRETS_PATH point there; PRESENCE_STUDIO_PORT=47393, PRESENCE_AUTOSTART_DISABLE=1, PRESENCE_DISABLE_DEFAULT_APPLICATION=1. PRESENCE_APP_DETECTION_DISABLE is unset, so detection remains enabled. Electron receives a preseeded `vibe-electron.json` containing `{"loginItemDefaultApplied":true}`. No ports 17345/17346/47391/47392 or owner profile/secrets were used.','',
'**Limitation:** another worker owns the real Discord presence. These runs have no configured Discord ID and do not connect or send real RPC activity. RPC reconnect/delivery costs and packaged update-network costs are source-only, unmeasured. S6 exercises detection and foreground changes with an unmapped isolated profile; it does not measure mapped-scene RPC delivery.','',
'S1/S2/S3/S6 metrics cover the launched Node process and its descendants. The Orca browser renderer is shared IDE infrastructure and is outside that tree; S2/S3 are companion-under-browser-workload measurements, not total browser-plus-companion RAM/CPU. S4/S5 include the full npx/cmd/Node/Electron descendant tree, including GPU/renderer processes and the detection helper. Test apps and the measurement runner itself are excluded from tree totals and included in machine CPU context.','',
'Win32_Process ParentProcessId is walked afresh every sample. CPU uses per-identity deltas of TotalProcessorTime, summed across the tree, divided by actual sample interval × logical processor count × 100. Creation timestamps protect PID reuse. New processes first observed during an interval contribute accumulated CPU only when created after the previous sample. Processes that both start and exit between samples, and final CPU after the last observation of an exited process, cannot be recovered by this snapshot method; CPU and spawn rates are observed lower bounds in that case. Initial tree members and warm-up/startup spawns are excluded from the CSV new-PID count and listed in cleanup metadata instead. WS sums include shared pages counted once per process; private memory is summed PrivateMemorySize64, not private working set.','',
'Machine CPU comes from GetSystemTimes deltas: 100 × (delta(kernel+user) − delta(idle)) / delta(kernel+user), where kernel includes idle. The sampler performs CIM enumeration once each five seconds; its own overhead remains in machine CPU. Each scenario has a short setup/warm-up before its measured interval. The rows are interval-ending observations, not cumulative CPU seconds.','',
'Recompute and validate: `python docs/improvement-review/execution/p0/footprint-summarize.py`. This validates every CSV CPU formula, per-process CPU/WS/private sum, process count, spawn count, sample count, and cleanup flags before writing this report. Averages are arithmetic sample means; p95 is nearest rank ceil(0.95 × n); spawns/min = sum(spawn_count) × 60 / sum(interval_seconds). Displayed values are rounded to three decimals; raw CSV values remain full precision.','',
'## Scenario results [measured]','',
'| Scenario | Samples | CPU avg % | CPU p95 % | CPU max % | WS avg MB | WS max MB | Private avg MB | Private max MB | Threads avg | Handles avg | Processes avg/max | Spawns/min |',
'|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
for mode in MODES:
    rows,meta=data[mode]
    elapsed=sum(float(r['interval_seconds']) for r in rows)
    metrics=[avg(rows,'tree_cpu_percent'),p95(rows,'tree_cpu_percent'),maximum(rows,'tree_cpu_percent'),avg(rows,'working_set_mb'),maximum(rows,'working_set_mb'),avg(rows,'private_mb'),maximum(rows,'private_mb'),avg(rows,'threads'),avg(rows,'handles')]
    lines.append(f'| {mode}: {LABELS[MODES.index(mode)]} | {len(rows)} | '+ ' | '.join(f(v) for v in metrics)+f" | {f(avg(rows,'process_count'))}/{int(maximum(rows,'process_count'))} | {f(sum(int(r['spawn_count']) for r in rows)*60/elapsed)} |")
lines+=['','## Machine context and wall-clock windows [measured]','',
'All timestamps below are UTC (local Windows offset was +07:00). Start/end delimit samples and exclude setup/cleanup.','',
'| Scenario | Start UTC | End UTC | Sum intervals s | Logical CPUs | Machine CPU avg % | Machine p95 % | Machine max % |','|---|---|---|---:|---:|---:|---:|---:|']
for mode in MODES:
    rows,meta=data[mode]
    lines.append(f"| {mode} | {meta['start']} | {meta['end']} | {f(sum(float(r['interval_seconds']) for r in rows))} | {meta['logicalProcessors']} | {f(avg(rows,'machine_cpu_percent'))} | {f(p95(rows,'machine_cpu_percent'))} | {f(maximum(rows,'machine_cpu_percent'))} |")
lines+=['','These are serial measurements on an actively used workstation, with other workers and applications running. Differences between scenarios are descriptive, not causal estimates; machine CPU context and source drift prevent claiming all differences came from tab/window visibility.','',
'## Process attribution [measured]','',
'Each name is aggregated within each sample, then averaged over all scenario samples (absent processes contribute zero). All values derive from per_process_json in the CSV.','',
'| Scenario | Process name | Avg CPU % | Avg WS MB | Avg private MB |','|---|---|---:|---:|---:|']
attribution={}
for mode in MODES:
    rows,meta=data[mode]; totals={}
    for row in rows:
        detail=json.loads(row['per_process_json'])
        if isinstance(detail,dict):detail=[detail]
        for p in detail:
            sums=totals.setdefault(p['name'],[0.,0.,0.])
            for index,key in enumerate(['cpu_percent','ws_mb','private_mb']): sums[index]+=p[key]
    attribution[mode]={name:[v/len(rows) for v in sums] for name,sums in totals.items()}
    for name,metrics in sorted(attribution[mode].items(),key=lambda item:-item[1][0]):
        lines.append(f'| {mode} | {name} | '+' | '.join(f(v) for v in metrics)+' |')
lines+=['','## Visibility, focus and commands [measured]','']
for mode in MODES:
    rows,meta=data[mode]
    lines.append(f'### {mode}')
    lines.append('')
    suffix=' -KeepStudioTab' if mode=='S2' else f" -StudioPage {meta['studioPage']}" if mode=='S3' else ''
    lines.append(f"`powershell.exe -NoProfile -ExecutionPolicy Bypass -File docs/improvement-review/execution/p0/footprint-measure.ps1 -Mode {mode} -DurationSeconds {meta['durationRequested']} -IntervalSeconds 5{suffix}`")
    lines.append('')
    for command in meta['commands']:lines.append(f'Application launch: `{command}`.')
    if mode in ('S2','S3'):
        lines.append(f"Orca page `{meta['studioPage']}`; beginning visibility: `{json.dumps(browser(meta,'visibility'))}`; end resource-timing/visibility observation: `{json.dumps(browser(meta,'browserEnd'))}`. S2's tab was retained and reloaded by S3; S3 switched to a newly created about:blank tab. Resource timing is cleared before warm-up, so request count covers warm-up plus measured window plus final query delay, not exactly the CSV interval. Visibility is verified at endpoints; uninterrupted intermediate visibility was not independently recorded.")
    if mode in ('S4','S5'):lines.append(f"Owned visible top-level window count at sample start: {meta['visibleWindowCount']}. S5 posts WM_CLOSE to owned Electron windows, exercising the close-to-tray path; the live process tree remains sampled.")
    if mode=='S6':
        events=meta['focusEvents'];foregrounds=sorted(set(e['foregroundPid'] for e in events))
        lines.append(f"Launched Notepad and Paint; {len(events)} focus attempts at approximately ten-second intervals; successful SetForegroundWindow returns: {sum(bool(e['accepted']) for e in events)}; observed foreground PIDs: {foregrounds}. Exact event timestamps, handles, and resulting foreground PIDs are in S6.metadata.json. These app processes are excluded from companion totals and stopped during cleanup.")
    lines+=['',f"HEAD: `{meta['head']}`. Git status at launch:",'','```text',meta['gitStatus'] or '(clean)','```','']
lines+=['## Source drift [source]','',
'Hashes come from the metadata captured immediately before each launch; copied source is retained alongside each CSV. Lines cited below refer to S1-source unless explicitly labeled.','',
'| Source file | Unique launch-time SHA256 values |','|---|---|']
files=sorted(set().union(*(set(meta['sourceHashes']) for _,meta in data.values())))
for path in files:
    grouped={}
    for mode,(_,meta) in data.items():
        digest=meta['sourceHashes'].get(path)
        if digest:grouped.setdefault(digest,[]).append(mode)
    lines.append('| '+path+' | '+'; '.join(f"{','.join(modes)}: `{digest}`" for digest,modes in grouped.items())+' |')
lines+=['','## Background cadence inventory [source]','',
'Source copies were read directly. Visibility affects the renderer only; the companion helpers remain alive until server shutdown. Browser engines may throttle hidden timers independently of application logic.','',
'| Work | Cadence / trigger | Hidden Studio / close-to-tray | Read source location |','|---|---|---|---|',
'| Renderer state fetch | 500 ms interval, document.hidden guard; one in-flight poll; immediate poll when visible again | Hidden skips fetches; interval itself stays registered. Tray-hidden Electron renderer retained. A truly destroyed tab removes renderer timers. | scripts/discord-presence-studio.html:2934-2952,3665-3667 |',
'| Renderer clock | 1000 ms interval; updates status text / legacy now-pin when present | No document.hidden guard; browser may throttle. Destroyed tab stops it. | scripts/discord-presence-studio.html:2372-2403,3665 |',
'| Windows foreground emission | GetForegroundWindow and JSON snapshot every loop, followed by 200 ms sleep (actual period also includes work) | Continues with no tab, hidden tab and tray-hidden Electron | scripts/windows-apps.ps1:17-22,62-68; windows-apps.mjs:10-18 |',
'| Full Windows process enumeration + icons | Due once at startup then nextScan=elapsed+1000 ms; Get-Process, paths, visible windows, cached icons | Continues regardless of Studio visibility; synchronous scan length adds latency | scripts/windows-apps.ps1:22-60 |',
'| Foreground stability | Requires >=200 ms stable candidate in received snapshots; no separate timer | Continues on detector snapshots | scripts/app-presence.mjs:38-46 |',
'| Presence reconcile | Every detector snapshot in apps mode, even if unchanged; scheduler reset by reconcile | Continues hidden; approximately detector emission cadence, not a measured fixed rate | scripts/studio-server.mjs:472-490,975-980 |',
'| Presence heartbeat / expiry retry | Up to 60000 ms normally; earlier slot/override boundary, minimum 250 ms; expired-override persistence retries 1s exponential to 60s cap | No visibility guard. Frequent detector reconcile continually resets heartbeat; do not add this nominal rate to detection as an independently observed wakeup | scripts/presence-scheduler.mjs:63-66; studio-server.mjs:449-461 |',
'| RPC resend and reconnect | Same active appliedKey skips SET_ACTIVITY; forced publish/save/connect or changed desired key can send; reconnect uses 1/2/4/8/16/30 s then 30 s cap when configured | Continues hidden; no unconditional periodic resend of identical key | scripts/studio-server.mjs:277-294,306-342,388-417 |',
'| Discord RPC library connection | Each connect has an unref 10000 ms timeout; IPC responds to inbound PING with PONG, with no scheduled IPC ping interval in this library | Independent of visibility; not exercised without client ID | node_modules/discord-rpc/src/client.js:94-110; transports/ipc.js:122-128,166-168 |',
'| Installed-apps catalog | Startup loads disk cache; absent/invalid/stale (>7 days) cache launches one Start Menu scan; explicit /api/installed-apps?refresh=1 forces refresh; concurrent scans deduplicated; scan watchdog 120000 ms | Scan continues hidden; server shutdown aborts scan. Weekly TTL is checked at startup, not a weekly interval | scripts/installed-apps.mjs:9-10,28-76,80-111; studio-server.mjs:824-830,720,983 |',
'| Renderer application list | initialize calls refreshApplications immediately and once after 2500 ms; manual refresh button fetches /api/apps and cached /api/installed-apps | One-shot refresh has no hidden guard; ordinary list fetch does not force catalog rescan | scripts/discord-presence-studio.html:3564-3576,3643-3644 |',
'| Electron updater | Packaged app only: first check after 20000 ms, then every 6h; 60000 ms request watchdog; autoDownload=false | Continues hidden in packaged app; absent in this npx Electron development run | electron/main.js:163-181,183-214 |',
'| User-action one-shot renderer timers | Save debounce 650 ms; GIF search 250/650 ms; zero-delay modal/validation/GIF/onboarding focus | No recurring idle work; pending action timer may complete hidden | scripts/discord-presence-studio.html:1430,1587,2438,2445,2839,3071,3080,3852 |',
'| Conditional server timers | HTTP body watchdog 5000 ms; /api/quit delay 50 ms; shutdown deadline 3000 ms | Triggered by requests/shutdown, not idle periodic loops | scripts/studio-server.mjs:538,735,931-934 |',
'| Electron smoke-only delays | did-finish-load waits 2500 ms, fallback 15000 ms | Only --smoke-test; these baseline scenarios did not use smoke mode | electron/main.js:351-352 |','',
'Full captured file prefix: `docs/improvement-review/execution/p0/footprint-raw/S1-source/`. Line ranges above describe read spans, not automated source-string tests. Source changes are recorded by hash; the measured costs are independent CSV facts.','',
'## Ranked costs and P4 candidates','']
helper=attribution['S1'].get('powershell.exe',[0,0,0])
total=avg(data['S1'][0],'tree_cpu_percent')
electron=attribution['S5'].get('electron.exe',[0,0,0])
lines += [
f"1. **Persistent Windows detector CPU [measured]:** S1 helper mean {f(helper[0])}% CPU, {f(helper[1])} MB WS, {f(helper[2])} MB private; helper share of tree mean CPU {f(100*helper[0]/total)}%. Its process enumeration, icon-bearing JSON serialization and whole-machine scans run with no Studio. **Candidate [estimate]:** separate cheap foreground identity events from bulk app enumeration/icon snapshots; enumerate less frequently or on process events and emit only meaningful changes. The measured helper CPU is the upper bound available to remove ({f(helper[0])}% machine-normalized CPU), not a promised gain. Risk: missed short-lived apps, process-start delay and breaking most-recently-foregrounded mapped-running-app selection; preserve the existing policy and stable-focus debounce.",
'',
f"2. **Electron retained memory [measured]:** tray-hidden S5 Electron processes average {f(electron[1])} MB WS and {f(electron[2])} MB private (excluding non-Electron helpers/wrappers). **Candidate [estimate]:** destroy the renderer window on close and recreate from local state on open, while retaining companion/tray. Potential removable memory is bounded above by the renderer/GPU fraction of this Electron aggregate, not the whole figure; PID-level JSON supports further attribution. Risk: reopen latency, preserving drafts, IPC subscriptions and update-state replay. Do not claim OS memory savings from WS sums without a follow-up test.",
'',
'3. **Repeated JSON/presence work [source, measured helper attribution above]:** detector emits icon-bearing snapshots every roughly 200 ms and Node reconciles every received snapshot. **Candidate [estimate]:** send icons/catalog separately, deduplicate unchanged snapshots and reconcile only selection/override/config changes. Expected gain is fewer allocations/serializations and scheduler resets; no standalone measured reduction is claimed. Risk: stale UI, delayed expiry, missing app-exit transitions and incorrect selected-running-app history.',
'',
'4. **Visible renderer polling [source]:** /api/state every 500 ms plus an unguarded 1 s clock. Hidden fetch suppression already exists, so removing hidden fetches is not a new P4 gain. **Candidate [estimate]:** push state changes (SSE/local bridge) or reduce visible polling frequency, and suspend no-op clock updates in app mode/hidden state. Expected gain: fewer visible request/render cycles; companion CSV differences are confounded and exclude browser renderer cost. Risk: reconnect state, missed updates and stale truthful status; retain single-flight and immediate refresh on visibility.',
'',
'5. **Startup installed-app scan / packaged updates [source]:** short-lived scan and update checks are not steady polling loops. **Candidate [estimate]:** retain disk cache and defer missing-cache icon extraction until Studio requests the catalog, if startup cost proves material in a separate startup capture. Risk: empty initial picker or delayed discovery. These idle CSVs start after warm-up and do not establish startup peak cost or real updater/RPC load; no priority gain number is invented.','',
'No P4 changes were implemented.','',
'## Cleanup and validation evidence [measured]','',
'Every observed PID is recorded with name and creation time; cleanup checked that the same identity no longer exists. All per-scenario isolation directories were removed, and each post-run HKCU Run check found no electron.app.Electron item.','',
'| Scenario | Observed PIDs checked exited | Directory removed | Electron Run item present |','|---|---|---|---|']
for mode,(_,meta) in data.items():
    pids=[str(x['pid']) for x in meta['cleanup'] if isinstance(x,dict)]
    lines.append(f"| {mode} | {', '.join(pids)} | {meta['isolationDirectoryRemoved']} | {meta['electronRunItemPresent']} |")
lines += ['','Pre-baseline CLI/browser smoke runs and the discarded CPU-overload partial run are separately documented in footprint-smoke; their numbers are not reused in any table. The partial CSV was removed and all its observed processes were explicitly checked exited in footprint-smoke/aborted-S1-cleanup.json. Application tests were not required for this measurement-only task; the script itself ran through every scenario and this numerical validator passed.','']
(BASE/'footprint-baseline.md').write_text('\n'.join(lines),encoding='utf-8')
print('PASS: all 636 raw samples, CPU formulas, process aggregates, spawn counts and per-scenario cleanup flags validated; report regenerated from CSVs.')

