$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Drawing

# Enumerate installed apps from Start Menu shortcuts (all users + current user).
# Resolves each .lnk target, extracts a 48px PNG icon, and emits JSON:
# [{ name, executable, icon }] where icon is a data:image/png;base64 URL or null.
$shell = New-Object -ComObject WScript.Shell
$menuBases = @(
  (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs'),
  (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs')
)

function Get-IconDataUrl([string]$exePath) {
  try {
    $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
    if ($null -eq $icon) { return $null }
    $bmp = $icon.ToBitmap()
    $resized = New-Object System.Drawing.Bitmap(48, 48)
    $g = [System.Drawing.Graphics]::FromImage($resized)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($bmp, 0, 0, 48, 48)
    $g.Dispose(); $bmp.Dispose(); $icon.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()
    $b64 = [Convert]::ToBase64String($ms.ToArray())
    $ms.Dispose()
    return 'data:image/png;base64,' + $b64
  } catch { return $null }
}

$seen = @{}
$apps = @()
foreach ($base in $menuBases) {
  if (-not (Test-Path $base)) { continue }
  Get-ChildItem -Path $base -Filter *.lnk -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      $name = $_.BaseName
      if (-not $name) { return }
      $shortcut = $shell.CreateShortcut($_.FullName)
      $target = $shortcut.TargetPath
      if (-not $target) { return }
      # Expand environment variables and resolve relative targets.
      $target = [System.Environment]::ExpandEnvironmentVariables($target)
      if (-not [System.IO.Path]::IsPathRooted($target)) {
        $target = Join-Path (Split-Path $_.FullName -Parent) $target
      }
      if (-not (Test-Path $target -PathType Leaf)) { return }
      $ext = [System.IO.Path]::GetExtension($target).ToLower()
      if ($ext -notin '.exe', '.bat', '.cmd') { return }
      $key = $target.ToLower()
      if ($seen.ContainsKey($key)) { return }
      $seen[$key] = $true
      # Skip uninstallers and helpers.
      if ($name -match '(?i)uninstall|uninstaller|remove|help|support|readme|documentation|license|website|homepage|update') { return }
      $apps += @{
        name = $name
        executable = $target
        icon = (Get-IconDataUrl $target)
      }
    } catch { }
  }
}

# Most-used first: alphabetical is a fine stable default for search.
$apps = $apps | Sort-Object { $_.name }
$apps | ConvertTo-Json -Depth 3 -Compress
