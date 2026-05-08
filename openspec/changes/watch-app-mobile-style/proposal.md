## Why

`client-watch` was built with a website-style layout — horizontal top navigation, desktop-constrained content width, small tap targets, and `rounded` cards — but it is a PWA used primarily on mobile. The `client-time` app in the same repo already establishes a mobile-native pattern (fixed bottom nav, full-width layout, `rounded-2xl` cards, safe area insets) that `client-watch` should mirror so both apps feel like the same product.

## What Changes

- The horizontal top navigation bar is replaced with a fixed bottom navigation bar matching the `client-time` pattern (icon + label, `--sab` safe-area padding, indigo/violet active color)
- Page containers drop the `max-w-lg mx-auto` desktop constraint; content spans full width with consistent horizontal padding
- Card components adopt `rounded-2xl` with consistent `p-5` padding (up from `rounded p-3`)
- Primary action buttons become full-width with `py-3 rounded-xl font-semibold` tap targets (matching `client-time` button pattern)
- Accent color is standardized to **violet** (`violet-600`/`violet-400`) to visually distinguish Watch from Time (which uses indigo) while staying in the same mobile design language
- Inline text links (`Browse Catalog →`, `← My List`) are replaced with proper mobile back-button headers and floating action buttons
- Tab selectors (state filters, People sub-tabs) get larger touch targets (`py-2.5` vs `py-1.5`)
- Loading states display an animated spinner instead of plain `"Loading…"` text
- Genre/tag badges adopt rounded-full pill style with `bg-violet-900/60 text-violet-300` (matching `TagChip` in `client-time`)
- Form inputs use `focus:ring-2 focus:ring-violet-500` focus rings instead of `focus:border-blue-500` borders
- `index.css` adds safe area CSS variables (`--sat`, `--sab`) matching `client-time`

## Capabilities

### New Capabilities

- `watch-mobile-ui`: Mobile-first shell and visual design system for `client-watch` — bottom navigation, safe area support, card and button conventions, accent color palette, loading states, and tag/badge styling

### Modified Capabilities

_(none — no functional or API behavior changes)_

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
- No backend changes; no API changes; no database changes
