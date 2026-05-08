## 1. packages/ui — Shared Primitives

- [x] 1.1 Create `packages/ui/src/components/LoadingSpinner.tsx` — centered animated spinner, no app-specific color assumptions
- [x] 1.2 Create `packages/ui/src/components/Badge.tsx` — pill-shaped label with color variant prop (`indigo`, `violet`, `gray`)
- [x] 1.3 Create `packages/ui/src/components/SegmentedControl.tsx` — horizontal selectable tab strip; accent color supplied by consumer via props/CSS
- [x] 1.4 Create `packages/ui/src/components/Button.tsx` — primary/secondary/danger variants; loading and disabled states
- [x] 1.5 Create `packages/ui/src/components/TextInput.tsx` — labeled input with optional error message; forwards all native input attributes
- [x] 1.6 Export all five components from `packages/ui/src/index.ts`

## 2. client-time — Migrate to Shared Primitives

- [x] 2.1 Replace `TagChip` with `Badge` — update all call sites in `client-time/src/` to use `<Badge color="indigo">` from `@repo/ui`; remove or reduce `TagChip.tsx` to a re-export stub
- [x] 2.2 Replace inline button class patterns in `client-time/src/` with `Button` from `@repo/ui`
- [x] 2.3 Replace inline input class patterns in `client-time/src/` with `TextInput` from `@repo/ui`
- [x] 2.4 Replace inline spinner patterns in `client-time/src/` with `LoadingSpinner` from `@repo/ui`
- [x] 2.5 Build `client-time` and do a visual review pass — confirm no regressions in appearance

## 3. client-watch — Shell and Navigation

- [x] 3.1 Add `--sat` and `--sab` safe area CSS variables to `client-watch/src/index.css`
- [x] 3.2 Replace the top `NavBar` in `client-watch/src/App.tsx` with a fixed bottom nav bar — four tabs (Events, Movies, TV, People) each with an icon and label; violet active color; `--sab` bottom padding
- [x] 3.3 Remove the `max-w-lg mx-auto` desktop-width constraint from page container elements; add consistent horizontal padding in its place
- [x] 3.4 Add bottom padding to all list/scroll containers to clear the nav bar (and FAB where present)

## 4. client-watch — Page Restyling

- [x] 4.1 `EventsPage.tsx` — mobile card layout; replace "+ New Event" header button with a FAB fixed above the nav bar; replace loading text with `LoadingSpinner`
- [x] 4.2 `EventDetailPage.tsx` — mobile card sections; full-width primary action buttons via `Button`; pill-style type badges via `Badge color="violet"`
- [x] 4.3 `NewEventPage.tsx` — add back-button header (← + page title); replace form inputs with `TextInput`; replace submit button with full-width `Button`
- [x] 4.4 `MoviesWatchlistPage.tsx` — mobile card layout; replace state filter tabs with `SegmentedControl`; pill genre badges via `Badge color="violet"`; `LoadingSpinner` for loading state
- [x] 4.5 `MoviesCatalogPage.tsx` — add back-button header; mobile card layout; replace search input with `TextInput`; `LoadingSpinner` for loading state
- [x] 4.6 `TvWatchlistPage.tsx` — mobile card layout; replace state filter tabs with `SegmentedControl`; pill genre badges via `Badge color="violet"`; `LoadingSpinner` for loading state
- [x] 4.7 `TvCatalogPage.tsx` — add back-button header; mobile card layout; `LoadingSpinner` for loading state
- [x] 4.8 `PeoplePage.tsx` — replace sub-tabs with `SegmentedControl`; larger touch targets; `LoadingSpinner` for loading state

## 5. Visual Review

- [x] 5.1 Build both clients (`npm run build:time` and `npm run build:watch`) — confirm no TypeScript or build errors
- [x] 5.2 Load `client-watch` and confirm no blue accent colors remain — check nav active state, buttons, focus rings, badges, and segmented control selection
- [x] 5.3 Test `client-watch` at mobile viewport — confirm bottom nav clears the home indicator, FAB is above nav, back-button headers are present on secondary pages, and tap targets feel comfortable
- [x] 5.4 Load `client-time` and confirm visual appearance is unchanged after primitive migration
