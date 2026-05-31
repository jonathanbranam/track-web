## Context

The Days API (trip_days table, GET /api/trips/:id/days, PUT /api/trips/:id/days/:date) was delivered in Spec 4. This change adds the frontend tab that consumes it. The existing client-trips app has two pages (OverviewPage, InfoPage) that each fetch their data independently with no shared state. NavBar has Overview and Info tabs; Days goes between them to match the tab order in the design (Overview → Days → Info → Packing).

## Goals / Non-Goals

**Goals:**
- Render a scrollable list of per-day cards from the Days API
- Auto-scroll to today's card when the trip is active
- Add `/days` route and NavBar entry

**Non-Goals:**
- Edit mode — all content is read-only
- Prefetching or caching day data across pages
- Adding date-fns to client-trips (native Intl covers the formatting needed)

## Decisions

### Two-step fetch

DaysPage fetches the current trip first (to get the trip ID and startDate/endDate for active-trip detection), then fetches days. This is the same pattern InfoPage uses — each page owns its own data fetching with no shared context. Alternative: pass trip as a prop from a parent shell component. Rejected because the current architecture has no such shell, and adding one is out of scope.

### TripDay type in types.ts

Add `TripDay` to `client-trips/src/types.ts` matching the API shape: `{ id, tripId, date, title, body, weather }`. Keep it alongside `Trip` — no separate file needed at this scale.

### api.ts extension

Add `api.trips.days(tripId: number)` returning `{ days: TripDay[] }`. This keeps all API calls centralized and consistent with the existing `api.trips.*` pattern.

### Date formatting with native Intl

Format day dates as "Tue, Jun 3" using `new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })`. The `timeZone: 'UTC'` option is required because dates are stored as YYYY-MM-DD strings and parsed as midnight UTC — without it, local timezone offset would shift the displayed date by one day for users west of UTC.

### Auto-scroll implementation

Collect refs for each DayCard keyed by date. After days load, if the trip is active (today's ISO date string falls between startDate and endDate inclusive), call `cardRefs.current[today]?.scrollIntoView({ behavior: 'instant' })` in a `useEffect` that depends on the days array. `behavior: 'instant'` avoids a visible scroll animation on page mount.

### DayCard as an inline component

DayCard is simple enough (date header, title, weather line, markdown body) that a top-level component file is not warranted. Define it as a local function in `DaysPage.tsx`.

### NavBar tab order

Days tab is inserted between Overview and Info, matching the design's tab sequence (Overview → Days → Info → Packing). Uses a calendar icon to distinguish it visually.

## Risks / Trade-offs

- **Two fetches on mount** → adds one extra round trip vs. a shared trip context. Acceptable at this scale; latency is negligible on local/LAN.
- **Scroll on mount** → `scrollIntoView` fires after first render. If the list is long, users briefly see the top before the scroll completes. `behavior: 'instant'` minimizes this but a brief flash is possible on slow devices.
- **No date-fns** → Intl formatting is slightly more verbose but avoids a dependency. If date-fns is added to client-trips later for other reasons, the formatting helper can be migrated then.
