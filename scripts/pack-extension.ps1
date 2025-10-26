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

# Create zip
if (Test-Path -LiteralPath $DestinationZip) {
  Remove-Item -LiteralPath $DestinationZip -Force
}

Compress-Archive -Path (Join-Path $extDir '*') -DestinationPath $DestinationZip -Force

Write-Host "Packed: $DestinationZip" -ForegroundColor Green

