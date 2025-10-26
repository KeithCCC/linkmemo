#!/usr/bin/env bash

# Export a minimal, essential subset of the ASUKA source code for analysis.
#
# Mirrors scripts/export-asuka-essential.ps1 behavior for Linux/WSL.
#
# Usage examples
#   bash scripts/export-asuka-essential.sh -d ./asuka-essential
#   bash scripts/export-asuka-essential.sh -d /tmp/asuka-essential --clean

set -euo pipefail

DEST=""
CLEAN=0

print_help() {
  cat <<'EOF'
Export a minimal, essential subset of the ASUKA source code.

Options:
  -d, --destination <path>   Destination directory (required)
      --clean                Remove destination directory before exporting
  -h, --help                 Show this help

Examples:
  bash scripts/export-asuka-essential.sh -d ./asuka-essential
  bash scripts/export-asuka-essential.sh -d /tmp/asuka-essential --clean
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--destination)
      DEST="${2:-}"
      shift 2
      ;;
    --clean)
      CLEAN=1
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      print_help
      exit 2
      ;;
  esac
done

if [[ -z "$DEST" ]]; then
  echo "Error: destination is required (-d/--destination)" >&2
  print_help
  exit 2
fi

ROOT_DIR="$(pwd)"

if [[ -e "$DEST" && $CLEAN -eq 1 ]]; then
  rm -rf -- "$DEST"
fi

mkdir -p -- "$DEST"

# Curated whitelist (relative paths)
FILES=(
  "package.json"
  "vite.config.js"
  "tailwind.config.js"
  "postcss.config.js"
  "index.html"
  # Core app
  "src/main.jsx"
  "src/App.jsx"
  "src/index.css"
  # Core data + services
  "src/auth.js"
  "src/notesService.js"
  "src/recentNotes.js"
  "src/firebase.js" # will be sanitized
  # UI structure
  "src/components/Navigation.jsx"
  "src/context/AuthContext.jsx"
  "src/context/NotesContext.jsx"
  # Screens
  "src/screens/NoteListScreen.jsx"
  "src/screens/NoteEditScreen.jsx"
  "src/screens/NoteDetailScreen.jsx"
  "src/screens/HomeScreen.jsx"
  "src/screens/SettingsScreen.jsx"
  "src/screens/TipTapScreen.jsx"
)

copied=0
skipped=0

for rel in "${FILES[@]}"; do
  src="$ROOT_DIR/$rel"
  if [[ ! -f "$src" ]]; then
    ((skipped++))
    continue
  fi

  dst="$DEST/$rel"
  dst_dir="$(dirname -- "$dst")"
  mkdir -p -- "$dst_dir"

  if [[ "$rel" == "src/firebase.js" ]]; then
    # Write sanitized firebase.js
    cat > "$dst" <<'SANITIZED'
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
SANITIZED
    ((copied++))
  else
    cp -f -- "$src" "$dst"
    ((copied++))
  fi
done

echo "Exported: ${copied}, Skipped: ${skipped}"

