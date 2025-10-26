<#
  Packs the MV3 extension folder into a downloadable zip exposed by the app.

  Output: public\asuka-clipper.zip (served at /asuka-clipper.zip)

  Usage:
    powershell -ExecutionPolicy Bypass -File scripts\pack-extension.ps1
    powershell -ExecutionPolicy Bypass -File scripts\pack-extension.ps1 -DestinationZip .\public\my-asuka-clipper.zip
#>

[CmdletBinding()]
param(
  [string]$DestinationZip = (Join-Path (Join-Path (Get-Location) 'public') 'asuka-clipper.zip')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = (Get-Location).Path
$extDir = Join-Path $root 'extension'
$publicDir = Join-Path $root 'public'

if (-not (Test-Path -LiteralPath $extDir)) {
  throw "Extension folder not found: $extDir"
}
if (-not (Test-Path -LiteralPath $publicDir)) {
  New-Item -ItemType Directory -Path $publicDir | Out-Null
}

if (Test-Path -LiteralPath $DestinationZip) {
  Remove-Item -LiteralPath $DestinationZip -Force -ErrorAction SilentlyContinue
}

# Collect files explicitly to avoid empty zips when wildcard fails
$files = Get-ChildItem -File -Recurse -LiteralPath $extDir |
  Where-Object { $_.Name -ne '.DS_Store' -and $_.Name -ne 'Thumbs.db' }

if (-not $files -or $files.Count -eq 0) {
  throw "No files found under $extDir. Is the extension folder populated?"
}

Compress-Archive -LiteralPath $files.FullName -DestinationPath $DestinationZip -Force

# Verify entries
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($DestinationZip)
try {
  if ($zip.Entries.Count -eq 0) { throw "Zip contains 0 entries (empty)." }
} finally {
  $zip.Dispose()
}

$size = (Get-Item $DestinationZip).Length
Write-Host ("Packed: {0} ({1} bytes)" -f $DestinationZip, $size) -ForegroundColor Green
