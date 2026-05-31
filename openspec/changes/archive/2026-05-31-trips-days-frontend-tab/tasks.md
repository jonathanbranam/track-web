## 1. Types & API Client

- [x] 1.1 Add `TripDay` interface to `client-trips/src/types.ts`: `{ id, tripId, date, title, body, weather }`
- [x] 1.2 Add `api.trips.days(tripId: number)` to `client-trips/src/api.ts` returning `{ days: TripDay[] }` via `GET /api/trips/:id/days`

## 2. DaysPage Component

- [x] 2.1 Create `client-trips/src/pages/DaysPage.tsx` with loading, no-trip, and empty-days states
- [x] 2.2 Add inline `DayCard` component: formatted date header (UTC, "Tue, Jun 3"), title with bare-date fallback, optional weather line, markdown body via `<MarkdownContent>` (omit body area when empty)
- [x] 2.3 Implement two-step fetch on mount: `api.trips.current()` → `api.trips.days(trip.id)`
- [x] 2.4 Implement auto-scroll: collect card refs keyed by date; after days load, if trip is active scroll today's ref with `scrollIntoView({ behavior: 'instant' })`

## 3. Routing & NavBar

- [x] 3.1 Add `/days` route to `client-trips/src/App.tsx` wrapped in `<AuthGuard>` rendering `<DaysPage>`
- [x] 3.2 Add Days tab to `client-trips/src/components/NavBar.tsx` between Overview and Info tabs, with calendar icon and indigo active-state style

## 4. Verification

- [x] 4.1 Run `npm run build` and confirm zero TypeScript errors
- [x] 4.2 Update `llm-context.md` to reflect the Days tab as a new feature area in the trips app
