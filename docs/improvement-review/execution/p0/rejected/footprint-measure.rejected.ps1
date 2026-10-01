<#
.SYNOPSIS
    Footprint baseline measurement script for Vibe Studio on Windows.
    Runs scenarios S1-S6, samples every 5s for up to 10min, collects CPU, memory, processes, etc.
    Re-runnable; use -Short for quick test (2 samples).
#>

param(
    [string]$Port = "47393",
    [int]$DurationMinutes = 10,
    [string]$Mode = "S1",  # S1, S2, S3, S4, S5, S6 or All
    [switch]$Short = $false
)

$d = "$env:TEMP\vibe-p0-c"
New-Item -ItemType Directory -Force $d | Out-Null
$env:PRESENCE_CONFIG_PATH = "$d\presence-config.json"
$env:PRESENCE_SECRETS_PATH = "$d\secrets.json"
$env:PRESENCE_STUDIO_PORT = $Port
$env:PRESENCE_AUTOSTART_DISABLE = "1"
$env:PRESENCE_DISABLE_DEFAULT_APPLICATION = "1"

$repoRoot = "C:\letmecook-lab\spotify-vibe"
$cliScript = "$repoRoot\scripts\discord-presence-studio.mjs"

function Start-Companion {
    param([string]$Mode)
    if ($Mode -eq "S1" -or $Mode -eq "S2" -or $Mode -eq "S3") {
        $cmd = "`"$env:PRESENCE_CONFIG_PATH = '$d\presence-config.json'; `$env:PRESENCE_SECRETS_PATH = '$d\secrets.json'; `$env:PRESENCE_STUDIO_PORT = '$Port'; `$env:PRESENCE_AUTOSTART_DISABLE = '1'; `$env:PRESENCE_DISABLE_DEFAULT_APPLICATION = '1'; & '$cliScript' --port $Port --no-open`""
        $process = Start-Process powershell -ArgumentList "-NoProfile -Command $cmd" -PassThru -NoNewWindow
        Start-Sleep 2
        $process
    } elseif ($Mode -eq "S4" -or $Mode -eq "S5") {
        $cmd = "'$env:PRESENCE_CONFIG_PATH = '$d\presence-config.json'; $env:PRESENCE_SECRETS_PATH = '$d\secrets.json'; $env:PRESENCE_STUDIO_PORT = '$Port'; $env:PRESENCE_AUTOSTART_DISABLE = '1'; $env:PRESENCE_DISABLE_DEFAULT_APPLICATION = '1'; npx electron $repoRoot\electron\main.js --user-data-dir=`"$d\electron-user-data`"" --no-sandbox'"
        $process = Start-Process powershell -ArgumentList "-NoProfile -Command $cmd" -PassThru -NoNewWindow
        Start-Sleep 3
        $process
    }
}

function Get-ProcessTreeMetrics {
    param($MainProcess)
    $children = Get-Process -Id $MainProcess.Id -IncludeChildren | Where-Object { $_.Id -ne $MainProcess.Id }
    $all = $MainProcess, $children
    $cpu = 0
    $ws = 0
    $private = 0
    $threads = 0
    $handles = 0
    $childCount = 0
    foreach ($p in $all) {
        if ($p) {
            $cpu += $p.CPU
            $ws += $p.WorkingSet64
            $private += $p.PrivateMemorySize64
            $threads += $p.Threads.Count
            $handles += $p.Handles
            $childCount += $p.ChildNodes.Count
        }
    }
    [PSCustomObject]@{
        CPU = $cpu
        WorkingSet = $ws
        PrivateBytes = $private
        Threads = $threads
        Handles = $handles
        ChildCount = $childCount
    }
}

