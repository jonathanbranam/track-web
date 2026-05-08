## Why

`client-watch` was built with a website-style layout but is used primarily as a mobile PWA, resulting in small tap targets, desktop-constrained content, and a navigation pattern that doesn't fit the device. `client-time` already establishes the correct mobile-native pattern; `client-watch` should mirror it so both apps feel like the same product.

## What Changes

- The horizontal top navigation bar is replaced with a fixed bottom navigation bar with icons and labels
- Page containers drop the desktop-width constraint; content spans full width with consistent horizontal padding
- Cards adopt a larger border radius and more generous padding
- Primary action buttons become full-width with larger tap targets
- Accent color is standardized to violet to visually distinguish Watch from Time while staying in the same mobile design language
- Inline text navigation links are replaced with mobile back-button headers and floating action buttons
- Tab selectors get larger touch targets
- Loading states display an animated spinner instead of plain text
- Genre/tag badges adopt a pill style matching the `TagChip` pattern in `client-time`
- Form inputs use focus rings consistent with the rest of the design system
- Safe area insets are applied to the shell to handle notched/home-indicator devices
- Repeated UI patterns shared between `client-time` and `client-watch` are extracted into `packages/ui` as reusable primitives (`SegmentedControl`, `LoadingSpinner`, `Badge`, `Button`, `TextInput`); both apps consume them

## Capabilities

### New Capabilities

- `watch-mobile-ui`: Mobile-first shell and visual design system for `client-watch` — bottom navigation, safe area support, card and button conventions, accent color palette, loading states, and tag/badge styling
- `ui-primitives`: Generic, accent-color-agnostic UI components added to `packages/ui` — `SegmentedControl`, `LoadingSpinner`, `Badge`, `Button`, and `TextInput` — consumed by both `client-time` and `client-watch`

### Modified Capabilities

## Impact

- `client-watch/src/App.tsx` — replace `NavBar` component (top → bottom, add icons, violet active color)
- `client-watch/src/index.css` — add safe area CSS variables (`--sat`, `--sab`)
- `client-watch/src/pages/EventsPage.tsx` — mobile card layout, floating "+ New Event" FAB, spinner loading state
- `client-watch/src/pages/EventDetailPage.tsx` — mobile card sections, full-width buttons, pill badges
- `client-watch/src/pages/NewEventPage.tsx` — mobile form layout, full-width inputs and buttons, back header
- `client-watch/src/pages/MoviesWatchlistPage.tsx` — mobile card layout, larger tab targets, pill genre badges
- `client-watch/src/pages/MoviesCatalogPage.tsx` — mobile search bar, card layout, full-width add form
- `client-watch/src/pages/TvWatchlistPage.tsx` — mobile card layout, larger tab targets, pill genre badges
- `client-watch/src/pages/TvCatalogPage.tsx` — mobile card layout (assumed similar to MoviesCatalogPage)
- `client-watch/src/pages/PeoplePage.tsx` — mobile sub-tab layout, larger touch targets
- `packages/ui/src/components/` — new primitives: `SegmentedControl.tsx`, `LoadingSpinner.tsx`, `Badge.tsx`, `Button.tsx`, `TextInput.tsx`; exported from `packages/ui/src/index.ts`
- `client-time/src/components/TagChip.tsx` — replaced by `Badge` from `@repo/ui`; `TagChip` wrapper retained or removed
- `client-time/src/pages/` and `client-time/src/components/` — button classes, input classes, and spinner patterns replaced with shared primitives where applicable
- No backend changes; no API changes; no database changes
