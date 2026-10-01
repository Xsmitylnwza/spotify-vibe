$ErrorActionPreference='Stop'
$aborted=@(9152,392,37728,29644,35864)
if(@(Get-Process -Id $aborted -ErrorAction SilentlyContinue).Count){throw 'Aborted measurement processes remain alive.'}
$target=Join-Path $env:TEMP 'vibe-p0-c'
$resolved=(Resolve-Path -LiteralPath $target).Path
if($resolved -ne 'C:\Users\golfp\AppData\Local\Temp\vibe-p0-c'){throw 'Unexpected cleanup path.'}
Remove-Item -LiteralPath $resolved -Recurse -Force
$csv=Join-Path $PSScriptRoot 'footprint-raw\S1.csv'
if(Test-Path -LiteralPath $csv){Remove-Item -LiteralPath $csv}
[pscustomobject]@{abortedPids=$aborted;allExited=$true;tempRemoved=(-not(Test-Path -LiteralPath $target));reason='PowerShell Math.Max overload selected integer; partial CSV discarded before baseline restart'} | ConvertTo-Json | Set-Content (Join-Path $PSScriptRoot 'footprint-smoke\aborted-S1-cleanup.json')
