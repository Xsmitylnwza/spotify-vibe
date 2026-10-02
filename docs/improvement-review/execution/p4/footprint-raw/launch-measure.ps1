param([int]$Port=47396,[Parameter(Mandatory=$true)][string]$Directory,[Parameter(Mandatory=$true)][string]$OutDir)
$ErrorActionPreference='Stop'
$exe=Join-Path $Directory 'P4LaunchProbe.exe'
$compile=Join-Path $Directory 'compile-probe.ps1'
@'
param([string]$Output)
Add-Type -ReferencedAssemblies System.Windows.Forms,System.Drawing -OutputType WindowsApplication -OutputAssembly $Output -TypeDefinition @"
using System;
using System.Windows.Forms;
public class Probe {
 [STAThread] public static void Main() { Application.Run(new Form { Text="P4 owned launch latency probe", Width=360, Height=160 }); }
}
"@
'@ | Set-Content -LiteralPath $compile
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $compile -Output $exe
if($LASTEXITCODE -ne 0){throw 'Probe compilation failed'}
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class LaunchFocus {
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint id);
 public static uint Foreground() {uint id;GetWindowThreadProcessId(GetForegroundWindow(),out id);return id;}
}
'@
$cfg=Invoke-RestMethod "http://127.0.0.1:$Port/api/config"
$mappings=@($cfg.appMappings)+@(@{executable=$exe;name='P4 launch probe';enabled=$true;sceneId=$cfg.scenes[2].id})
$body=@{selectionMode='apps';mappings=$mappings}|ConvertTo-Json -Depth 8
[void](Invoke-RestMethod "http://127.0.0.1:$Port/api/app-mappings" -Method Put -ContentType 'application/json' -Body $body)
$events=@();$owned=@();$p=$null
try {
  for($i=0;$i -lt 3;$i++) {
    $clock=[Diagnostics.Stopwatch]::StartNew();$launched=[DateTime]::UtcNow.ToString('o')
    $p=Start-Process -FilePath $exe -PassThru
    $owned+=[pscustomobject]@{pid=$p.Id;created=$p.StartTime.ToUniversalTime().ToString('o')}
    $runningMs=$null;$selectedMs=$null;$exitMs=$null
    $shell=New-Object -ComObject WScript.Shell
    $shell.SendKeys('%');[void]$shell.AppActivate($p.Id)
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell)
    do {
      $p.Refresh();if($p.MainWindowHandle -ne 0){[void][LaunchFocus]::SetForegroundWindow($p.MainWindowHandle)}
      $apps=Invoke-RestMethod "http://127.0.0.1:$Port/api/apps"
      $state=Invoke-RestMethod "http://127.0.0.1:$Port/api/state"
      if($null -eq $runningMs -and $exe -in $apps.running){$runningMs=$clock.Elapsed.TotalMilliseconds}
      if($state.selectedApplication -eq 'P4 launch probe'){$selectedMs=$clock.Elapsed.TotalMilliseconds;break}
      Start-Sleep -Milliseconds 25
    } while($clock.Elapsed.TotalSeconds -lt 10)
    $foregroundPid=[LaunchFocus]::Foreground()
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    $exitClock=[Diagnostics.Stopwatch]::StartNew();$exitSamples=@()
    do {
      $apps=Invoke-RestMethod "http://127.0.0.1:$Port/api/apps"
      $state=Invoke-RestMethod "http://127.0.0.1:$Port/api/state"
      $exitSamples+=[pscustomobject]@{elapsedMs=$exitClock.Elapsed.TotalMilliseconds;runningPresent=($exe -in $apps.running);selectedApplication=$state.selectedApplication;helperError=$apps.error}
      if($exe -notin $apps.running -and $state.selectedApplication -ne 'P4 launch probe'){$exitMs=$exitClock.Elapsed.TotalMilliseconds;break}
      Start-Sleep -Milliseconds 25
    } while($exitClock.Elapsed.TotalSeconds -lt 10)
    $events+=[pscustomobject]@{attempt=$i+1;launched=$launched;pid=$p.Id;foregroundPid=$foregroundPid;runningLatencyMs=$runningMs;selectedLatencyMs=$selectedMs;exitLatencyMs=$exitMs;exitSamples=$exitSamples;fallback=$state.selectedApplication}
    $p=$null;Start-Sleep -Seconds 1
  }
} finally {
  if($p -and -not $p.HasExited){Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue}
  $cleanup=@($owned|ForEach-Object { $live=Get-Process -Id $_.pid -ErrorAction SilentlyContinue;[pscustomobject]@{pid=$_.pid;created=$_.created;stillSameIdentity=([bool]($live -and $live.StartTime.ToUniversalTime().ToString('o') -eq $_.created))} })
  @{events=$events;cleanup=$cleanup;mappingPath=$exe}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $OutDir 'launch-latency.json')
}
