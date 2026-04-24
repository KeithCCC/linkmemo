# UI Recommendation Todo List

Date: 2026-04-24

This list is ordered by the requested priority:
1. Note easy to read on PC
2. Note easy to read on mobile
3. UI control usability
4. Low-hanging fruit on UX improvement

## 1. Note Easy To Read On PC

- [ ] Increase note content max-width for reading views and use a readable line length target instead of letting content stretch across a large dark canvas.
- [ ] Rebalance note page layout so the note body, title, metadata, and actions are visually separated and easier to scan.
- [ ] Improve typography in note/detail/settings pages:
  - Larger body text
  - More line-height
  - Clearer heading scale
  - Better contrast for secondary text
- [ ] Reduce visual weight of the left sidebar on desktop so the note content remains the focal area.
- [ ] Add a dedicated reading mode for note detail and preview states with fewer competing controls.
- [ ] Make missing-note and empty-note states use the same readable content container as normal note pages.

## 2. Note Easy To Read On Mobile

- [ ] Collapse the left navigation by default on mobile and replace it with an overlay drawer.
- [ ] Let note content take full viewport width on mobile by default.
- [ ] Remove the current split-shell behavior on narrow screens for note, settings, clip, and extension pages.
- [ ] Improve mobile text layout:
  - Larger minimum body size
  - Better spacing between sections
  - Less cramped headings
  - Fewer long lines broken into awkward narrow columns
- [ ] Make editor and preview paddings mobile-specific so content does not feel squeezed.
- [ ] Ensure note pages scroll as a single clear reading surface instead of feeling like a desktop layout forced into mobile width.
- [ ] Re-test these routes after layout fixes:
  - `/`
  - `/edit/new`
  - `/settings`
  - `/extension`
  - `/clip`
  - `/note/:id`

## 3. UI Control Usability

- [ ] Replace cryptic icon-only and single-letter controls in the editor with labeled buttons.
- [ ] Group editor actions by purpose:
  - View mode
  - Save/create
  - Navigation
  - Focus state
- [ ] Rename or redesign unclear controls such as `L`, `☰`, `✓`, and mode-only icon buttons.
- [ ] Add visible labels or tooltips for all primary actions, not just hover-only clues.
- [ ] Make the main home screen actions clearer:
  - Primary CTA: create note
  - Secondary CTA: search/open notes
  - Tertiary actions: filters and advanced workspace tools
- [ ] Add a visible command palette trigger in the UI instead of relying only on `Ctrl/Cmd + K`.
- [ ] Improve empty/error state actionability by always offering a next step:
  - Back to list
  - Create new note
  - Retry login
  - Open help

## 4. Low-Hanging Fruit On UX Improvement

- [ ] Fix auth first by correcting the current Supabase hostname and validating login end-to-end.
- [ ] Hide `/clip` debug information behind a dev-only flag or disclosure.
- [ ] Simplify the home empty state so it shows one clear first action instead of advanced filters first.
- [ ] Add a short first-run explanation of what ASUKA is for and what users should do first.
- [ ] Compress the extension setup page into a shorter checklist with clearer steps.
- [ ] Add copy buttons where users need to copy URLs, commands, or setup values.
- [ ] Improve missing-note recovery with clear links back into the product.
- [ ] Standardize button sizing and spacing across desktop and mobile.
- [ ] Review contrast and muted text styling, especially on dark backgrounds.
- [ ] Remove or reduce unnecessary visual noise in secondary panels when there is no user data yet.

## Suggested Execution Order

- [ ] Fix auth/environment blocker
- [ ] Ship mobile nav collapse and full-width mobile content
- [ ] Improve note readability on desktop and mobile
- [ ] Relabel editor controls and main navigation actions
- [ ] Clean up empty/error/debug states
- [ ] Polish extension/setup and command palette discoverability

## Definition Of Done

- [ ] Notes are readable without layout strain on desktop
- [ ] Notes are readable without sidebar compression on mobile
- [ ] Primary actions are understandable without prior product knowledge
- [ ] Empty and error states always suggest a next action
- [ ] Auth works again, enabling a full post-fix usability pass
