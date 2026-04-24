# UI Review Summary: PC Web and Mobile Web

Date: 2026-04-24

## Top 5 UX Risks
1. Login is blocked by a dead Supabase hostname, which prevents all authenticated core flows.
2. Mobile web opens in a desktop-style split layout, leaving too little width for reading or action.
3. The first-run home screen emphasizes internal controls before the product’s value or first successful task.
4. The editor toolbar uses ambiguous icon-only and single-letter actions for core behavior.
5. Error and utility states such as `/clip` and missing-note handling do not provide strong recovery guidance.

## Top 5 Visual Issues
1. The open mobile sidebar compresses the main content into a narrow, brittle column.
2. Help and setup pages become visually dense and hard to scan on mobile.
3. The home empty state leaves a large dark canvas with weak focal hierarchy.
4. Editor controls look inconsistent in weight and meaning, especially between symbolic and text buttons.
5. Debug-oriented content is exposed in the clip flow and visually dominates the page.

## What Should Be Fixed First
1. Fix auth by correcting the Supabase hostname and validating the login redirect.
2. Make mobile navigation collapsed by default and convert it to an overlay drawer.
3. Rebuild the first-run empty state around one clear CTA and a short product explanation.
4. Replace cryptic editor actions with labeled controls.
5. Clean up clip, empty, and missing-note states so they point users to the next step.

## Evidence Package
Primary screenshots for this review are in `output/playwright/`, including:
- `desktop-home-1440.png`
- `mobile-home-390.png`
- `mobile-home-390-collapsed.png`
- `desktop-edit-new-1440.png`
- `mobile-edit-new-390.png`
- `desktop-settings-1440.png`
- `mobile-settings-390.png`
- `desktop-extension-1440.png`
- `mobile-extension-390.png`
- `desktop-clip-1440.png`
- `mobile-clip-390.png`
- `desktop-note-missing-1440.png`
- `mobile-note-missing-390.png`
- `desktop-home-command-palette.png`
- `desktop-login-error.png`

## Constraint
This was an internal expert audit, not a participant study. Safari-specific rendering was not available in this environment, so mobile conclusions are based on narrow viewport behavior in automated Chromium sessions.
