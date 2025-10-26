<#
  Copy only source code from the current directory to a destination.

  Usage examples
  - Dry run (show what would be copied):
      powershell -ExecutionPolicy Bypass -File scripts/copy-source.ps1 -Destination C:\temp\export -WhatIf

  - Copy with defaults:
      powershell -ExecutionPolicy Bypass -File scripts/copy-source.ps1 -Destination C:\temp\export

  - Clean destination first and include extra extensions:
      powershell -ExecutionPolicy Bypass -File scripts/copy-source.ps1 -Destination C:\temp\export -Clean -IncludeExt .js,.jsx,.ts,.tsx,.css,.scss,.html,.md,.json,.yml

  Notes
  - Excludes common non-source directories by default (node_modules, dist, build, .git, etc.)
  - Includes typical code/config extensions by default.
  - You can customize includes/excludes via parameters below.
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [string]$Destination,

  # File extensions to include (lowercased). Use dot prefix (e.g. .js)
  [string[]]$IncludeExt = @(
    '.js','.jsx','.ts','.tsx',
    '.css','.scss','.sass','.less',
    '.html','.htm','.md','.markdown',
    '.json','.yml','.yaml','.toml'
  ),

  # Extra file name patterns to include even if extension not listed
  # Supports -like wildcards (e.g. *.config.js)
  [string[]]$ExtraNames = @(
    'package.json','package-lock.json','pnpm-lock.yaml','yarn.lock',
    'tsconfig.json','jsconfig.json',
    'vite.config.*','webpack.config.*','rollup.config.*','esbuild.*',
    'postcss.config.*','tailwind.config.*',
    '.eslintrc*','.prettierrc*','.babelrc*','.npmrc','.nvmrc',
    '.editorconfig','.gitignore','.gitattributes',
    '.env.example','.env.schema'
  ),

  # Directories to exclude anywhere in the path (case-insensitive)
  [string[]]$ExcludeDirs = @(
    'node_modules','.git','.husky','.vscode',
    'dist','build','coverage','out','.next','.nuxt','.parcel-cache','.cache','.turbo','tmp','temp',
    'storybook-static','.expo','.expo-shared','android','ios','.gradle','.idea','.DS_Store','docs'
  ),

  # Remove destination before copying
  [switch]$Clean
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Join-RegexOr {
  param([string[]]$Items)
  return ($Items | ForEach-Object { [Regex]::Escape($_) }) -join '|'
}

$sourceRoot = (Get-Location).Path

if (Test-Path -LiteralPath $Destination) {
  if ($Clean) {
    if ($PSCmdlet.ShouldProcess($Destination, 'Clean destination')) {
      Remove-Item -LiteralPath $Destination -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

if (-not (Test-Path -LiteralPath $Destination)) {
  New-Item -ItemType Directory -Path $Destination | Out-Null
}

# Resolve destination absolute path and prepare a prefix for quick skip checks
$destRootPath = (Resolve-Path -LiteralPath $Destination).Path
$destPrefix = ($destRootPath.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar)

$extSet = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($e in $IncludeExt) { [void]$extSet.Add($e.ToLowerInvariant()) }

$excludePattern = '(?i)(^|[\\/])(' + (Join-RegexOr $ExcludeDirs) + ')([\\/]|$)'

$copied = 0
$skipped = 0

Write-Host "Scanning source at: $sourceRoot" -ForegroundColor Cyan
Write-Host "Destination: $Destination" -ForegroundColor Cyan

Get-ChildItem -Path $sourceRoot -Recurse -File -Force |
  ForEach-Object {
    $full = $_.FullName
    # Skip anything inside the destination directory to avoid recursive copying
    if ($full.StartsWith($destPrefix, [System.StringComparison]::OrdinalIgnoreCase)) { $skipped++; return }
    $rel = $full.Substring($sourceRoot.Length).TrimStart('\','/')

    # Skip excluded directories
    if ($rel -match $excludePattern) { $skipped++; return }

    $name = $_.Name
    $ext  = [IO.Path]::GetExtension($name).ToLowerInvariant()

    $includeByExt = $extSet.Contains($ext)
    $includeByName = $false
    if (-not $includeByExt) {
      foreach ($pat in $ExtraNames) { if ($name -like $pat) { $includeByName = $true; break } }
    }

    if (-not ($includeByExt -or $includeByName)) { $skipped++; return }

    $destPath = Join-Path -Path $Destination -ChildPath $rel
    $destDir  = Split-Path -Parent $destPath
    if (-not (Test-Path -LiteralPath $destDir)) {
      New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    if ($PSCmdlet.ShouldProcess($destPath, 'Copy')) {
      Copy-Item -LiteralPath $full -Destination $destPath -Force
    }
    $copied++
  }

Write-Host ("Copied: {0}, Skipped: {1}" -f $copied, $skipped) -ForegroundColor Green
