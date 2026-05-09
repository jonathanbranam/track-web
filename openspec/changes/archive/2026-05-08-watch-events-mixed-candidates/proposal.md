## Why

Watch events currently require a `movie` or `tv` type at creation, locking all candidates to one content type. This is unnecessarily restrictive — a group may want to vote between a movie and a TV episode, or simply not know the content type when setting up the event.

## What Changes

- **BREAKING**: Remove the `type` field from the `POST /api/watch/events` request body and from `watch_events` table (or make it nullable/unused)
- Remove the "Type" segmented control (Movie / TV) from the New Event form
- Allow candidates of either type (movie or TV series) to be nominated for any event, regardless of each other
- Update selection logic: `episodeMode` is required when the **selected candidate** is a TV series, not when `event.type === 'tv'`
- Replace the raw numeric ID input in the nominate form with a search-and-pick UI that searches both movies and TV series

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `watch-events`: Event creation no longer accepts or requires a `type` field; candidates of any type may be added to any event; `episodeMode` in selection is driven by the selected candidate's type rather than the event type

## Impact

- **DB**: `watch_events.type` column becomes unused (migration drops it or leaves it nullable with no enforcement)
- **API** (`src/routes/watch/events.ts`): Remove `type` from create-event validation; remove type-gating on candidate nomination
- **Repository** (`src/repositories/sqlite/watch-event.repository.ts`): Remove type filtering on candidate add; update completion logic which currently checks `event.type` to determine watchlist transition
- **Client** (`client-watch/src/pages/NewEventPage.tsx`): Drop type selector
- **Client** (`client-watch/src/pages/EventDetailPage.tsx`): Replace raw ID input with search picker for both movies and TV series; drive `episodeMode` UI from the selected candidate's `itemType` instead of `event.type`
