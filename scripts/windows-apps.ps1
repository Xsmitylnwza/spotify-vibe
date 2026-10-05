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
using System.Text;
using System.Threading.Tasks;
public static class VibeForeground {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  delegate bool WindowProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(WindowProc callback, IntPtr p);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  public class App { public int Id; public string Path; public string ProcessName; public bool Visible; }
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint rights, bool inherit, int id);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] static extern bool QueryFullProcessImageNameW(IntPtr h, uint flags, StringBuilder path, ref uint length);
  [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr h, uint milliseconds);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  class Cached { public IntPtr Handle; public string Path; public string Name; }
  static volatile Dictionary<int,Cached> cache = new Dictionary<int,Cached>();
  static Task<App[]> pending;
  public static bool Pending { get { return pending != null; } }
  public static void BeginScan() { if(pending == null) pending=Task.Run(()=>Scan()); }
  public static App[] PollScan() {
    if(pending == null || !pending.IsCompleted) return null;
    var finished=pending; pending=null; return finished.GetAwaiter().GetResult();
  }
  public static App[] Scan() {
    var visible=new HashSet<int>();
    EnumWindows((h,p)=>{uint id;GetWindowThreadProcessId(h,out id);if(IsWindowVisible(h))visible.Add((int)id);return true;},IntPtr.Zero);
    var next=new Dictionary<int,Cached>(); var result=new List<App>();
    foreach(var process in Process.GetProcesses()) {
      try {
        Cached item;
        // Query-only + synchronize rights preserve path access without full-access handles.
        // A retained handle identifies the original process even after PID reuse.
        if(!cache.TryGetValue(process.Id,out item) || WaitForSingleObject(item.Handle,0) != 258) {
          var handle=OpenProcess(0x101000,false,process.Id); if(handle == IntPtr.Zero) continue;
          // Keep loader/alias identity used by existing mappings; probe once per PID.
          // Native paths can resolve junctions or renamed images differently.
          string value=null;
          try { value=process.MainModule.FileName; } catch { }
          if(String.IsNullOrEmpty(value)) {
            uint length=32768; var path=new StringBuilder((int)length);
            if(!QueryFullProcessImageNameW(handle,0,path,ref length)) { CloseHandle(handle); continue; }
            value=path.ToString();
          }
          item=new Cached {Handle=handle,Path=value,Name=System.IO.Path.GetFileNameWithoutExtension(value)};
        }
        next[process.Id]=item;
        result.Add(new App {Id=process.Id,Path=item.Path,ProcessName=item.Name,Visible=visible.Contains(process.Id)});
      } finally { process.Dispose(); }
    }
    foreach(var item in cache) if(!next.ContainsKey(item.Key) || next[item.Key]!=item.Value) CloseHandle(item.Value.Handle);
    cache=next; return result.ToArray();
  }
  public static string ForegroundPath(uint id) { Cached item; return cache.TryGetValue((int)id,out item) ? item.Path : ""; }
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint id);
}
'@
$scanClock = [System.Diagnostics.Stopwatch]::StartNew()
$nextScan = 0
$scanStarted = 0
$nextHeartbeat = 0
$lastKey = $null
$catalogKey = ""
$apps = @()
$running = @()
$hasCatalog = $false
while ($true) {
  try {
    [uint32]$foregroundProcessId = 0
    [void][VibeForeground]::GetWindowThreadProcessId([VibeForeground]::GetForegroundWindow(), [ref]$foregroundProcessId)
    # Cached process handles avoid repeated Path/MainWindowHandle/metadata probes.
    if (-not [VibeForeground]::Pending -and $scanClock.ElapsedMilliseconds -ge $nextScan) {
      [VibeForeground]::BeginScan()
      $scanStarted = $scanClock.ElapsedMilliseconds
      $nextScan = $scanStarted + 1000
    }
    # Collect finished work first; a delayed loop must not discard a completed scan.
    $completedScan = [VibeForeground]::PollScan()
    if ([VibeForeground]::Pending -and $scanClock.ElapsedMilliseconds - $scanStarted -ge 10000) {
      @{ apps=@(); running=@(); error='Windows process scan timed out.' } | ConvertTo-Json -Compress
      exit 1 # Node owns restart; heartbeats must not mask a hung bulk scan.
    }
    if ($null -ne $completedScan) {
    $processes = @($completedScan)
    $running = @($processes.Path | Sort-Object -Unique)
    $hasCatalog = $true
    # Metadata belongs to live executables, not every app ever seen by this helper.
    $livePaths = @{}
    foreach ($path in $running) { $livePaths[$path] = $true }
    foreach ($path in @($iconCache.Keys)) { if (-not $livePaths.ContainsKey($path)) { $iconCache.Remove($path) } }
    foreach ($path in @($nameCache.Keys)) { if (-not $livePaths.ContainsKey($path)) { $nameCache.Remove($path) } }
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
    }
    [void][VibeForeground]::GetWindowThreadProcessId([VibeForeground]::GetForegroundWindow(), [ref]$foregroundProcessId)
    $foreground = [VibeForeground]::ForegroundPath($foregroundProcessId)
    $key = $catalogKey + ':' + $foreground
    # Startup/restart has no evidence that apps closed until a full scan completes.
    # Publishing the initial empty arrays would erase the server's retained timers.
    if ($hasCatalog -and $key -ne $lastKey) {
      foreach ($app in $apps) { $app.foreground = ($app.processId -eq $foregroundProcessId) }
      @{ apps=$apps; running=$running; foregroundExecutable=$foreground; observedAt=[DateTime]::UtcNow.ToString('o') } | ConvertTo-Json -Depth 4 -Compress
      $lastKey = $key; $nextHeartbeat = $scanClock.ElapsedMilliseconds + 5000
    } elseif ($scanClock.ElapsedMilliseconds -ge $nextHeartbeat) {
      @{ heartbeat=$true; observedAt=[DateTime]::UtcNow.ToString('o') } | ConvertTo-Json -Compress
      $nextHeartbeat = $scanClock.ElapsedMilliseconds + 5000
    }
  } catch {
    @{ apps=@(); running=@(); error='Could not read visible Windows applications.' } | ConvertTo-Json -Compress
    exit 1 # Node restarts; only a fresh helper scan may restore healthy state.
  }
  Start-Sleep -Milliseconds 200
}
