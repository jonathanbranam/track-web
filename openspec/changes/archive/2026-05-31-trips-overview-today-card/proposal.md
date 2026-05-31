## Why

The Overview page shows static trip metadata but gives no at-a-glance view of what's happening *today*. Family members opening the app mid-trip have to navigate to the Days tab to find the current day's plan. Surfacing today's card directly on Overview makes the most time-sensitive information immediately visible.

## What Changes

- The `OverviewPage` conditionally fetches today's day record when the trip is active (today falls within `startDate`–`endDate` inclusive).
- A "Today" card is rendered at the top of the Overview page above the Departure section, showing the day's title and markdown body.
- Tapping the card navigates to the `/days` route (which auto-scrolls to today's card).
- If no day record exists for today, or the fetch fails, the card is silently omitted.

## Capabilities

### New Capabilities

- `trip-overview-today-card`: Conditional "Today" card on the Overview page — fetches and displays today's `trip_days` record when the trip is active; tapping navigates to the Days tab.

### Modified Capabilities

_(none — no existing spec requirements change)_

## Impact

- **Frontend**: `client-trips/src/pages/OverviewPage.tsx` — conditional fetch of `/api/trips/:id/days` and new card UI.
- **API**: No new routes. Uses the existing `GET /api/trips/:id/days` endpoint (implemented in Spec 4).
- **Dependencies**: Requires Spec 4 (Days API) and Spec 5 (Days frontend route for navigation target) — both complete.
- **Backend/DB**: No changes.
