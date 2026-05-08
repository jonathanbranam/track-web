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

| Component | Where duplicated | Notes |
|-----------|-----------------|-------|
| `SegmentedControl` | `MoviesWatchlistPage`, `TvWatchlistPage`, `PeoplePage` in client-watch (3×); will also appear in client-time filters | Accepts `tabs`, `value`, `onChange`; renders pill-style tab strip |
| `LoadingSpinner` | client-time `HomePage`/`LogPage` (spinner); every client-watch page (plain text today, spinner after restyle) | Centered `animate-spin` circle; accepts optional `size` prop |
| `Badge` | `TagChip` in client-time (indigo); genre/type chips in client-watch (gray today, violet after restyle) | Replaces `TagChip`; accepts `color` variant (`indigo`, `violet`, `gray`) |
| `Button` | Primary/secondary/danger class combos repeated across both apps and `packages/auth` | Accepts `variant` (`primary`, `secondary`, `danger`), `size` (`sm`, `md`), `loading`, `disabled` |
| `TextInput` | Input styling repeated across both apps with inconsistent focus rings | Accepts `label`, `error`, forwards all native `<input>` props |

`TagChip` in `client-time` becomes a thin wrapper around `<Badge color="indigo">` or is removed and call sites updated directly.

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

Tailwind's `py-1.5` yields ~30px total height for small text. iOS HIG and Material Design both recommend 44px minimum touch targets. Bumping to `py-2` and `text-sm` gives ~40px which is acceptable for a segmented control.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Wide pages on desktop look stretched after removing `max-w-lg` | This is a PWA; desktop layout is a secondary concern. A `max-w-screen-sm` can be added later without affecting the spec. |
| FAB may overlap last list item | Add `pb-24` to list containers to ensure scroll-past spacing below the nav bar and FAB |
| Violet may conflict with future brand updates | Decision is reversible via a single Tailwind color token change; no semantic meaning attached |
| `select` elements for watchlist state are still native UI | Native selects are functional on mobile; replacing with a custom bottom-sheet picker is a future enhancement, out of scope |
| Extracting `Button`/`TextInput` into `packages/ui` may subtly change `client-time` appearance | Wrap migration in a visual review pass; Tailwind class output is deterministic so regressions are easy to spot |
| `TagChip` removal breaks `client-time` import paths | Update all `client-time` import sites before deleting `TagChip.tsx`; keep the file as a re-export stub if needed |
| `packages/ui` bundle grows; both apps already import it | New primitives add negligible weight (no new runtime dependencies); tree-shaking handles unused exports |

## Migration Plan

No data migration required. Recommended implementation order:

1. Add primitives to `packages/ui` first so both apps can consume them immediately
2. Update `client-time` to use the new primitives (low-risk; visual review after build)
3. Restyle `client-watch` using the primitives (primary scope of this change)

Deploy as a standard frontend build of both clients. No server restart needed.
