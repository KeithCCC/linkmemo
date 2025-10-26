<#
  Export a minimal, essential subset of the ASUKA source code for ChatGPT analysis.

  Copies a curated set of files, preserves folder structure, and sanitizes
  src\firebase.js so no real credentials are included.

  Usage
    powershell -ExecutionPolicy Bypass -File scripts\export-asuka-essential.ps1 -Destination .\asuka-essential
    powershell -ExecutionPolicy Bypass -File scripts\export-asuka-essential.ps1 -Destination C:\temp\asuka-essential -Clean

  Notes
  - Only whitelisted files are exported; node_modules, build outputs, and docs are ignored.
  - If a listed file does not exist in your repo, it is skipped.
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [string]$Destination,

  # Remove destination before exporting
  [switch]$Clean
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = (Get-Location).Path

# Ensure destination
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

# Curated whitelist
$files = @(
  'package.json',
  'vite.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'index.html',
  # Core app
  'src/main.jsx',
  'src/App.jsx',
  'src/index.css',
  # Core data + services
  'src/auth.js',
  'src/notesService.js',
  'src/recentNotes.js',
  'src/firebase.js', # will be sanitized
  # UI structure
  'src/components/Navigation.jsx',
  'src/context/AuthContext.jsx',
  'src/context/NotesContext.jsx',
  # Screens
  'src/screens/NoteListScreen.jsx',
  'src/screens/NoteEditScreen.jsx',
  'src/screens/NoteDetailScreen.jsx',
  'src/screens/HomeScreen.jsx',
  'src/screens/SettingsScreen.jsx',
  'src/screens/TipTapScreen.jsx'
)

$copied = 0
$skipped = 0
foreach ($rel in $files) {
  $src = Join-Path -Path $root -ChildPath $rel
  if (-not (Test-Path -LiteralPath $src)) { $skipped++; continue }

  $dst = Join-Path -Path $Destination -ChildPath $rel
  $dstDir = Split-Path -Parent $dst
  if (-not (Test-Path -LiteralPath $dstDir)) {
    New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
  }

  if ($rel -ieq 'src/firebase.js') {
    # Write a sanitized firebase.js
    if ($PSCmdlet.ShouldProcess($dst, 'Write sanitized firebase.js')) {
      @'
// src/firebase.js (sanitized for sharing)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
  measurementId: 'G-XXXXXXX'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
'@ | Set-Content -LiteralPath $dst -Encoding UTF8
      $copied++
    }
  } else {
    if ($PSCmdlet.ShouldProcess($dst, 'Copy')) {
      Copy-Item -LiteralPath $src -Destination $dst -Force
      $copied++
    }
  }
}

Write-Host ("Exported: {0}, Skipped: {1}" -f $copied, $skipped) -ForegroundColor Green

