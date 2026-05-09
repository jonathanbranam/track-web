## 1. Database Migration

- [x] 1.1 Add a migration block in `src/db.ts` that recreates `watch_events` without the `type` column: CREATE new table, INSERT from old (selecting all columns except `type`), DROP old, RENAME new to `watch_events`
- [x] 1.2 Remove the `CHECK(type IN ('movie','tv'))` constraint from the new table definition and verify the migration runs cleanly on a fresh DB

## 2. Backend Types and Repository

- [x] 2.1 Remove `type: 'movie' | 'tv'` from the `WatchEvent` interface in `src/repositories/interfaces.ts`
- [x] 2.2 Remove `type` from the `createEvent` function signature and INSERT statement in `src/repositories/sqlite/watch-event.repository.ts`
- [x] 2.3 Remove `type` from the row-to-object mapping in all `watch_events` SELECT queries in the repository

## 3. Backend Routes

- [x] 3.1 Remove `type: z.enum(['movie', 'tv'])` from the create-event Zod schema in `src/routes/watch/events.ts`
- [x] 3.2 Remove `type` from the `eventRepo.createEvent(...)` call arguments
- [x] 3.3 Replace `event.type === 'movie'` with `candidate.itemType === 'movie'` in the completion handler
- [x] 3.4 Replace `event.type === 'tv'` with `candidate.itemType === 'tv'` in the completion handler

## 4. Client API Types

- [x] 4.1 Remove `type` from the `WatchEvent` interface in `client-watch/src/api.ts`
- [x] 4.2 Remove `type` from the `events.create()` parameter type

## 5. New Event Form

- [x] 5.1 Remove the `typeOptions` constant, `type` state variable, and the Type `SegmentedControl` field from `NewEventPage.tsx`
- [x] 5.2 Remove `type` from the `api.events.create(...)` call

## 6. Event Detail Page — Nominate UI

- [x] 6.1 Add `searchQuery`, `searchResults`, and `pickedCandidate` state to `EventDetailPage.tsx`
- [x] 6.2 Implement a debounced (300 ms) effect that fires parallel `GET /api/watch/movies?q=` and `GET /api/watch/tv?q=` requests when `searchQuery` changes, then merges results with a `type` label
- [x] 6.3 Render a search input and pick list that shows merged movie and TV results with type badges; on selection populate `pickedCandidate` with `{ movieId?, seriesId?, itemType }`
- [x] 6.4 Update `handleAddCandidate` to submit `{ movieId }` or `{ seriesId }` from `pickedCandidate` and clear it on success

## 7. Event Detail Page — Selection and Display

- [x] 7.1 Add `selectedCandidateItemType` derived state: when `selectionCandidateId` changes, look up the candidate in `sortedCandidates` and read its `itemType`
- [x] 7.2 Change the episode-mode toggle visibility condition from `event.type === 'tv'` to `selectedCandidateItemType === 'tv'`
- [x] 7.3 Remove the `event.type` Badge from the event header card (or replace with a static label)
