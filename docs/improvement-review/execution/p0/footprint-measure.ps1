param(
  [Parameter(Mandatory=$true)][ValidateSet('S1','S2','S3','S4','S5','S6')][string]$Mode,
  [ValidateRange(5,86400)][int]$DurationSeconds = 600,
  [ValidateRange(1,60)][int]$IntervalSeconds = 5,
  [int]$Port = 47393,
  [string]$OutDir = '',
  [string]$StudioPage = '',
  [switch]$KeepStudioTab
)
$ErrorActionPreference = 'Stop'
if ($Port -ne 47393) { throw 'This isolated baseline is restricted to port 47393.' }
$repo = 'C:\letmecook-lab\spotify-vibe'
Set-Location -LiteralPath $repo
if(-not $OutDir){$OutDir=Join-Path $PSScriptRoot 'footprint-raw'}
$allowed = [IO.Path]::GetFullPath((Join-Path $repo 'docs\improvement-review\execution\p0'))
$OutDir = [IO.Path]::GetFullPath($OutDir.Replace('/', '\'))
if (-not $OutDir.StartsWith($allowed + [IO.Path]::DirectorySeparatorChar)) { throw 'OutDir must be under execution/p0.' }
[void](New-Item -ItemType Directory -Force -Path $OutDir)
$d = Join-Path $env:TEMP 'vibe-p0-c'
if (Test-Path -LiteralPath $d) { throw "Isolation directory already exists: $d; verify old processes before removing it." }
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw 'Isolated port is already occupied.' }
Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class FootprintNative {
 [DllImport("kernel32.dll")] static extern bool GetSystemTimes(out long idle, out long kernel, out long user);
 public static long[] Cpu() { long i,k,u; if(!GetSystemTimes(out i,out k,out u)) throw new Exception("GetSystemTimes failed"); return new long[]{i,k+u}; }
 public delegate bool EnumProc(IntPtr h,IntPtr p);
 [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc c,IntPtr p);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int c);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 public static IntPtr[] Windows(int[] pids) { var a=new List<IntPtr>(); EnumWindows((h,p)=>{uint id;GetWindowThreadProcessId(h,out id);if(Array.IndexOf(pids,(int)id)>=0 && IsWindowVisible(h))a.Add(h);return true;},IntPtr.Zero);return a.ToArray(); }
 public static uint ForegroundPid() { uint p;GetWindowThreadProcessId(GetForegroundWindow(),out p);return p; }
}
'@
function Tree([int]$Root) {
  $all = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,CreationDate,Name)
  $ids = [Collections.Generic.HashSet[int]]::new(); [void]$ids.Add($Root)
  do { $changed=$false; foreach($p in $all) { if($ids.Contains([int]$p.ParentProcessId) -and $ids.Add([int]$p.ProcessId)) {$changed=$true} } } while($changed)
  @($all | Where-Object {$ids.Contains([int]$_.ProcessId)})
}
function Invoke-FootprintOrca([string[]]$Arguments) {
  $result = & orca @Arguments
  if($LASTEXITCODE -ne 0) { throw "Orca failed: $result" }
  ((($result -join "`n") | ConvertFrom-Json).result)
}
$known = @{}; $extra = @(); $pages = @(); $root = $null; $metadata = [ordered]@{mode=$Mode;durationRequested=$DurationSeconds;intervalRequested=$IntervalSeconds;logicalProcessors=[Environment]::ProcessorCount;launchAt=[DateTimeOffset]::Now.ToString('o');head=(& git rev-parse HEAD);gitStatus=(@(& git status --short) -join "`n");sourceHashes=@{};commands=@();focusEvents=@();cleanup=@();error=$null}
$sourceDir=Join-Path $OutDir "$Mode-source"
foreach($f in @('electron/main.js','electron/lifecycle.mjs','electron/preload.cjs','scripts/studio-server.mjs','scripts/discord-presence-studio.html','scripts/windows-apps.ps1','scripts/windows-apps.mjs','scripts/installed-apps.mjs','scripts/presence-scheduler.mjs','scripts/app-presence.mjs','scripts/local-config-store.mjs','scripts/app-secrets.mjs')) {
  if(Test-Path -LiteralPath $f){$metadata.sourceHashes[$f]=(Get-FileHash -LiteralPath $f -Algorithm SHA256).Hash;$dest=Join-Path $sourceDir $f;[void](New-Item -ItemType Directory -Force -Path (Split-Path $dest));Copy-Item -LiteralPath $f -Destination $dest}
}
$previousEnv=@{}
foreach($key in @('PRESENCE_CONFIG_PATH','PRESENCE_SECRETS_PATH','PRESENCE_STUDIO_PORT','PRESENCE_AUTOSTART_DISABLE','PRESENCE_DISABLE_DEFAULT_APPLICATION','PRESENCE_APP_DETECTION_DISABLE')) {$previousEnv[$key]=[Environment]::GetEnvironmentVariable($key)}
try {
  [void](New-Item -ItemType Directory -Path $d)
  $env:PRESENCE_CONFIG_PATH=Join-Path $d 'presence-config.json';$env:PRESENCE_SECRETS_PATH=Join-Path $d 'secrets.json';$env:PRESENCE_STUDIO_PORT="$Port";$env:PRESENCE_AUTOSTART_DISABLE='1';$env:PRESENCE_DISABLE_DEFAULT_APPLICATION='1';Remove-Item Env:PRESENCE_APP_DETECTION_DISABLE -ErrorAction SilentlyContinue
  if($Mode -in @('S4','S5')) {
    $userData=Join-Path $d 'electron-user-data';[void](New-Item -ItemType Directory -Path $userData)
    [IO.File]::WriteAllText((Join-Path $userData 'vibe-electron.json'),'{"loginItemDefaultApplied":true}')
    $args='/d /s /c ""C:\Program Files\nodejs\npx.cmd" electron . --user-data-dir="'+$userData+'""'
    $metadata.commands += 'npx electron . --user-data-dir="'+$userData+'"'
    $root=Start-Process -FilePath cmd.exe -ArgumentList $args -WindowStyle Hidden -PassThru -RedirectStandardOutput "$OutDir/$Mode.stdout.log" -RedirectStandardError "$OutDir/$Mode.stderr.log"
  } else {
    $metadata.commands += "node scripts/discord-presence-studio.mjs --port=$Port --no-open"
    $root=Start-Process -FilePath node -ArgumentList @('scripts/discord-presence-studio.mjs',"--port=$Port",'--no-open') -WindowStyle Hidden -PassThru -RedirectStandardOutput "$OutDir/$Mode.stdout.log" -RedirectStandardError "$OutDir/$Mode.stderr.log"
  }
  $metadata.rootPid=$root.Id
  $ready=$false
  for($i=0;$i -lt 45;$i++) {
    foreach($p in @(Tree $root.Id)) {$known[[int]$p.ProcessId]=$p}
    try {$state=Invoke-RestMethod "http://127.0.0.1:$Port/api/state"; $ready=$true;break} catch {Start-Sleep -Seconds 1}
  }
  if(-not $ready) {throw 'Isolated server did not become ready.'}
  $metadata.runtimeSetup=$state.setup
  if($Mode -in @('S2','S3')) {
    if(-not $StudioPage) {
      $tab=Invoke-FootprintOrca @('tab','create','--url',"http://127.0.0.1:$Port/",'--json')
      $metadata.tabCreate=$tab
      $StudioPage=$tab.browserPageId
      if(-not $StudioPage) {throw 'Could not resolve created Studio tab.'}
    } else {[void](Invoke-FootprintOrca @('reload','--page',$StudioPage,'--json'))}
    $metadata.studioPage=$StudioPage;$pages += $StudioPage
    [void](Invoke-FootprintOrca @('tab','switch','--page',$StudioPage,'--focus','--json'))
    Start-Sleep -Seconds 3
    if($Mode -eq 'S3') {
      $metadata.blankTab=Invoke-FootprintOrca @('tab','create','--url','about:blank','--json')
      $blank=$metadata.blankTab.browserPageId
      if(-not $blank) {throw 'Could not resolve blank tab.'};$pages += $blank
      [void](Invoke-FootprintOrca @('tab','switch','--page',$blank,'--focus','--json'))
    }
    $metadata.visibility=Invoke-FootprintOrca @('eval','--page',$StudioPage,'--expression','JSON.stringify({hidden:document.hidden,visibilityState:document.visibilityState,url:location.href})','--json')
    [void](Invoke-FootprintOrca @('eval','--page',$StudioPage,'--expression','performance.setResourceTimingBufferSize(10000);performance.clearResourceTimings();JSON.stringify({hidden:document.hidden})','--json'))
  }
  if($Mode -in @('S4','S5')) {
    Start-Sleep -Seconds 5
    $tree=@(Tree $root.Id);foreach($p in $tree){$known[[int]$p.ProcessId]=$p}
    $wins=@([FootprintNative]::Windows([int[]]@($tree.ProcessId)))
    if(-not $wins.Count) {throw 'No visible Electron window found.'}
    if($Mode -eq 'S5') {foreach($w in $wins){[void][FootprintNative]::PostMessage($w,0x10,[IntPtr]::Zero,[IntPtr]::Zero)};Start-Sleep -Seconds 2}
    $metadata.visibleWindowCount=@([FootprintNative]::Windows([int[]]@($tree.ProcessId))).Count
    if($Mode -eq 'S5' -and $metadata.visibleWindowCount -gt 0) {throw 'Electron did not hide to tray.'}
  }
  if($Mode -eq 'S6') {
    foreach($app in @('notepad.exe','mspaint.exe')) {
      $p=Start-Process -FilePath $app -PassThru
      $extra += $p
      Start-Sleep -Seconds 3
      foreach($c in @(Tree $p.Id)) {$known[[int]$c.ProcessId]=$c}
    }
    $appIds=@($known.Values | Where-Object {$_.Name -in @('notepad.exe','mspaint.exe','Notepad.exe') } | ForEach-Object {[int]$_.ProcessId})
    $focusWindows=@([FootprintNative]::Windows([int[]]$appIds))
    if($focusWindows.Count -lt 2){throw 'Need two owned app windows for focus alternation.'}
  }
  # Warm-up is outside the measured window; each CSV row is an interval delta.
  Start-Sleep -Seconds 2
  $previous=@{};$seen=[Collections.Generic.HashSet[string]]::new()
  function Snapshot {
    $map=@{};$ws=0L;$private=0L;$threads=0;$handles=0;$count=0
    foreach($c in @(Tree $root.Id)) {
      $known[[int]$c.ProcessId]=$c
      try {
        $p=Get-Process -Id $c.ProcessId -ErrorAction Stop;$p.Refresh()
        $identity="$($c.ProcessId):$($c.CreationDate.ToUniversalTime().Ticks)"
        $map[$identity]=[pscustomobject]@{pid=[int]$c.ProcessId;name=$c.Name;cpu=$p.TotalProcessorTime.TotalSeconds;created=$c.CreationDate.ToUniversalTime();ws=$p.WorkingSet64/1MB;private=$p.PrivateMemorySize64/1MB}
        $ws+=$p.WorkingSet64;$private+=$p.PrivateMemorySize64;$threads+=$p.Threads.Count;$handles+=$p.HandleCount;$count++
      } catch { }
    }
    [pscustomobject]@{map=$map;ws=$ws;private=$private;threads=$threads;handles=$handles;count=$count;time=[DateTime]::UtcNow;machine=[FootprintNative]::Cpu()}
  }
  $prev=Snapshot;foreach($key in $prev.map.Keys){[void]$seen.Add($key)}
  $metadata.start=$prev.time.ToString('o');$clock=[Diagnostics.Stopwatch]::StartNew();$nextFocus=0;$nextSample=$IntervalSeconds;$sampleIndex=0
  $csv=Join-Path $OutDir "$Mode.csv";if(Test-Path -LiteralPath $csv){Remove-Item -LiteralPath $csv}
  while($sampleIndex -lt [Math]::Floor($DurationSeconds/$IntervalSeconds)) {
    if($Mode -eq 'S6' -and $clock.Elapsed.TotalSeconds -ge $nextFocus) {
      $w=$focusWindows[([int]($nextFocus/10)) % $focusWindows.Count]
      [void][FootprintNative]::ShowWindow($w,9);$ok=[FootprintNative]::SetForegroundWindow($w)
      $metadata.focusEvents += [pscustomobject]@{timestamp=[DateTime]::UtcNow.ToString('o');requestedHandle=$w.ToInt64();accepted=$ok;foregroundPid=[FootprintNative]::ForegroundPid()}
      $nextFocus+=10
    }
    if($clock.Elapsed.TotalSeconds -lt $nextSample){Start-Sleep -Milliseconds 100;continue}
    $cur=Snapshot;$elapsed=($cur.time-$prev.time).TotalSeconds;$delta=0.0;$new=@();$detail=@()
    foreach($key in $cur.map.Keys) {
      $part=0.0
      if($prev.map.ContainsKey($key)) {$part = [double]$cur.map[$key].cpu-[double]$prev.map[$key].cpu;if($part -lt 0){$part=0.0}}
      elseif($cur.map[$key].created -ge $prev.time) {$part = $cur.map[$key].cpu}
      $delta += $part
      $detail += [ordered]@{pid=$cur.map[$key].pid;name=$cur.map[$key].name;cpu_percent=100*$part/($elapsed*[Environment]::ProcessorCount);ws_mb=$cur.map[$key].ws;private_mb=$cur.map[$key].private}
      if($seen.Add($key)) {$new += $cur.map[$key].pid}
    }
    $total=$cur.machine[1]-$prev.machine[1];$idle=$cur.machine[0]-$prev.machine[0]
    $row=[pscustomobject][ordered]@{timestamp=$cur.time.ToString('o');interval_seconds=$elapsed;tree_cpu_percent=100*$delta/($elapsed*[Environment]::ProcessorCount);working_set_mb=$cur.ws/1MB;private_mb=$cur.private/1MB;threads=$cur.threads;handles=$cur.handles;process_count=$cur.count;new_pids=($new -join ';');spawn_count=$new.Count;machine_cpu_percent=100*($total-$idle)/$total;tree_cpu_delta_seconds=$delta;tree_pids=(@($cur.map.Values.pid | Sort-Object) -join ';');per_process_json=($detail | ConvertTo-Json -Compress -Depth 4)}
    $row | Export-Csv -LiteralPath $csv -NoTypeInformation -Append -Encoding UTF8
    $prev=$cur;$sampleIndex++;$nextSample+=$IntervalSeconds
    if($sampleIndex % 12 -eq 0){Write-Output "$Mode rows=$sampleIndex elapsed=$([Math]::Round($clock.Elapsed.TotalSeconds,1))"}
    if($cur.count -eq 0){throw 'Measured process tree exited.'}
  }
  $metadata.end=$prev.time.ToString('o');$metadata.rows=$sampleIndex
  if($Mode -in @('S2','S3')) {$metadata.browserEnd=Invoke-FootprintOrca @('eval','--page',$StudioPage,'--expression',"JSON.stringify({hidden:document.hidden,visibilityState:document.visibilityState,stateRequests:performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/api/state').length})",'--json')}
} catch {$metadata.error=$_.Exception.Message;throw} finally {
  foreach($page in $pages) {if($Mode -eq 'S2' -and $KeepStudioTab -and $page -eq $StudioPage){continue};try{[void](Invoke-FootprintOrca @('tab','close','--page',$page,'--json'))}catch{$metadata.cleanup += "Tab cleanup error: $_"}}
  if($root){foreach($p in @(Tree $root.Id)){$known[[int]$p.ProcessId]=$p}}
  foreach($p in $extra){foreach($c in @(Tree $p.Id)){$known[[int]$c.ProcessId]=$c}}
  # Kill only observed identities, rejecting recycled PIDs, and repeat for late descendants.
  foreach($id in @($known.Keys | Sort-Object -Descending)) {
    $observed=$known[$id];$live=Get-CimInstance Win32_Process -Filter "ProcessId=$id" -ErrorAction SilentlyContinue
    if($live -and $live.CreationDate -eq $observed.CreationDate){Stop-Process -Id $id -Force -ErrorAction SilentlyContinue}
    $left=Get-CimInstance Win32_Process -Filter "ProcessId=$id" -ErrorAction SilentlyContinue
    $metadata.cleanup += [pscustomobject]@{pid=$id;name=$observed.Name;created=$observed.CreationDate.ToUniversalTime().ToString('o');stillSameIdentity=([bool]($left -and $left.CreationDate -eq $observed.CreationDate))}
  }
  $metadata.cleanupAt=[DateTimeOffset]::Now.ToString('o')
  $run=Get-ItemProperty HKCU:/Software/Microsoft/Windows/CurrentVersion/Run -ErrorAction SilentlyContinue
  $metadata.electronRunItemPresent=([bool]($run.PSObject.Properties.Name -contains 'electron.app.Electron'))
  $resolved=[IO.Path]::GetFullPath($d);$expected=[IO.Path]::GetFullPath((Join-Path $env:TEMP 'vibe-p0-c'))
  if($resolved -eq $expected -and $resolved.StartsWith([IO.Path]::GetFullPath($env:TEMP)+[IO.Path]::DirectorySeparatorChar)){Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction SilentlyContinue}
  $metadata.isolationDirectoryRemoved=(-not (Test-Path -LiteralPath $d))
  foreach($key in $previousEnv.Keys){[Environment]::SetEnvironmentVariable($key,$previousEnv[$key])}
  $metadata | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $OutDir "$Mode.metadata.json") -Encoding UTF8
}

