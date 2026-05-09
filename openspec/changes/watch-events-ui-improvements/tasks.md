## 1. Backend — Repository Layer

- [ ] 1.1 Add `deleteEvent(id: number): void` to `IWatchEventRepository` and SQLite implementation (cascade-delete selection, votes, candidates, invites, event in one transaction)
- [ ] 1.2 Add `clearSelection(eventId: number): void` to `IWatchEventRepository` and SQLite implementation
- [ ] 1.3 Add `reopenEvent(eventId: number): void` to `IWatchEventRepository` and SQLite implementation (sets `completed_at = NULL`)
- [ ] 1.4 Add `patchEvent(id: number, data: { title?: string; scheduledDate?: string }): WatchEvent` to `IWatchEventRepository` and SQLite implementation
- [ ] 1.5 Update `upsertAttendance` signature to accept a target `userId` parameter (separate from the caller); update SQLite implementation accordingly
- [ ] 1.6 Update `listEvents` to accept an optional `filter: 'active' | 'completed-recent'` parameter; implement `active` as `WHERE completed_at IS NULL` and `completed-recent` as the most-recently-completed event UNION events where `completed_at` falls in the prior calendar month

## 2. Backend — Routes

- [ ] 2.1 Add `DELETE /:id` route — verify caller is participant, call `deleteEvent`, return 204; return 403 for non-participants
- [ ] 2.2 Add `DELETE /:id/selection` route — verify caller is participant and event is not completed, call `clearSelection`, return 204; return 409 if completed, 403 if non-participant
- [ ] 2.3 Add `POST /:id/reopen` route — verify caller is participant and event is completed, call `reopenEvent`, return 200; return 409 if not completed, 403 if non-participant
- [ ] 2.4 Add `PATCH /:id` route — verify caller is participant, validate body has at least `title` or `scheduledDate`, call `patchEvent`, return updated event; return 400 for empty body, 403 for non-participant
- [ ] 2.5 Update `PUT /:id/attendance` route — accept optional `userId` in body (default to caller's id), verify caller is participant and target `userId` is a participant, call updated `upsertAttendance`; return 404 if target is not a participant

## 3. Backend — List Filter

- [ ] 3.1 Wire `filter` query param from `GET /` route into `listEvents` repository call

## 4. API Client (`client-watch/src/api.ts`)

- [ ] 4.1 Add `api.events.delete(id: number)` method (`DELETE /api/watch/events/:id`)
- [ ] 4.2 Add `api.events.clearSelection(id: number)` method (`DELETE /api/watch/events/:id/selection`)
- [ ] 4.3 Add `api.events.reopen(id: number)` method (`POST /api/watch/events/:id/reopen`)
- [ ] 4.4 Add `api.events.patch(id: number, data: { title?: string; scheduledDate?: string })` method (`PATCH /api/watch/events/:id`)
- [ ] 4.5 Update `api.events.rsvp` to accept an optional `userId` parameter and include it in the request body
- [ ] 4.6 Update `api.events.list` to accept an optional `filter` parameter and pass it as a query param

## 5. Frontend — EventDetailPage

- [ ] 5.1 Add `← Events` back link at the top of the page (React Router `<Link to="/events">`)
- [ ] 5.2 Add delete event button with two-tap inline confirmation; call `api.events.delete` on confirm and navigate to `/events`
- [ ] 5.3 Add inline title editing: render title as a text input; on submit call `api.events.patch` and reload
- [ ] 5.4 Add inline date editing: render scheduled date as a date input; on submit call `api.events.patch` and reload
- [ ] 5.5 Add clear-selection button (visible only when a selection exists and event is not completed); call `api.events.clearSelection` and reload
- [ ] 5.6 Add reopen button (visible only on completed events); call `api.events.reopen` and reload
- [ ] 5.7 Update selection display: replace "Candidate #N selected" with "Selected: \<movieTitle ?? seriesTitle\>" by looking up `selection.candidateId` in the `candidates` array
- [ ] 5.8 Enable attendance buttons for all invitee rows (remove the `inv.userId === userId` guard on `onClick` and `disabled`); pass the invitee's `userId` when calling `api.events.rsvp`

## 6. Frontend — EventsPage

- [ ] 6.1 Update `EventsPage` to call `api.events.list({ filter: 'active' })` and `api.events.list({ filter: 'completed-recent' })` in parallel (using `Promise.all`)
- [ ] 6.2 Render results in two sections: active events and recently completed events

## 7. Build & Verification

- [ ] 7.1 Run `npm run build:watch` and confirm zero TypeScript errors
- [ ] 7.2 Run `npm run build:server` and confirm zero TypeScript errors
- [ ] 7.3 Manually verify: back link navigates to `/events`
- [ ] 7.4 Manually verify: delete event — two-tap confirm, navigates to `/events` after success
- [ ] 7.5 Manually verify: inline title edit saves and reloads correctly
- [ ] 7.6 Manually verify: inline date edit saves and reloads correctly
- [ ] 7.7 Manually verify: clear selection button appears when selection exists on active event, is absent on completed events, clears correctly
- [ ] 7.8 Manually verify: reopen button appears on completed events, clears `completed_at`, event becomes editable again
- [ ] 7.9 Manually verify: attendance buttons are enabled for all invitee rows and update correctly
- [ ] 7.10 Manually verify: selection shows "Selected: \<title\>" with the correct movie or series name
- [ ] 7.11 Manually verify: events list shows active and recently-completed sections with correct filtering
