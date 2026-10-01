$ErrorActionPreference='Stop'
Set-Location -LiteralPath C:\letmecook-lab\spotify-vibe
$base=$PSScriptRoot;$raw=Join-Path $base 'footprint-raw'
$all=@(Get-CimInstance Win32_Process)
$records=@()
foreach($file in @(Get-ChildItem $raw -Filter '*.metadata.json')+@(Get-ChildItem (Join-Path $raw 'original') -Filter '*.metadata.json')) {
 $m=Get-Content $file.FullName -Raw | ConvertFrom-Json
 foreach($c in $m.cleanup){if($c -isnot [string]){$records+=[pscustomobject]@{pid=$c.pid;created=$c.created;name=$c.name;source=$file.Name}}}
}
foreach($c in @(Get-Content (Join-Path $base 'aborted-resume-pids.json') -Raw | ConvertFrom-Json)){$records+=[pscustomobject]@{pid=$c.ProcessId;created=$c.CreationDate;name=$c.Name;source='aborted-resume-pids.json'}}
foreach($f in @('footprint-controller.json','footprint-resume-runners.json','S6-focus-runner.json')) {
 foreach($c in @(Get-Content (Join-Path $base $f) -Raw | ConvertFrom-Json)){$records+=[pscustomobject]@{pid=$c.pid;created=$c.created;name='measurement runner';source=$f}}
}
$checks=@()
foreach($r in $records){
 $live=@($all | Where-Object {$_.ProcessId -eq $r.pid})
 $same=[bool]($live.Count -and $live[0].CreationDate.ToUniversalTime().Ticks -eq ([datetime]$r.created).ToUniversalTime().Ticks)
 $checks+=[pscustomobject]@{pid=$r.pid;created=$r.created;name=$r.name;source=$r.source;stillSameIdentity=$same}
}
$extra=@();foreach($id in @(44200,30800)){$extra+=[pscustomobject]@{pid=$id;present=[bool](@($all | Where-Object {$_.ProcessId -eq $id}).Count)}}
$reg=@(& reg query HKCU\Software\Microsoft\Windows\CurrentVersion\Run 2>&1)
$hasRun=[bool]($reg | Where-Object {"$_" -match '^\s+electron\.app\.Electron\s'})
$remaining=@($all | Where-Object {$_.ProcessId -ne $PID -and $_.CommandLine -match '\\vibe-p0-c\\app\\|footprint-measure-resume.ps1|footprint-resume-run.ps1'} | Select-Object ProcessId,Name)
$result=[ordered]@{checkedAt=[datetimeoffset]::Now.ToString('o');identities=$checks;additionalPidChecks=$extra;remainingTaskProcesses=$remaining;tempRemoved=(-not(Test-Path -LiteralPath (Join-Path $env:TEMP 'vibe-p0-c')));electronRunItemPresent=$hasRun;isolatedPortListening=[bool](Get-NetTCPConnection -LocalPort 47393 -State Listen -ErrorAction SilentlyContinue)}
$result | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $base 'footprint-cleanup.json')
if(@($checks | Where-Object {$_.stillSameIdentity}).Count -or @($extra | Where-Object {$_.present}).Count -or $remaining.Count -or -not $result.tempRemoved -or $hasRun -or $result.isolatedPortListening){throw 'Final cleanup verification failed; see footprint-cleanup.json'}
Write-Output "PASS cleanup: $($checks.Count) identity checks; additional runner/helper PIDs absent; temp removed; no Electron Run entry; port 47393 clear"
