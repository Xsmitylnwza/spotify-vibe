$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Drawing
$iconCache = @{}
$nameCache = @{}
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Collections.Generic;
using System.Diagnostics;
public static class VibeForeground {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  delegate bool WindowProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(WindowProc callback, IntPtr p);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  public class App { public int Id; public string Path; public string ProcessName; public bool Visible; }
  class Cached { public Process Process; public string Path; }
  static Dictionary<int,Cached> cache = new Dictionary<int,Cached>();
  public static App[] Scan() {
    var visible=new HashSet<int>();
    EnumWindows((h,p)=>{uint id;GetWindowThreadProcessId(h,out id);if(IsWindowVisible(h))visible.Add((int)id);return true;},IntPtr.Zero);
    var next=new Dictionary<int,Cached>(); var result=new List<App>();
    foreach(var process in Process.GetProcesses()) {
      try {
        Cached item;
        // A retained process handle identifies the original process even after PID reuse.
        if(!cache.TryGetValue(process.Id,out item) || item.Process.HasExited) {
          item=new Cached {Process=process,Path=process.MainModule.FileName};
          var retainedHandle=process.Handle;
        }
        next[process.Id]=item;
        result.Add(new App {Id=process.Id,Path=item.Path,ProcessName=System.IO.Path.GetFileNameWithoutExtension(item.Path),Visible=visible.Contains(process.Id)});
        if(item.Process!=process) process.Dispose();
      } catch { process.Dispose(); }
    }
    foreach(var item in cache) if(!next.ContainsKey(item.Key) || next[item.Key]!=item.Value) item.Value.Process.Dispose();
    cache=next; return result.ToArray();
  }
  public static string ForegroundPath(uint id) { Cached item; return cache.TryGetValue((int)id,out item) ? item.Path : ""; }
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint id);
}
'@
$scanClock = [System.Diagnostics.Stopwatch]::StartNew()
$nextScan = 0
$nextHeartbeat = 0
$lastKey = $null
$catalogKey = ""
$apps = @()
$running = @()
while ($true) {
  try {
    [uint32]$foregroundProcessId = 0
    [void][VibeForeground]::GetWindowThreadProcessId([VibeForeground]::GetForegroundWindow(), [ref]$foregroundProcessId)
    # Cached process handles avoid repeated Path/MainWindowHandle/metadata probes.
    if ($scanClock.ElapsedMilliseconds -ge $nextScan) {
    $processes = @([VibeForeground]::Scan())
    $running = @($processes.Path | Sort-Object -Unique)
    $apps = @($processes | Where-Object { $_.Visible } | ForEach-Object {
      try {
        if ($_.Path -and $_.ProcessName -ne 'ApplicationFrameHost') {
          $appPath = $_.Path
          if (-not $nameCache.ContainsKey($appPath)) {
          $displayName = $_.ProcessName
          if ($appPath -match '\\OpenAI\.Codex_[^\\]+\\') { $displayName = 'Codex' }
          elseif ($displayName -eq 'chrome') { $displayName = 'Google Chrome' }
          elseif ($displayName -eq 'RobloxPlayerBeta') { $displayName = 'Roblox' }
          elseif ($displayName -eq 'explorer') { $displayName = 'File Explorer' }
          elseif ($displayName -eq 'SystemSettings') { $displayName = 'Windows Settings' }
          elseif ($displayName -eq 'electron' -and $appPath -match '\\([^\\]+)\\desktop\\node_modules\\electron\\') { $displayName = $Matches[1] }
            $nameCache[$appPath] = $displayName
          }
          $displayName = $nameCache[$appPath]
          if (-not $iconCache.ContainsKey($appPath)) {
            $iconCache[$appPath] = $null
            try {
              $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($appPath)
              $bitmap = $icon.ToBitmap()
              $stream = [System.IO.MemoryStream]::new()
              try {
                $canvas = [System.Drawing.Bitmap]::new(128,128)
                $graphics = [System.Drawing.Graphics]::FromImage($canvas)
                try { $graphics.Clear([System.Drawing.Color]::White); $graphics.DrawImage($bitmap,16,16,96,96); $canvas.Save($stream,[System.Drawing.Imaging.ImageFormat]::Png) }
                finally { $graphics.Dispose(); $canvas.Dispose() }
                $iconCache[$appPath] = 'data:image/png;base64,' + [Convert]::ToBase64String($stream.ToArray())
              }
              finally { $stream.Dispose(); $bitmap.Dispose(); $icon.Dispose() }
            } catch { }
            if ($displayName -eq 'Codex') {
              $approvedIcon = Join-Path $PSScriptRoot '../public/art/apps/codex.png'
              if (Test-Path -LiteralPath $approvedIcon) { $iconCache[$appPath] = 'data:image/png;base64,' + [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($approvedIcon)) }
            }
          }
          [pscustomobject]@{ name=$displayName; executable=$appPath; icon=$iconCache[$appPath]; processId=$_.Id; foreground=($_.Id -eq $foregroundProcessId) }
        }
      } catch { }
    })
    $catalogKey = ($running -join '|') + ':' + (($apps | ForEach-Object { "$($_.executable):$($_.processId)" } | Sort-Object) -join '|')
    $nextScan = $scanClock.ElapsedMilliseconds + 1000
    }
    [void][VibeForeground]::GetWindowThreadProcessId([VibeForeground]::GetForegroundWindow(), [ref]$foregroundProcessId)
    $foreground = [VibeForeground]::ForegroundPath($foregroundProcessId)
    $key = $catalogKey + ':' + $foreground
    if ($key -ne $lastKey) {
      foreach ($app in $apps) { $app.foreground = ($app.processId -eq $foregroundProcessId) }
      @{ apps=$apps; running=$running; foregroundExecutable=$foreground; observedAt=[DateTime]::UtcNow.ToString('o') } | ConvertTo-Json -Depth 4 -Compress
      $lastKey = $key; $nextHeartbeat = $scanClock.ElapsedMilliseconds + 5000
    } elseif ($scanClock.ElapsedMilliseconds -ge $nextHeartbeat) {
      @{ heartbeat=$true; observedAt=[DateTime]::UtcNow.ToString('o') } | ConvertTo-Json -Compress
      $nextHeartbeat = $scanClock.ElapsedMilliseconds + 5000
    }
  } catch {
    @{ apps=@(); running=@(); error='Could not read visible Windows applications.' } | ConvertTo-Json -Compress
  }
  Start-Sleep -Milliseconds 200
}
