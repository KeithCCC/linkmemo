# UX Improvement Tree

Date: 2026-04-24

Topic:
- Evaluate UX improvement using a test-only login replacement
- Evaluate UX improvement using dummy note data instead of live Supabase dependency

Current dependency points in the app:
- Auth is driven by `src/supabaseAuth.js`
- Auth state is consumed by `src/context/AuthContext.jsx`
- Note CRUD is driven by `src/supabaseNotesService.js`
- Note state is managed in `src/context/NotesContext.jsx`

## Goal

Make the product easy to evaluate and improve from a UX perspective without blocking on:
- Google login
- Supabase availability
- real user data

The test environment should let reviewers immediately experience:
- signed-in state
- realistic note list
- realistic note detail
- realistic note editing
- realistic recent-note, tag, group, and focus flows

## Root Decision

### Replace backend dependency for UX testing

#### Branch A: Dummy login for test-only use
- Purpose:
  - remove Google login friction during UX review
  - let reviewers enter the app in a stable signed-in state
- Recommendation:
  - add a test auth mode controlled by environment flag
  - in test auth mode, replace Google OAuth with one-click dummy sign-in
- Desired UX:
  - app opens with a visible `Test Login` or automatically enters dummy signed-in state
  - dummy user name is obvious, for example `UX Test User`
  - logout still works and returns to a clear signed-out state

#### Branch B: Dummy note database for test-only use
- Purpose:
  - let reviewers experience the real product with realistic content
  - avoid empty-state-only testing
- Recommendation:
  - add a mock notes service behind the same CRUD interface as Supabase
  - use seeded local data for lists, details, tags, groups, focus, and recent work
- Desired UX:
  - home screen shows realistic notes immediately
  - search, sort, tag, group, focus, recent, and note open flows all work
  - new note creation and editing feel real, even if data is local-only

## UX Improvement Tree

### 1. Enable reliable UX testing

#### 1.1 Remove auth blocker
- Implement test-only auth mode
- Show clear signed-in test identity
- Make it easy to switch between:
  - live auth mode
  - dummy auth mode

#### 1.2 Remove data blocker
- Implement mock notes repository
- Seed enough notes to cover:
  - short note
  - long note
  - tag-heavy note
  - grouped note
  - focused note
  - recent note
  - note with links/wiki links
  - note with markdown lists/tasks

#### 1.3 Make test mode explicit
- Add visible test badge or banner
- Prevent confusion with production data
- Keep test mode styling subtle but unmistakable

### 2. Improve note readability using realistic data

#### 2.1 PC readability
- Evaluate with seeded long notes
- Tune content width, type scale, spacing, hierarchy
- Validate note detail, preview, help, and extension pages with real reading-length content

#### 2.2 Mobile readability
- Evaluate with seeded long notes on narrow screens
- Validate drawer navigation instead of fixed sidebar
- Check full-width content reading flow

### 3. Improve control usability using realistic flows

#### 3.1 Home/list flow
- Test search with real tags and note titles
- Test whether users can understand:
  - list vs card view
  - tag filters
  - group filters
  - focus filter

#### 3.2 Editor flow
- Test whether users understand:
  - create
  - save
  - preview
  - split view
  - focus toggle
  - navigation back to list

#### 3.3 Recovery flow
- Test missing note, empty note, and clip states with stable test conditions

### 4. Improve onboarding and first-use UX

#### 4.1 Signed-out first impression
- Test a clean signed-out landing state
- Add a simpler path into the product than immediate power-user workspace UI

#### 4.2 Signed-in first impression
- Use dummy data to validate whether the home screen helps users understand the app quickly

#### 4.3 Command discoverability
- Test whether visible command/search entry points reduce hidden-shortcut dependence

## Recommended Test-Only Architecture

### Auth abstraction

Create an auth adapter interface with the same product-facing API:
- `login()`
- `logout()`
- `subscribeToAuth(callback)`

Implement two versions:
- `supabaseAuthAdapter`
- `dummyAuthAdapter`

Recommended behavior for `dummyAuthAdapter`:
- returns a fixed user object
- persists signed-in state in localStorage for convenience
- supports instant login and logout

Example dummy user:
- `uid: "ux-test-user"`
- `email: "ux-test@example.com"`
- `displayName: "UX Test User"`

### Notes abstraction

Create a notes repository interface matching current use:
- `getNotes(uid)`
- `createNote(uid, note)`
- `updateNote(uid, noteId, note)`
- `deleteNote(uid, noteId)`
- `getNoteById(uid, noteId)`

Implement two versions:
- `supabaseNotesRepository`
- `dummyNotesRepository`

Recommended behavior for `dummyNotesRepository`:
- seed notes from a local JSON or JS fixture
- persist edits in localStorage for test continuity
- allow reset to seed data

### Mode selection

Use an environment flag such as:
- `VITE_APP_MODE=live`
- `VITE_APP_MODE=ux_test`

In `ux_test` mode:
- use dummy auth
- use dummy notes repository
- optionally show a small `UX Test Mode` badge

## Recommended Seed Data

Use at least 12 to 20 notes so the list UI becomes meaningfully testable.

Include:
- 3 short notes
- 3 long notes
- 3 tag-heavy notes
- 2 focused notes
- 2 grouped-note examples
- 2 notes with wiki links
- 2 checklist/task notes
- 1 recently edited note
- 1 intentionally messy long note for stress testing

Example tags:
- `#todo`
- `#project`
- `#meeting`
- `#chatgpt`
- `#clipping`
- `#idea`
- `#focus`
- `#group:writing`

## Evaluation Benefits

If dummy auth and dummy DB are added, UX evaluation quality improves immediately:

### What becomes testable
- signed-in landing experience
- note retrieval
- recent notes
- tag filtering
- group filtering
- focus flow
- note edit/save loop
- preview readability
- command palette usefulness with actual content

### What becomes easier to iterate
- typography tuning
- spacing tuning
- navigation changes
- empty-state changes
- onboarding changes
- toolbar labeling changes

### What risk is reduced
- false conclusions from empty-state-only testing
- waiting on auth/backend fixes before UX work
- mixing production data concerns into design review

## Risks And Guardrails

### Risks
- dummy mode may drift from live behavior
- reviewers may forget they are in test mode
- seeded content may not represent real-world note complexity

### Guardrails
- keep shared interfaces identical between live and dummy implementations
- add a visible but light test-mode indicator
- include a reset-seed action
- periodically verify one flow against live mode once auth is fixed

## Recommended Implementation Order

### Step 1
- add auth adapter abstraction
- add dummy auth adapter

### Step 2
- add notes repository abstraction
- add dummy notes repository

### Step 3
- add seeded realistic note fixtures

### Step 4
- add `ux_test` environment mode switch

### Step 5
- run the next full UX pass in dummy mode

### Step 6
- after UX fixes settle, validate against live Supabase mode

## Conclusion

Replacing Google login with dummy test-only auth and replacing live Supabase note dependency with seeded dummy notes is a strong UX evaluation strategy for this app.

It is especially valuable here because:
- current auth is broken
- current review was limited by lack of signed-in data
- the product’s biggest UX questions require realistic note flows, not empty states

Recommended decision:
- implement a dedicated `ux_test` mode
- use it as the main environment for UI/UX iteration
- validate final behavior against live auth/data once the backend is healthy again
