# UI Review Findings: PC Web and Mobile Web

Date: 2026-04-24

## Summary
This review was executed against the local Vite app at `http://127.0.0.1:4173` with live browser captures stored in `output/playwright/`.

Coverage included these routes:
- `/`
- `/edit/new`
- `/settings`
- `/extension`
- `/clip`
- `/note/:id` in missing-note state via `/note/test-note`

Platform matrix used during the review:
- Desktop Chrome-like viewport: `1440x1024`
- Desktop spot check: `1280x900`
- Mobile narrow viewport: `390x844`
- Mobile spot check: `412x915`

Important constraint:
- Authenticated flows could not be completed because the configured Supabase hostname `yyjplaplxpjmaetwakwp.supabase.co` fails DNS resolution in the current build. That means `/note/:id` and “recent/open existing note” were only reviewable in empty or missing-data states.

## Screen And Flow Inventory
Reviewed screens and states:
- Home/list: empty unauthenticated state on desktop and mobile
- New note editor: unauthenticated create screen on desktop and mobile
- Settings/help: desktop and mobile
- Extension instructions: desktop and mobile
- Clip route: unauthenticated/error state on desktop and mobile
- Note detail: missing-note state on desktop and mobile
- Command palette: desktop only via `Ctrl+K`
- Auth entry: login button click through to OAuth redirect failure

## Scenario Results
| Scenario | Result | Notes |
|---|---|---|
| First-time visitor understands what the product does and how to begin | Friction | The app opens directly into an internal workspace shell, not a landing state. The login CTA exists, but the value proposition and first action are weak. |
| User signs in and lands in a clear starting point | Blocked | Login redirects to a dead Supabase hostname and stops at `ERR_NAME_NOT_RESOLVED`. |
| User creates a new note from navigation | Partial | `/edit/new` is reachable and the editor loads, but saving requires auth. |
| User finds a note from the list/search path | Blocked | No fixture data without auth, so retrieval could not be completed. |
| User opens an existing note and understands whether they are viewing or editing | Partial | The editor state is clear enough once open, but icon-only controls make first-use interpretation weak. |
| User returns to a recently used note | Blocked | Could not generate authenticated recent-note state. |
| User uses the app on a narrow mobile viewport without losing orientation | Friction | The desktop sidebar remains open by default and compresses content into a narrow strip. |
| User reaches settings/help and understands available controls | Partial | Reachable, but mobile readability is poor with the open sidebar. |
| User discovers secondary actions such as command/search/view toggles | Friction | The command palette works, but discovery depends on hidden shortcuts. |
| User recovers from empty/loading/error states without confusion | Friction | Empty and error states exist, but they provide weak next-step guidance. |

## Prioritized Findings
### P0

#### 1. Login is currently blocked by an invalid or dead Supabase hostname
- Severity: `P0`
- Goal affected: first visit, login, all authenticated note flows
- Expected behavior: clicking `ログイン` should open a working OAuth flow
- Observed behavior: the app redirects to `yyjplaplxpjmaetwakwp.supabase.co` and stops at `ERR_NAME_NOT_RESOLVED`
- Evidence:
  - `output/playwright/desktop-login-error.png`
  - Local DNS check: `Resolve-DnsName yyjplaplxpjmaetwakwp.supabase.co` returned “DNS name does not exist”
- Fix direction: correct `VITE_SUPABASE_URL` and validate the OAuth redirect before further usability polish

### P1

#### 2. Mobile web defaults to a desktop two-column shell and crushes the primary content area
- Severity: `P1`
- Goal affected: capture, browse, settings/help, extension setup on mobile
- Expected behavior: under a mobile breakpoint, the primary content should take full width and navigation should move into a drawer or overlay
- Observed behavior: the left sidebar stays open by default on `390x844` and `412x915`, leaving the main content column too narrow for comfortable reading or action
- Evidence:
  - `output/playwright/mobile-home-390.png`
  - `output/playwright/mobile-settings-390.png`
  - `output/playwright/mobile-extension-390.png`
  - Comparison after manual collapse: `output/playwright/mobile-home-390-collapsed.png`
- Fix direction: collapse nav by default below tablet width, replace the persistent sidebar with an overlay drawer, and preserve full-width content as the default mobile state

