# UI Review Implementation Plan

Date: 2026-04-24

Source todo list:
- `C:\Development\projects\linkmemo\docs\ui-review-recommendation-todo-2026-04-24.md`

This plan follows the requested priority order:
1. Note easy to read on PC
2. Note easy to read on mobile
3. UI control usability
4. Low-hanging fruit on UX improvement

It also handles one blocker first:
- Auth/login is currently broken because the configured Supabase host does not resolve

## Phase 0: Unblock The Product

### Goal
Restore working login so the app can be tested end-to-end with real note data.

### Changes
- Fix `VITE_SUPABASE_URL` so it points to a valid, resolvable Supabase project.
- Confirm the OAuth redirect target is still correct for local development.
- Validate that the login button returns the user to the app after auth.
- Confirm note loading works again after login.

### Acceptance Criteria
- Clicking `ログイン` no longer lands on a browser DNS error page.
- The app returns to the local app after OAuth.
- Authenticated note list and note editor flows work again.

### Verification
- Click login from `/`
- Confirm successful redirect and authenticated session
- Confirm notes load on `/`
- Confirm `/edit/new` can create and save a note

## Phase 1: Improve Note Readability On PC

### Goal
Make note content the visual focus on desktop and reduce strain when reading, previewing, and using help/setup pages.

### Scope
- Note detail/read views
- Note editor preview view
- Settings/help page
- Extension page
- Empty and missing-note states

### Changes
- Introduce a shared readable content container with:
  - controlled max width
  - consistent horizontal padding
  - improved line length
  - stronger heading/body spacing
- Reduce the dominance of the sidebar on desktop:
  - lower visual contrast
  - reduce unnecessary panel weight
  - keep content visually primary
- Rework note/detail page layout so title, metadata, actions, and content are clearly separated.
- Improve typography tokens for reading surfaces:
  - body font size
  - line height
  - heading scale
  - muted text contrast
- Apply the same readable layout treatment to:
  - `/settings`
  - `/extension`
  - missing-note state

### Likely Implementation Areas
- `src/App.jsx`
- `src/App.css`
- `src/index.css`
- `src/screens/NoteDetailScreen.jsx`
- `src/screens/NoteEditScreen.jsx`
- `src/screens/SettingsScreen.jsx`
- `src/screens/ExtensionScreen.jsx`

### Acceptance Criteria
- Main reading surfaces no longer span unbounded width on desktop.
- Title, metadata, and content hierarchy are visually clear.
- Help/setup pages feel like readable documents rather than raw text blocks.
- Missing-note state sits in the same readable layout system.

### Verification
- Review at `1440x1024` and `1280x900`
- Check `/edit/new`, `/settings`, `/extension`, `/note/:id`
- Confirm text remains readable without excessive eye travel

## Phase 2: Improve Note Readability On Mobile

### Goal
Stop mobile from inheriting the desktop shell and make note-related pages readable on narrow screens.

### Scope
- Global mobile navigation behavior
- Home/list
- Note editor
- Note detail
- Settings/help
- Extension page
- Clip page

### Changes
- Collapse left navigation by default below a mobile breakpoint.
- Replace persistent sidebar behavior with an overlay drawer.
- Ensure main content takes full width when the drawer is closed.
- Remove desktop-style split layout assumptions on narrow screens.
- Add mobile-specific spacing and typography rules for content pages.
- Make note editor controls wrap or stack cleanly without squeezing the text area.
- Ensure all main pages use one vertical reading flow on mobile.

### Likely Implementation Areas
- `src/App.jsx`
- `src/components/Navigation.jsx`
- `src/screens/NoteListScreen.jsx`
- `src/screens/NoteEditScreen.jsx`
- `src/screens/NoteDetailScreen.jsx`
- `src/screens/SettingsScreen.jsx`
- `src/screens/ExtensionScreen.jsx`
- `src/screens/ClipScreen.jsx`

### Acceptance Criteria
- Mobile opens with content-first layout, not sidebar-first layout.
- The note area is full width by default on mobile.
- Settings and extension pages are readable without narrow text columns.
- Editor remains usable without controls crushing the text field.

### Verification
- Review at `390x844` and `412x915`
- Capture before/after screenshots for:
  - `/`
  - `/edit/new`
  - `/settings`
  - `/extension`
  - `/clip`
  - `/note/:id`

