## Why

The watch events UI is missing basic navigation and CRUD affordances (back button, event deletion, date editing, selection clearing) and has several UX gaps — ambiguous selection display, stale completed-event visibility — that make the feature feel unfinished. Several permission rules are also more conservative than necessary for a small-group use case.

## What Changes

- Add back affordance from event detail to events list
- Add event deletion (any participant, API + UI)
- Add API endpoint + UI to clear the confirmed movie/TV selection
- Update selection display from "Candidate #N selected" to "Selected: \<title\>"
- Completed events list: show only the most recent completed event plus any completed within the prior calendar month
- Allow re-opening a completed event (clear `completed_at`) to change selection
- Allow editing the event's title and scheduled date after creation
- Attendance: any participant may update any invitee's attendance (permissive)

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `watch-events`: Multiple requirement changes — event deletion, clear selection, re-open completed event, edit event date, permissive attendance updates, completed-event list filtering, improved selection display text

## Impact

- `client-watch/src/pages/EventDetailPage.tsx` — back nav, delete, clear selection, re-open, date edit, permissive attendance controls
- `client-watch/src/pages/EventsPage.tsx` — completed-event list filtering logic
- Backend watch-events routes — new endpoints: delete event, clear selection, re-open event; updated endpoints: patch event date, attendance (relaxed auth)
- `openspec/specs/watch-events/spec.md` — delta spec covering all modified requirements
