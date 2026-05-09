## Why

Candidates can be added to watch events but never removed — once nominated, a title is stuck on the list until the event is completed. This makes it impossible to clean up mistaken nominations or duplicates.

## What Changes

- Any participant (host or invitee) can remove any candidate from a watch event, as long as the event is not yet completed
- Removing a candidate also deletes all associated votes for that candidate
- A remove affordance appears on each candidate card in the event detail UI, visible to all participants on active events

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `watch-events`: New requirement to remove a candidate from a watch event (DELETE endpoint, open to all participants; blocked on completed events)

## Impact

- `src/repositories/interfaces.ts` — add `removeCandidate(candidateId: number): void` to `IWatchEventRepository`
- `src/repositories/sqlite/watch-event.repository.ts` — implement `removeCandidate`: delete from `watch_event_candidates` (cascades votes via FK or explicit delete)
- `src/routes/watch/events.ts` — new `DELETE /:id/candidates/:candidateId` route; participant auth (host or invitee); 404 if candidate not found; 409 if event is completed
- `client-watch/src/api.ts` — add `events.removeCandidate(eventId, candidateId)`
- `client-watch/src/pages/EventDetailPage.tsx` — add remove button to each candidate card, visible to all participants on non-completed events