## Phase 3: Improve UI Control Usability

### Goal
Make primary actions understandable without prior product knowledge.

### Scope
- Editor toolbar
- Home/list actions
- Command palette discoverability
- Empty and missing/error state actions

### Changes
- Replace ambiguous icon-only and single-letter actions with labeled controls.
- Group editor controls by function:
  - edit/view mode
  - save/create
  - navigation
  - focus
- Convert the current mode buttons into a clearer segmented control or labeled toggle row.
- Rename unclear actions such as:
  - `L`
  - `✓`
  - `☰`
- Add visible command palette entry point in the shell.
- Reorder home page actions so the primary action is obvious.
- Add explicit recovery actions to:
  - empty state
  - missing-note state
  - clip unauthenticated state

### Likely Implementation Areas
- `src/screens/NoteEditScreen.jsx`
- `src/screens/NoteListScreen.jsx`
- `src/components/Navigation.jsx`
- `src/components/CommandPalette.jsx`
- `src/screens/ClipScreen.jsx`
- `src/screens/NoteDetailScreen.jsx`

### Acceptance Criteria
- A first-time user can identify create, save, switch mode, return to list, and open navigation without guessing.
- The home page clearly distinguishes primary, secondary, and advanced actions.
- Error and empty states always offer a next step.

### Verification
- Manual review on desktop and mobile
- Keyboard check for command palette trigger and visible affordance
- Confirm accessible names of primary buttons are descriptive

## Phase 4: Low-Hanging UX Improvements

### Goal
Ship fast improvements that reduce friction without requiring major redesign.

### Changes
- Hide clip debug info behind a development-only condition or expandable section.
- Simplify empty-state content on `/`
- Add short first-run product explanation
- Convert extension setup into a tighter checklist
- Add copy buttons where users need to copy setup values or URLs
- Improve contrast for muted text on dark backgrounds
- Normalize button sizing and spacing across surfaces
- Remove low-value empty panels when no data exists yet

### Likely Implementation Areas
- `src/screens/ClipScreen.jsx`
- `src/screens/NoteListScreen.jsx`
- `src/screens/ExtensionScreen.jsx`
- `src/index.css`
- `src/App.css`
- `src/components/Navigation.jsx`

### Acceptance Criteria
- Empty, debug, and setup states feel intentional rather than developer-oriented.
- Secondary UI noise is reduced.
- Small usability gains are visible without changing core architecture.

### Verification
- Re-run screenshot review on desktop and mobile
- Compare before/after empty, clip, and extension pages

## Recommended Delivery Order

### Milestone 1
- Phase 0
- Phase 2 mobile nav collapse and content-width fixes

Reason:
- Login is a hard blocker
- Mobile layout is the highest visible product problem after auth

### Milestone 2
- Phase 1 desktop readability
- Phase 3 editor and home control clarity

Reason:
- Once layout is stable, improve reading quality and action clarity

### Milestone 3
- Phase 4 low-hanging UX improvements

Reason:
- Best done after the larger layout and control changes settle

## Regression Risks

- Navigation collapse state persistence may behave badly across desktop/mobile transitions.
- Editor toolbar changes may break shortcut expectations or wrapping behavior.
- Content-width changes may introduce overflow in preview or markdown rendering.
- Drawer behavior may conflict with fixed-position buttons and command palette overlays.

## Test Plan

### Functional
- Login works
- Note list loads after login
- New note creation works
- Save/update works
- Navigation open/close works on desktop and mobile
- Command palette opens and remains usable

### UI
- Desktop review at `1440x1024` and `1280x900`
- Mobile review at `390x844` and `412x915`
- Verify:
  - no crushed main content
  - no accidental horizontal overflow
  - clear button labels
  - readable text hierarchy

### Route Checklist
- `/`
- `/edit/new`
- `/settings`
- `/extension`
- `/clip`
- `/note/:id`

## Definition Of Done

- Auth is restored and core note flows can be tested with real data.
- Notes and document-like pages are readable on desktop.
- Notes and document-like pages are readable on mobile with content-first layout.
- Primary controls are understandable without product knowledge.
- Empty, error, and setup states guide the user to the next step.
- A follow-up screenshot audit shows clear improvement versus the 2026-04-24 review baseline.
