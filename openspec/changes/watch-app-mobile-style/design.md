## Context

`client-watch` and `client-time` share the same monorepo, the same Tailwind CSS 4 setup, and the same Vite/React 19 stack. `client-time` was built mobile-first and has since become the reference UI for this product family. `client-watch` was scaffolded quickly during the watch feature change and ended up with website patterns: a horizontal top nav, `max-w-lg mx-auto` content constraint, small `rounded` cards, and `blue-*` accent colors.

This change is purely frontend. There are no backend, API, database, or routing behavior changes.

## Goals / Non-Goals

**Goals:**
- Replace the top nav with a fixed bottom nav bar matching `client-time`'s shell pattern
- Add iOS safe area inset support (`--sat`, `--sab`) to `index.css`
- Standardize cards, buttons, tabs, and badges to the mobile-native visual language
- Use **violet** as `client-watch`'s accent color to distinguish it from `client-time`'s indigo while staying in the same design system
- Extract repeated UI primitives shared between `client-time` and `client-watch` into `packages/ui` so both apps consume the same implementations

**Non-Goals:**
- Functional changes to any page (data fetched, interactions, state management unchanged)
- Backend, API, or database changes
- Dark mode toggle or theming system (already dark-only)
- Animated page transitions
- Extracting app-specific structural components (bottom `NavBar`, `TimePicker`, `EditEntryForm`) — those have no cross-app equivalent

## Decisions

### 1. Violet accent, not indigo

`client-time` uses `indigo-*`. Using the same palette for `client-watch` would make the two apps visually indistinguishable when side-by-side on a home screen. Violet is adjacent on the Tailwind color scale, keeps the family feel, and is distinct enough to identify which app the user is in.

**Alternative considered**: Keep blue (current). Rejected — blue feels more website-like and doesn't match the established palette in this repo at all.

**Alternative considered**: Use a complementary color (teal, amber). Rejected — too far from the family aesthetic.

### 2. Which components to extract to `packages/ui`

Five patterns appear verbatim in both apps and have no app-specific logic:

| Component | Where duplicated |
|-----------|-----------------|
| `SegmentedControl` | Watchlist and People filter tabs in `client-watch` (3 pages); equivalent pattern used in `client-time` filters |
| `LoadingSpinner` | `client-time` page loading states; every `client-watch` page (plain text today, spinner after restyle) |
| `Badge` | `TagChip` in `client-time`; genre/type chips in `client-watch` |
| `Button` | Primary/secondary/danger button styles repeated across both apps |
| `TextInput` | Input styling repeated across both apps with inconsistent focus rings |

`TagChip` in `client-time` becomes a thin wrapper around `Badge` or is removed and call sites updated directly.

**Alternative considered**: Extract everything into a CSS design-token file and keep components app-local. Rejected — tokens alone don't enforce consistent DOM structure or interaction states; the components are simple enough that the abstraction cost is low.

**Alternative considered**: Use a third-party component library (shadcn/ui, Radix). Rejected — the existing styling is already well-established in Tailwind utility classes; importing a full library adds significant bundle weight and migration cost for five small components.

### 3. No shared `NavBar` component with `client-time`

The bottom nav in `client-time` has two tabs (Timer, Log); `client-watch` needs four (Events, Movies, TV, People). Extracting a shared component adds coupling and `packages/ui` complexity for minimal gain. Each app defines its own `NavBar` in `App.tsx`.

**Alternative considered**: Extract to `@repo/ui`. Rejected — the two navbars have different tab counts, icons, and routes. Premature abstraction.

### 4. Floating action button (FAB) for "New Event" instead of header button

Currently "+ New Event" is a small button in the header row of the EventsPage. On mobile, placing a prominent circular FAB in the bottom-right (above the nav bar) is the standard pattern for a primary creation action. This gives it a larger touch target and doesn't crowd the page title.

**Alternative considered**: Keep as a header button. Acceptable, but small touch target and visually cluttered on mobile.

### 5. Back-button headers for secondary pages

Pages like NewEventPage, MoviesCatalogPage, and TvCatalogPage are reached from a list page and need a way to go back. These pages will get a fixed-position header row with a `←` back button and a title, replacing the inline navigation links.

**Alternative considered**: Rely on browser back gesture only. Rejected — not discoverable for new users, and the PWA shell doesn't always show a browser UI.

### 6. Tab target minimum height increase

iOS HIG and Material Design both recommend 44px minimum touch targets. The current segmented control tabs fall short. Increasing the vertical padding in `SegmentedControl` to bring targets closer to the 44px guideline is a low-risk change with no functional side effects.

**Alternative considered**: Leave tab heights as-is and rely on the larger overall card/layout for perceived usability. Rejected — small tap targets are a concrete usability defect on mobile, not a subjective preference.

**Alternative considered**: Replace tab strips with a native `<select>`. Rejected — native selects break the visual continuity of the design and are harder to style consistently across platforms.

## Risks / Trade-offs

- [Wide pages on desktop look stretched after removing the width constraint] → This is a PWA; desktop layout is a secondary concern. A max-width can be added later without affecting the spec.
- [FAB may overlap the last list item on short screens] → Add bottom padding to list containers to ensure scroll-past spacing below the nav bar and FAB.
- [Violet accent may conflict with future brand updates] → Decision is reversible via a single Tailwind color token change; no semantic meaning is attached to the color.
- [`select` elements for watchlist state remain native UI] → Native selects are functional on mobile; a custom bottom-sheet picker is a future enhancement, out of scope here.
- [Extracting `Button`/`TextInput` into `packages/ui` may subtly change `client-time` appearance] → Wrap the migration in a visual review pass; Tailwind class output is deterministic so regressions are easy to spot.
- [`TagChip` removal breaks `client-time` import paths] → Update all `client-time` import sites before deleting `TagChip.tsx`; keep the file as a re-export stub if needed.
- [`packages/ui` bundle grows] → New primitives add negligible weight (no new runtime dependencies); tree-shaking handles unused exports.

## Migration Plan

No data migration required. Recommended implementation order:

1. Add primitives to `packages/ui` first so both apps can consume them immediately
2. Update `client-time` to use the new primitives (low-risk; visual review after build)
3. Restyle `client-watch` using the primitives (primary scope of this change)

Deploy as a standard frontend build of both clients. No server restart needed.

**Rollback**: Revert the frontend commits and redeploy the previous build artifacts. No data or server state is affected.

**Testing**: This change has no functional behavior changes and the repo has no configured test framework. No automated tests are added. Verification is done via visual review of both clients after build.

## Open Questions

None at this time.
