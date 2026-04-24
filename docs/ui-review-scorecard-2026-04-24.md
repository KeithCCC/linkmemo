# UI Review Scorecard: PC Web and Mobile Web

Date: 2026-04-24

Scoring scale:
- `5` = strong
- `4` = usable with minor friction
- `3` = mixed
- `2` = significant friction
- `1` = poor or blocked
- `N/T` = not testable in this build

## Coverage Notes
- Full route inspections were done at `1440x1024` desktop and `390x844` mobile.
- Spot checks at `1280x900` desktop and `412x915` mobile were used to confirm the same home-screen behavior.
- Authenticated data flows were not testable because login is blocked by the current Supabase hostname.

## Route Scorecard
| Route / State | Desktop | Mobile | Key Notes |
|---|---:|---:|---|
| `/` home/list empty state | 2 | 1 | Desktop is understandable but control-heavy; mobile default layout is too cramped with the sidebar open. |
| `/edit/new` new note editor | 3 | 2 | Editor loads quickly, but primary controls are cryptic and mobile width is constrained by the persistent sidebar. |
| `/settings` help/guide | 3 | 1 | Content is legible on desktop; mobile readability collapses because the sidebar consumes too much width. |
| `/extension` setup guide | 3 | 2 | Usable on desktop, but dense; mobile remains readable only with effort and too much scrolling. |
| `/clip` unauthenticated state | 2 | 1 | State is technically present, but debug-heavy and visually poor, especially on mobile. |
| `/note/:id` missing-note state | 2 | 1 | Error is visible, but recovery is weak and mobile again suffers from the open sidebar. |
| Login entry | 1 | 1 | Clicking `ログイン` fails due to DNS resolution of the configured Supabase host. |
| Command palette | 4 | N/T | Useful once opened on desktop, but not discoverable from the visible UI. |

## Criteria Scorecard
| Criterion | Desktop | Mobile | Notes |
|---|---:|---:|---|
| Task completion and efficiency | 2 | 1 | Core authenticated tasks are blocked; unauthenticated surfaces show too many controls before value. |
| Navigation clarity and IA | 3 | 1 | Desktop shell is understandable; mobile information architecture is obscured by layout compression. |
| Responsive layout quality | 3 | 1 | Desktop is stable; mobile default layout should not ship in its current form. |
| Readability and visual hierarchy | 3 | 1 | Desktop is acceptable; mobile text columns become too narrow on content pages. |
| Form and input ergonomics | 3 | 2 | Editor input is usable, but action labeling is weak and mobile room is limited. |
| Accessibility basics | 2 | 1 | Some controls have only symbolic names; mobile targets compete in tight space. |
| Error, empty, and loading states | 2 | 1 | States exist, but they rarely guide recovery well. |

## Overall Assessment
- Desktop web: `2.5 / 5`
- Mobile web: `1.1 / 5`

The current desktop shell is workable after learning it. The current mobile presentation is not ready for a general usability pass without first fixing the default navigation behavior.
