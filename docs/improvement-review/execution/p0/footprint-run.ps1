$ErrorActionPreference='Stop'
Set-Location C:\letmecook-lab\spotify-vibe
$out=Join-Path $PSScriptRoot 'footprint-raw'
$lastBeat=[DateTime]::UtcNow
function Tick([string]$Mode,[int]$Runner=0) {
  if(([DateTime]::UtcNow-$script:lastBeat).TotalSeconds -ge 280) {
    & orca orchestration send --from term_059a90b3-9f93-43b2-b4e4-5a10e6117948 --dispatch-capability dcap_Ln3JBPLAhgYly_ivdxURYs4oCMT1iB4MQWvrhv1Iwjw --type heartbeat --subject alive --task-id task_cfba5809c55a --dispatch-id ctx_72991f9b77fb --phase reviewing
    & orca orchestration check --terminal term_059a90b3-9f93-43b2-b4e4-5a10e6117948 --json | Add-Content (Join-Path $PSScriptRoot 'footprint-inbox.log')
    $script:lastBeat=[DateTime]::UtcNow
  }
  $csv=Join-Path $out "$Mode.csv";$rows=0
  if(Test-Path $csv){$rows=@(Import-Csv $csv).Count}
  Write-Output "$([DateTimeOffset]::Now.ToString('o')) $Mode rows=$rows runner=$Runner"
}
# S1 was launched from the dispatched terminal and is already measuring.
while(-not(Test-Path (Join-Path $out 'S1.metadata.json'))){Tick 'S1';Start-Sleep -Seconds 30}
$s1=Get-Content (Join-Path $out 'S1.metadata.json') -Raw | ConvertFrom-Json
if($s1.error -or $s1.rows -ne 120){throw 'S1 failed acceptance.'}
foreach($mode in @('S2','S3','S4','S5','S6')) {
  $existing=Join-Path $out "$mode.metadata.json"
  if(Test-Path $existing){$done=Get-Content $existing -Raw | ConvertFrom-Json;if(-not $done.error -and $done.rows -eq $(if($mode -eq 'S6'){36}else{120})){Write-Output "$mode already complete; preserving measured CSV";continue}}
  & orca orchestration check --terminal term_059a90b3-9f93-43b2-b4e4-5a10e6117948 --json | Add-Content (Join-Path $PSScriptRoot 'footprint-inbox.log')
  $duration=600;if($mode -eq 'S6'){$duration=180}
  $args='-NoProfile -ExecutionPolicy Bypass -File "'+(Join-Path $PSScriptRoot 'footprint-measure.ps1')+'" -Mode '+$mode+' -DurationSeconds '+$duration+' -IntervalSeconds 5'
  if($mode -eq 'S2'){$args+=' -KeepStudioTab'}
  if($mode -eq 'S3'){$s2=Get-Content (Join-Path $out 'S2.metadata.json') -Raw | ConvertFrom-Json;$args+=' -StudioPage '+$s2.studioPage}
  $runner=Start-Process powershell.exe -ArgumentList $args -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $out "$mode.runner.log") -RedirectStandardError (Join-Path $out "$mode.runner-error.log")
  # Retain the process handle: Windows PowerShell otherwise may lose ExitCode.
  $runnerHandle=$runner.Handle
  do {Tick $mode $runner.Id;Start-Sleep -Seconds 30;$runner.Refresh()}while(-not $runner.HasExited)
  $runner.WaitForExit()
  $meta=Get-Content (Join-Path $out "$mode.metadata.json") -Raw | ConvertFrom-Json
  if($runner.ExitCode -ne 0 -or $meta.error -or $meta.rows -ne ($duration/5)){throw "$mode failed acceptance: $($meta.error); runner exit=$($runner.ExitCode)"}
}
Write-Output 'ALL SIX SCENARIOS COMPLETE'
