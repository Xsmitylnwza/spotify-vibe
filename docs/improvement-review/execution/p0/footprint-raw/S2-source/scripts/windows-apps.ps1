$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Drawing
$iconCache = @{}
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class VibeForeground {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint id);
}
'@
$scanClock = [System.Diagnostics.Stopwatch]::StartNew()
$nextScan = 0
$apps = @()
$running = @()
while ($true) {
  try {
    [uint32]$foregroundProcessId = 0
    [void][VibeForeground]::GetWindowThreadProcessId([VibeForeground]::GetForegroundWindow(), [ref]$foregroundProcessId)
    # Sample focus cheaply; enumerate processes and extract icons only once a second.
    if ($scanClock.ElapsedMilliseconds -ge $nextScan) {
    $processes = @(Get-Process)
    $running = @($processes | ForEach-Object { try { if ($_.Path) { $_.Path } } catch { } } | Sort-Object -Unique)
    $apps = @($processes | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object {
      try {
        if ($_.Path -and $_.ProcessName -ne 'ApplicationFrameHost') {
          $appPath = $_.Path
          $displayName = $_.ProcessName
          if ($appPath -match '\\OpenAI\.Codex_[^\\]+\\') { $displayName = 'Codex' }
          elseif ($displayName -eq 'chrome') { $displayName = 'Google Chrome' }
          elseif ($displayName -eq 'RobloxPlayerBeta') { $displayName = 'Roblox' }
          elseif ($displayName -eq 'explorer') { $displayName = 'File Explorer' }
          elseif ($displayName -eq 'SystemSettings') { $displayName = 'Windows Settings' }
          elseif ($displayName -eq 'electron' -and $appPath -match '\\([^\\]+)\\desktop\\node_modules\\electron\\') { $displayName = $Matches[1] }
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
    $nextScan = $scanClock.ElapsedMilliseconds + 1000
    }
    [void][VibeForeground]::GetWindowThreadProcessId([VibeForeground]::GetForegroundWindow(), [ref]$foregroundProcessId)
    foreach ($app in $apps) { $app.foreground = ($app.processId -eq $foregroundProcessId) }
    @{ apps=$apps; running=$running; observedAt=[DateTime]::UtcNow.ToString('o') } | ConvertTo-Json -Depth 4 -Compress
  } catch {
    @{ apps=@(); error='Could not read visible Windows applications.' } | ConvertTo-Json -Compress
  }
  Start-Sleep -Milliseconds 200
}
