## Context

`client-watch` and `client-time` share the same monorepo, the same Tailwind CSS 4 setup, and the same Vite/React 19 stack. `client-time` was built mobile-first and has since become the reference UI for this product family. `client-watch` was scaffolded quickly during the watch feature change and ended up with website patterns: a horizontal top nav, `max-w-lg mx-auto` content constraint, small `rounded` cards, and `blue-*` accent colors.

This change is purely frontend. There are no backend, API, database, or routing behavior changes.

## Goals / Non-Goals

**Goals:**
- Replace the top nav with a fixed bottom nav bar matching `client-time`'s shell pattern
- Add iOS safe area inset support (`--sat`, `--sab`) to `index.css`
- Standardize cards, buttons, tabs, and badges to the mobile-native visual language
- Use **violet** as `client-watch`'s accent color to distinguish it from `client-time`'s indigo while staying in the same design system

**Non-Goals:**
- Functional changes to any page (data fetched, interactions, state management unchanged)
- Backend, API, or database changes
- Shared component library extraction (keep changes scoped to `client-watch/`)
- Dark mode toggle or theming system (already dark-only)
- Animated page transitions

## Decisions

### 1. Violet accent, not indigo

`client-time` uses `indigo-*`. Using the same palette for `client-watch` would make the two apps visually indistinguishable when side-by-side on a home screen. Violet is adjacent on the Tailwind color scale, keeps the family feel, and is distinct enough to identify which app the user is in.

**Alternative considered**: Keep blue (current). Rejected — blue feels more website-like and doesn't match the established palette in this repo at all.

**Alternative considered**: Use a complementary color (teal, amber). Rejected — too far from the family aesthetic.

### 2. No shared `NavBar` component with `client-time`

The bottom nav in `client-time` has two tabs (Timer, Log); `client-watch` needs four (Events, Movies, TV, People). Extracting a shared component adds coupling and `packages/ui` complexity for minimal gain. Each app defines its own `NavBar` in `App.tsx`.

**Alternative considered**: Extract to `@repo/ui`. Rejected — the two navbars have different tab counts, icons, and routes. Premature abstraction.

### 3. Floating action button (FAB) for "New Event" instead of header button

Currently "+ New Event" is a small button in the header row of the EventsPage. On mobile, placing a prominent circular FAB in the bottom-right (above the nav bar) is the standard pattern for a primary creation action. This gives it a larger touch target and doesn't crowd the page title.

**Alternative considered**: Keep as a header button. Acceptable, but small touch target and visually cluttered on mobile.

### 4. Back-button headers for secondary pages

Pages like NewEventPage, MoviesCatalogPage, and TvCatalogPage are reached from a list page and need a way to go back. These pages will get a fixed-position header row with a `←` back button and a title, replacing the inline navigation links.

**Alternative considered**: Rely on browser back gesture only. Rejected — not discoverable for new users, and the PWA shell doesn't always show a browser UI.

### 5. Tab target minimum height increase

Tailwind's `py-1.5` yields ~30px total height for small text. iOS HIG and Material Design both recommend 44px minimum touch targets. Bumping to `py-2` and `text-sm` gives ~40px which is acceptable for a segmented control.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Wide pages on desktop look stretched after removing `max-w-lg` | This is a PWA; desktop layout is a secondary concern. A `max-w-screen-sm` can be added later without affecting the spec. |
| FAB may overlap last list item | Add `pb-24` to list containers to ensure scroll-past spacing below the nav bar and FAB |
| Violet may conflict with future brand updates | Decision is reversible via a single Tailwind color token change; no semantic meaning attached |
| `select` elements for watchlist state are still native UI | Native selects are functional on mobile; replacing with a custom bottom-sheet picker is a future enhancement, out of scope |

## Migration Plan

No data migration required. Changes are isolated to `client-watch/src/`. Deploy as a standard frontend build. No server restart needed.
