## Context

Candidates can be added to watch events but never removed. The `watch_event_candidates` table has no cascade deletes — `watch_event_votes.candidate_id` and `watch_event_selection.candidate_id` are plain FK references without `ON DELETE CASCADE`, so removing a candidate requires explicitly cleaning up related rows first. The existing permission model follows the pattern established in `social-groups` and `watch-event-invites`: all participants have equal rights — host or invitee, no ownership tiers.

## Goals / Non-Goals

**Goals:**
- Any participant (host or invitee) can remove any candidate from a non-completed event
- Removal is atomic: votes and the confirmed selection (if pointing at the candidate) are cleared in the same transaction
- Blocked on completed events (409)

**Non-Goals:**
- No ownership restriction (the person who suggested a candidate has no special removal rights)
- No soft-delete or audit trail of removed candidates
- No undo / restore
- No schema migration needed (no new tables or columns)

## Decisions

**Permission: any participant, no ownership**
Mirrors the social-groups and watch-event-invites models. All participants have equal rights. The route guard checks `isInvited(eventId, userId)` — the same check used for nomination and voting.

**Remove the confirmed selection if it points to the deleted candidate**
The `watch_event_selection` table has one row per event and its `candidate_id` FK has no cascade. Rather than blocking removal of the selected candidate (which would be surprising and hard to explain in the UI), the `removeCandidate` repository method deletes the selection row first if it references the target candidate, then deletes votes, then deletes the candidate — all in a single transaction. The host can re-confirm a different selection after. Returning 204 on success is sufficient; the UI reloads the full event detail.

**Route returns 404 if candidate not found, 403 if not a participant, 409 if event is completed**
Consistent with existing event routes. No special status for "candidate belongs to a different event" — that would require an extra query; a 404 is a reasonable response since the candidate effectively doesn't exist from the requester's point of view.

**No schema changes**
All cleanup is handled at the application layer inside a transaction. Adding `ON DELETE CASCADE` to existing FK columns would require a table rebuild (SQLite doesn't support `ALTER COLUMN`), and the explicit transaction approach is equally safe.

## Risks / Trade-offs

**Clearing a confirmed selection silently** → The UI reloads event detail after removal; the host will see the selection is gone and must pick again. This is preferable to blocking removal and confusing participants.

**No cascade in schema** → If a future migration adds cascade, `removeCandidate` will still work correctly (deletes become no-ops on already-gone rows). No coordination needed.

## Migration Plan

No data migration. No schema changes. Deploy is a standard build + restart.
