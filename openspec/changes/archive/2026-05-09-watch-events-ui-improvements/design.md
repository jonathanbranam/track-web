## Context

`EventDetailPage` is the primary UI for managing a watch event. It currently lacks navigation back to the events list, and has no delete, date-edit, or selection-clear affordances. The attendance update endpoint only updates the caller's own attendance. The `EventsPage` list shows all completed events regardless of age. The "selected" display text uses an opaque candidate ID rather than the title.

Existing backend: `src/routes/watch/events.ts` with 11 endpoints; repository at `IWatchEventRepository` in `src/repositories/interfaces.ts`.

## Goals / Non-Goals

**Goals:**
- Add `DELETE /:id` (delete event), `DELETE /:id/selection` (clear selection), `POST /:id/reopen` (un-complete), and `PATCH /:id` (edit title and/or date) endpoints
- Relax `PUT /:id/attendance` to accept an optional `userId` in the body so any participant can set any invitee's attendance; update UI to expose controls for all invitees' attendance (not just the caller's own)
- Add inline date-edit UI to `EventDetailPage`
- Move completed-event list filtering to the server (`GET /` query param)
- UI-only: back nav, improved selection text

**Non-Goals:**
- Real-time sync or push updates
- Bulk operations

## Decisions

**DELETE /:id — delete event**: Any participant may delete. Cascade-deletes candidates, votes, selection, and invites in a single transaction. After delete the client navigates to `/events`.

**DELETE /:id/selection — clear selection**: Removes the `watch_event_selection` row. Blocked on completed events (consistent with other mutation guards). Any participant can clear (permissive model). After clearing, the set-selection form reappears for the host.

**POST /:id/reopen — un-complete event**: Sets `completed_at = NULL`. Does not clear the selection — the existing clear-selection flow handles that separately if needed. Any participant may reopen (permissive). Reopening a non-completed event returns 409.

**PATCH /:id — edit title and/or scheduled date**: Accepts `{ title?: string; scheduledDate?: string }` (ISO 8601 date for the latter). Any participant may update. Works on both active and completed events. No cascade effects. In the UI, `EventDetailPage` shows both the title and scheduled date as editable inline inputs; submitting either calls `PATCH /:id` and reloads event detail.

**Permissive attendance**: `PUT /:id/attendance` body gains an optional `userId` field. If omitted, defaults to the caller's own user ID (backwards-compatible). Authorization: caller must be an event participant; target `userId` must also be a participant. No ownership check on whose attendance is being set. In the UI, attendance buttons are enabled for all invitee rows (not just the current user's row), so any participant can tap to update anyone's RSVP.

**Completed-event list filter (server-side)**: `GET /` gains a `filter` query parameter. `filter=active` returns only events where `completed_at IS NULL`. `filter=completed-recent` returns: the single most-recently-completed event plus any event completed within the prior calendar month (month before the current month, not a rolling window). `EventsPage` calls both in parallel and merges the results for display. The unfiltered endpoint remains unchanged for backwards compatibility.

**Selection display**: The `getEventDetail` response already includes candidate data with titles. Display "Selected: \<title\>" using `selection.candidateId` → look up in `candidates` array for `movieTitle ?? seriesTitle`. Pure client-side change.

**Back navigation**: Add a `← Events` link at the top of `EventDetailPage` using React Router's `<Link to="/events">`. No API change.

## Risks / Trade-offs

- **Permissive attendance** allows any participant to change anyone's RSVP, which could be unexpected but matches the stated requirement and the project's equal-participant model.
- **Cascade delete** is irreversible; the UI should use the existing two-tap confirmation pattern already in use for candidate removal.
- **Completed-event filter** is server-side via a `filter` query param. `EventsPage` makes two parallel requests; if either fails the other still renders.
- **Reopen does not clear selection** — if a user reopens and wants to change the winner, they must explicitly clear selection first. This keeps the flows composable and avoids surprise data loss.