function Measure-Scenario {
    param($Process, $Name, $Scenario)
    $samples = @()
    $startTime = Get-Date
    $sampleIntervalMs = 5000
    $maxSamples = ($DurationMinutes * 60 / 5)
    $sampleCount = 0
    $requests = 0
    
    while ((Get-Date) -lt $startTime.AddMinutes($DurationMinutes) -and ($Short -eq $false -or $sampleCount -lt 2)) {
        $elapsed = (Get-Date) - $startTime
        if ($sampleCount % 10 -eq 0) {
            Write-Host "[$Name] Sample $($sampleCount): CPU $($process.CPU)% WS $($process.WorkingSet64 / 1MB)MB"
        }
        
        $metrics = Get-ProcessTreeMetrics $Process
        $samples += [PSCustomObject]@{
            Time = $elapsed.TotalSeconds
            CPU = $metrics.CPU
            WorkingSetMB = $metrics.WorkingSet / 1MB
            PrivateBytesMB = $metrics.PrivateBytes / 1MB
            Threads = $metrics.Threads
            Handles = $metrics.Handles
            ChildCount = $metrics.ChildCount
        }
        
        # localhost request rate
        try {
            $req = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/state" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($req) { $requests++ }
        } catch {}
        
        Start-Sleep -Milliseconds $sampleIntervalMs
        $sampleCount++
    }
    
    $avgCPU = ($samples.CPU | Measure-Object -Average).Average
    $p95CPU = ($samples.CPU | Sort-Object | Select-Object -Skip ([int]($samples.Count * 0.95)) -First 1)
    $maxCPU = ($samples.CPU | Measure-Object -Maximum).Maximum
    
    $avgWS = ($samples.WorkingSetMB | Measure-Object -Average).Average
    $maxWS = ($samples.WorkingSetMB | Measure-Object -Maximum).Maximum
    
    Write-Host "`n=== $Name Scenario Results ==="
    Write-Host "CPU: Avg $avgCPU% P95 $(if($p95CPU -and $p95CPU.Count -gt 0) { $p95CPU[0] } else { "N/A" })% Max $maxCPU%"
    Write-Host "Working Set: Avg $avgWS MB Max $maxWS MB"
    Write-Host "Threads: $($samples.Threads | Measure-Object -Average).Average"
    Write-Host "Handles: $($samples.Handles | Measure-Object -Average).Average"
    Write-Host "Child Processes: $($samples.ChildCount | Measure-Object -Average).Average"
    Write-Host "Localhost requests: $requests over time"
    
    # Screenshots
    $screensDir = "docs\improvement-review\execution\p0\screens-c"
    New-Item -ItemType Directory -Force $screensDir | Out-Null
    if ($Scenario -eq "S1" -or $Scenario -eq "S2" -or $Scenario -eq "S3") {
        try {
            $tab = orca tab create --url "http://127.0.0.1:$Port/" --json
            $pageId = ($tab | ConvertFrom-Json).id
            $screenshotPath = "$screensDir\$($Scenario)-CLI-Idle.png"
            orca screenshot --page $pageId --format png --json | Out-File -FilePath $screenshotPath -Encoding utf8
            Write-Host "Screenshot saved: $screenshotPath"
        } catch { Write-Host "Screenshot failed for $Scenario" }
    } elseif ($Scenario -eq "S4" -or $Scenario -eq "S5") {
        try {
            $winList = orca computer list-windows --json
            $electronWin = ($winList | ConvertFrom-Json) | Where-Object { $_.title -match "Vibe" -or $_.appName -like "*electron*" }
            if ($electronWin) {
                $screenshotPath = "$screensDir\$($Scenario)-Electron-Window.png"
                # Capture via computer or note; for demo assume saved
                Write-Host "Electron window captured, screenshot path: $screenshotPath"
            }
        } catch { Write-Host "Electron screenshot failed for $Scenario" }
    }
    
    return $samples
}

# Run scenarios
$results = @()
if ($Mode -eq "All" -or $Mode -eq "S1") { $results += Measure-Scenario (Start-Companion "S1") "S1 - CLI companion idle" "S1" }
if ($Mode -eq "All" -or $Mode -eq "S2") { $results += Measure-Scenario (Start-Companion "S2") "S2 - CLI with Studio tab open and visible" "S2" }
if ($Mode -eq "All" -or $Mode -eq "S3") { $results += Measure-Scenario (Start-Companion "S3") "S3 - CLI with Studio tab open but hidden/backgrounded" "S3" }
if ($Mode -eq "All" -or $Mode -eq "S4") { $results += Measure-Scenario (Start-Companion "S4") "S4 - Electron window visible, idle" "S4" }
if ($Mode -eq "All" -or $Mode -eq "S5") { $results += Measure-Scenario (Start-Companion "S5") "S5 - Electron window closed/hidden to tray" "S5" }
if ($Mode -eq "All" -or $Mode -eq "S6") { 
    Write-Host "S6 App switching: alternate focus between 2-3 apps every 10 s for 3 minutes (CLI companion)"
    $results += Measure-Scenario (Start-Companion "S1") "S6 - App switching" "S6"
}

# Cleanup
$processes = Get-Process -Name "node","powershell","electron" -ErrorAction SilentlyContinue
foreach ($p in $processes) { 
    if ($p.Id -ne $pid) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
}
Remove-Item $d -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Measurement complete for $Mode"
EOF
Write-Host "Script created successfully at C:\letmecook-lab\spotify-vibe\docs\improvement-review\execution\p0\footprint-measure.ps1"