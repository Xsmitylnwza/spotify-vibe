param([int]$S4Runner=39632)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath C:\letmecook-lab\spotify-vibe
$base=$PSScriptRoot;$raw=Join-Path $base 'footprint-raw'
$script:lastBeat=[datetime]::UtcNow
$owned=@();$script:runnerRecords=@()
function Pulse([string]$mode) {
 if(([datetime]::UtcNow-$script:lastBeat).TotalSeconds -ge 270){
  & orca orchestration send --from term_c00fbde6-415e-42a9-a3cf-9b3d7cea3559 --dispatch-capability dcap_t9wAB7RYgYxWq4QlQMDjdSB6d5Nf_RpSezL0rN9Lmuo --type heartbeat --subject alive --task-id task_ac6d13cc1cca --dispatch-id ctx_9d4788f97917 --phase reviewing
  $script:lastBeat=[datetime]::UtcNow
 }
 $rows=0;if(Test-Path (Join-Path $raw "$mode.csv")){$rows=@(Import-Csv (Join-Path $raw "$mode.csv")).Count}
 Write-Output "$([datetimeoffset]::Now.ToString('o')) $mode rows=$rows"
}
function WaitRunner([int]$id,[string]$mode){
 $proc=Get-Process -Id $id -ErrorAction SilentlyContinue
 if($proc){$script:runnerRecords += [pscustomobject]@{pid=$id;created=$proc.StartTime.ToUniversalTime().ToString('o');mode=$mode}}
 while(Get-Process -Id $id -ErrorAction SilentlyContinue){Pulse $mode;Start-Sleep -Seconds 20}
}
function RunMode([string]$mode,[switch]$Minimized){
 & orca orchestration check --terminal term_c00fbde6-415e-42a9-a3cf-9b3d7cea3559 --json | Add-Content (Join-Path $base 'footprint-resume-inbox.log')
 $seconds=600;if($mode -eq 'S6'){$seconds=180}
 $args=@('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $base 'footprint-measure-resume.ps1'),'-Mode',$mode,'-DurationSeconds',"$seconds")
 if($Minimized){$args+='-Minimized'}
 $p=Start-Process pwsh.exe -WindowStyle Hidden -ArgumentList $args -PassThru -RedirectStandardOutput (Join-Path $raw "$mode.resume.log") -RedirectStandardError (Join-Path $raw "$mode.resume-error.log")
 WaitRunner $p.Id $mode
 Get-Content (Join-Path $raw "$mode.metadata.json") -Raw | ConvertFrom-Json
}
try {
 WaitRunner $S4Runner 'S4'
 $m=Get-Content (Join-Path $raw 'S4.metadata.json') -Raw | ConvertFrom-Json
 if($m.error -or $m.rows -ne 120 -or -not $m.frozenHashes){throw "S4 rerun failed: $($m.error)"}
 $m=RunMode 'S5'
 if($m.error){
  & orca orchestration send --from term_c00fbde6-415e-42a9-a3cf-9b3d7cea3559 --dispatch-capability dcap_t9wAB7RYgYxWq4QlQMDjdSB6d5Nf_RpSezL0rN9Lmuo --type status --subject 'S5 replay failed; minimized fallback' --body "Frozen close-to-tray replay failed: $($m.error); evidence retained under replay-failed, proceeding with explicitly labeled minimized measurement." --task-id task_ac6d13cc1cca --dispatch-id ctx_9d4788f97917
  $failed=Join-Path $raw 'replay-failed';[void](New-Item -ItemType Directory -Force -Path $failed)
  Get-ChildItem (Join-Path $raw 'S5.*') | Copy-Item -Destination $failed
  $m=RunMode 'S5' -Minimized
 }
 if($m.error -or $m.rows -ne 120){throw "S5 failed: $($m.error)"}
 $m=RunMode 'S6'
 if($m.error -or $m.rows -ne 36){throw "S6 failed: $($m.error)"}
 Write-Output 'ALL REQUIRED CAPTURES COMPLETE'
} finally {
 $script:runnerRecords | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $base 'footprint-resume-runners.json')
}
