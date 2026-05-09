## 1. Repository

- [x] 1.1 Add `removeCandidate(candidateId: number): void` to `IWatchEventRepository` in `src/repositories/interfaces.ts`
- [x] 1.2 Implement `removeCandidate` in `SqliteWatchEventRepository`: in a single transaction, delete from `watch_event_selection` where `candidate_id = ?`, delete from `watch_event_votes` where `candidate_id = ?`, delete from `watch_event_candidates` where `id = ?`

## 2. API Route

- [x] 2.1 Add `DELETE /:id/candidates/:candidateId` to `src/routes/watch/events.ts`: return 403 if not a participant, 404 if candidate not found, 409 if event is completed, 204 on success

## 3. Client API

- [x] 3.1 Add `events.removeCandidate(eventId: number, candidateId: number): Promise<void>` to `client-watch/src/api.ts`

## 4. UI

- [x] 4.1 Add per-candidate `confirmingRemove` state to `EventDetailPage.tsx` (track which candidate id is in confirmation state, or `null`)
- [x] 4.2 Render remove affordance on each candidate card when `myInvite` is set and event is not completed
- [x] 4.3 First tap sets `confirmingRemove` to that candidate's id, replacing the remove button with "Confirm" + "Cancel" controls
- [x] 4.4 "Confirm" tap calls `api.events.removeCandidate`, clears `confirmingRemove`, reloads event detail
- [x] 4.5 "Cancel" tap resets `confirmingRemove` to `null` with no API call

## 5. Tests

- [x] 5.1 Add repository-level test for `removeCandidate`: verify candidate row deleted, votes deleted, and selection cleared when candidate is the selection
- [x] 5.2 Add route-level tests: 403 for non-invitee, 404 for missing candidate, 409 for completed event, 204 on success
- [x] 5.3 Verify existing watch-event tests still pass
