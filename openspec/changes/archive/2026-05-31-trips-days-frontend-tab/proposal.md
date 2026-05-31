## Why

The trips app has a Days API (trip_days table, GET/PUT routes) but no frontend tab to display it. Family members can't yet see the day-by-day plan for the trip. Adding the Days tab completes the core read-only experience and enables the "Today" card on the Overview page.

## What Changes

- New `DaysPage.tsx` component rendering one card per calendar day
- Each card shows: formatted date header, title (falls back to bare date), optional weather line, markdown body
- Auto-scroll to today's card when the trip is active (today falls between startDate and endDate)
- Empty state when no day records exist
- New `/days` route in App.tsx with AuthGuard
- Days tab added to NavBar (after Info tab)

## Capabilities

### New Capabilities
- `days-page`: DaysPage frontend — fetches `/api/trips/:id/days`, renders per-day cards with date/title/weather/markdown, auto-scrolls to today when trip is active

### Modified Capabilities
- `trip-plan`: Add Days tab entry to NavBar (existing spec covers NavBar requirements; days tab needs a new requirement added)

## Impact

- `client-trips/src/pages/DaysPage.tsx` — new file
- `client-trips/src/App.tsx` — new `/days` route
- `client-trips/src/components/NavBar.tsx` — Days tab entry
