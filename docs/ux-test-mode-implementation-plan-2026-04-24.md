# UX Test Mode Implementation Plan

Date: 2026-04-24

## Goal

Provide a reliable UX testing environment that does not depend on:
- Google login
- live Supabase connectivity
- real user data

## What Was Implemented

### 1. App mode switch
- Added `VITE_APP_MODE=ux_test`
- Added dedicated scripts:
  - `npm run dev:ux`
  - `npm run build:ux`

### 2. Dummy auth adapter
- One-click test auth replaces Google OAuth in `ux_test` mode
- Default test identity:
  - `UX Test User`
  - `ux-test@example.com`
- Signed-in state persists in localStorage

### 3. Dummy notes repository
- Seeded realistic notes for UX review
- CRUD works locally through localStorage
- Existing UI can exercise:
  - search
  - sort
  - tags
  - groups
  - focus
  - note creation and editing

### 4. Visible environment indicator
- Added `UX TEST MODE` badge in the app shell
- Prevents confusion with production-like behavior

## Implementation Sequence

1. Add app mode flag
2. Add auth adapter and dummy auth service
3. Add notes adapter and dummy notes service
4. Seed realistic note fixtures
5. Switch app/context/screens to shared adapters
6. Add UX test launch scripts
7. Verify compile and runtime behavior

## Verification Completed

- `npm run build:ux`
- `npm run build`
- Runtime verification on local `ux_test` server
- Confirmed:
  - dummy signed-in user is visible
  - seeded notes render on home/list page
  - current live mode still builds

## Next Recommended Steps

1. Use `npm run dev:ux` as the primary environment for UI/UX iteration
2. Implement mobile-first nav/layout improvements using seeded data
3. Improve note readability with real content visible in test mode
4. Relabel editor controls and fix empty/error states
5. Re-validate against live auth/data once Supabase is healthy

## Launch Command

- `npm run dev:ux`

## Key Files

- `C:\Development\projects\linkmemo\src\appMode.js`
- `C:\Development\projects\linkmemo\src\services\authService.js`
- `C:\Development\projects\linkmemo\src\services\dummyAuthService.js`
- `C:\Development\projects\linkmemo\src\services\notesService.js`
- `C:\Development\projects\linkmemo\src\services\dummyNotesService.js`
- `C:\Development\projects\linkmemo\src\fixtures\uxTestNotes.js`
- `C:\Development\projects\linkmemo\.env.ux_test`
