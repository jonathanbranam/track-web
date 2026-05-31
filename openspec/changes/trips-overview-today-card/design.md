## Context

`OverviewPage` currently fetches the current trip once on mount and renders static metadata: name, destination, date range, nights/fullDays counts, and departure/return notes. The Days tab already has a full day-list API (`GET /api/trips/:id/days`) and a `DaysPage` that auto-scrolls to today. The Overview page has no awareness of the current day's plan.

## Goals / Non-Goals

**Goals:**
- Show today's day record (title + body) as a tappable card at the top of OverviewPage when the trip is active.
- Tap navigates to `/days`, which auto-scrolls to today's card.
- Silently omit the card if the trip is inactive, dates are unset, the fetch fails, or no record exists for today.

**Non-Goals:**
- No new API routes or backend changes.
- No loading state for the Today card (it either appears or it doesn't; the main content renders regardless).
- No displaying weather on the Today card — the Overview card is a brief prompt to tap through, not a duplicate of the Days view.

## Decisions

**Fetch all days, find today client-side.**
There is no single-day GET endpoint, and there's no reason to add one. The days list is small (≤14 rows for a typical trip). Fetching all days and filtering for today is simpler and consistent with how DaysPage works. A dedicated `/days/today` endpoint would be premature optimization.

**Secondary fetch only when the trip is active.**
If `trip.startDate` and `trip.endDate` are both set and today falls within the range, fire `api.trips.days(trip.id)` in a second effect. If either date is missing, or today is outside the range, skip the fetch entirely. This keeps the common (inactive trip) case free of an extra network request.

**Separate state for the Today card.**
Add a `todayDay: TripDay | null` state to `OverviewPage`. The main trip-fetch effect stays unchanged. A second `useEffect` depending on `trip` triggers the conditional days fetch. On error or no match, `todayDay` stays null and the card is simply not rendered.

**Duplicate the `isActive` helper inline.**
`isActive` is four lines of logic already defined in `DaysPage`. Extracting it to a shared util is scope creep for this change; the logic is small enough to duplicate. If a third page needs it, extract then.

**Navigate with `useNavigate`.**
The Today card is a `<button>` (or `<div role="button">`) that calls `navigate('/days')` via React Router's `useNavigate`. This is consistent with how the rest of the app handles in-app navigation.

**Visual treatment.**
The Today card sits above the Departure section, clearly labeled (e.g., "Today" eyebrow label in indigo). It uses the same `bg-gray-800 rounded-lg` card pattern as DaysPage cards to signal it's a day-record preview. An arrow or chevron at the right edge signals it's tappable.

## Risks / Trade-offs

**Extra network request on active trips.** The days fetch fires on every Overview mount when the trip is active. It's a small payload with no server-side joins (just a table scan by `trip_id`), so latency impact is negligible. The main content renders immediately from the trip fetch; the Today card appears after the secondary fetch resolves.

**UTC date comparison.** `new Date().toISOString().slice(0, 10)` gives the current UTC date, which can differ from the user's local date near midnight. This is the same pattern DaysPage already uses — consistency matters more than perfect timezone handling here, and the family use-case (trip planning) isn't midnight-sensitive.