#### 3. The first-run home screen is structured like an internal power-user workspace, not an onboarding surface
- Severity: `P1`
- Goal affected: first visit, capture and retrieve
- Expected behavior: a new visitor should immediately understand what ASUKA does and what to do first
- Observed behavior: the screen opens to tabs, filters, sort controls, empty recent notes, and utility actions before giving a clear explanation or single primary next step
- Evidence:
  - `output/playwright/desktop-home-1440.png`
  - `output/playwright/desktop-home-1280.png`
- Fix direction: introduce a guest/empty-state landing panel with product explanation, one primary CTA, and delayed exposure of advanced controls until notes exist

#### 4. The editor’s primary actions are too cryptic for first-time use
- Severity: `P1`
- Goal affected: note creation and editing
- Expected behavior: create, save, list, preview, and layout actions should be self-evident
- Observed behavior: core controls are mostly icon-only or single-letter buttons such as `＋`, `✓`, `L`, `☰`, `✏️`, `👁️`, and `↔️`
- Evidence:
  - `output/playwright/desktop-edit-new-1440.png`
  - `output/playwright/mobile-edit-new-390.png`
  - Snapshot evidence from the live editor showed button accessible names as `＋`, `✓`, `L`, and `ナビゲーションバートグル`
- Fix direction: label primary actions in text, group view-mode controls as a segmented switch, and reserve icon-only treatment for clearly standard actions with robust tooltips

### P2

#### 5. The empty list state is control-heavy and task-light
- Severity: `P2`
- Goal affected: initial capture and retrieval
- Expected behavior: when there are no notes, the screen should emphasize the first successful action
- Observed behavior: tabs, search, sort, “その他”, and sidebar utilities dominate the layout while the core CTA competes for attention
- Evidence:
  - `output/playwright/desktop-home-1440.png`
  - `output/playwright/mobile-home-390-collapsed.png`
- Fix direction: reduce filters and advanced controls when note count is zero, and foreground a stronger “Create first note” path

#### 6. The clip route exposes developer-style debug content directly in the user interface
- Severity: `P2`
- Goal affected: clipping and recovery from clip failures
- Expected behavior: a failed or unauthenticated clip should show a concise status and one next action
- Observed behavior: `/clip` shows a large debug block in the main content area, and on mobile it becomes visually broken and hard to read
- Evidence:
  - `output/playwright/desktop-clip-1440.png`
  - `output/playwright/mobile-clip-390.png`
- Fix direction: gate debug details behind a dev flag or expandable disclosure and keep the user-facing state short and action-oriented

#### 7. Missing-note recovery is a dead end instead of a recovery flow
- Severity: `P2`
- Goal affected: retrieving an existing note
- Expected behavior: a missing note should offer a route back to the list or a replacement action
- Observed behavior: `/note/test-note` only shows a red error message on a mostly empty canvas
- Evidence:
  - `output/playwright/desktop-note-missing-1440.png`
  - `output/playwright/mobile-note-missing-390.png`
- Fix direction: add recovery CTAs such as “Back to list”, “Create new note”, and “Open recent notes”

### P3

#### 8. The command palette is useful but effectively hidden
- Severity: `P3`
- Goal affected: discovery of advanced actions
- Expected behavior: a valuable power feature should have at least one visible entry point
- Observed behavior: the command palette works well when opened via `Ctrl+K`, but there is no visible trigger in the main shell
- Evidence:
  - `output/playwright/desktop-home-command-palette.png`
- Fix direction: add a visible command/search affordance in the shell and mention the shortcut as secondary text

#### 9. The extension setup page is informative but too dense, especially on mobile
- Severity: `P3`
- Goal affected: extension installation and setup
- Expected behavior: install/setup should read as a short checklist with obvious copy targets and fewer dense paragraphs
- Observed behavior: the page is long, text-heavy, and visually demanding on mobile
- Evidence:
  - `output/playwright/desktop-extension-1440.png`
  - `output/playwright/mobile-extension-390.png`
- Fix direction: compress setup into a tighter checklist, extract long explanations into collapsible help, and add copy buttons for URLs or commands

## Fix Order
1. Restore working auth by fixing the Supabase host and validating login end-to-end.
2. Redesign mobile navigation so content owns the viewport by default.
3. Rework the empty-state/home experience around one clear first action.
4. Relabel the editor toolbar and reduce reliance on icon-only controls.
5. Clean up error and utility states such as `/clip` and missing-note recovery.
