## Context

Watch events have a fully-implemented backend invite model (individual users and groups, RSVP, candidate nomination gated on being an invitee) and a partially-implemented frontend. The UI always sends `invitees: []` on create, and there is no post-creation invite management. Two backend gaps also exist: the creator is not auto-inserted into `watch_event_invites`, and group invites in `POST /api/watch/events` skip the `isMember` check that the social-groups spec requires.

The social layer already provides everything needed: `GET /api/social/users/connectable`, `GET /api/social/groups`, `socialRepo.isConnected`, and `socialRepo.isMember`. The shared `@repo/ui` package already has `ConnectableUserPicker` as a reference pattern for a self-fetching social component.

## Goals / Non-Goals

**Goals:**
- Fix the creator auto-invite gap so hosts can RSVP and nominate candidates
- Fix the missing `isMember` check on group invites at event creation
- Expose invite selection in the create-event form (users + groups)
- Add `POST /api/watch/events/:id/invitees` for post-creation invite management
- Surface an "Invite More" section in the event detail page for any participant
- Make RSVP attendance (yes/no/maybe) reachable end-to-end

**Non-Goals:**
- Invite notifications
- Limiting who can add or remove invitees (no permission tiers; all participants have equal rights, creator protected from removal)

## Decisions

### Creator auto-invite: insert with `attendance = 'yes'`

The creator is inserted into `watch_event_invites` during `createEvent` with `attendance = 'yes'`. This makes them a first-class invitee, so all invitee-gated checks (nominate, vote, RSVP) work without special-casing `createdByUserId` throughout the codebase.

**Alternative considered**: treat the creator as implicitly present via `createdByUserId` and add explicit `isHost || isInvited` guards everywhere. Rejected because it spreads the exception across multiple callsites and makes future queries (e.g., "get all yes-RSVP attendees") incorrect without extra logic.

### Extract `addInvitee(eventId, userId)` from `createEvent`

The inline `INSERT OR IGNORE INTO watch_event_invites` in `createEvent` is extracted into a dedicated repository method and added to `IWatchEventRepository`. This method is called from both `createEvent` and the new `POST /:id/invitees` route handler. Using `INSERT OR IGNORE` handles duplicates silently in both paths.

### Group invite validation: `isMember` required at both endpoints

Both `POST /api/watch/events` (create) and `POST /api/watch/events/:id/invitees` (post-create) validate `socialRepo.isMember(groupId, requesterId)` before expanding a group. This aligns with the social-groups spec ("Non-member cannot add members → 403") and closes the existing gap in the create route.

### `POST /:id/invitees`: any participant may call it

The participant check is `isHost(event, userId) || eventRepo.isInvited(id, userId)`. No further permission tier beyond "you must be part of this event." Mirrors the social-groups equal-rights model.

Per-invitee validation uses the requester's connections and group memberships — not the host's. A non-connected user added by a request will be rejected regardless of who the host is.

### Group expansion: server-side at invite time

When `{ type: 'group', groupId }` is sent, the server expands current group members and inserts individual `watch_event_invites` rows. The client sends the group reference; the server resolves it. This means:

- Later group membership changes do NOT affect the event invite list (consistent with existing behavior at creation)
- The `InviteePicker` component does not need to fetch or display group member details — just group name and ID
- Expansion logic lives in one place (the route handler), reused for both create and post-create

**Alternative considered**: client-side expansion (picker fetches members and sends individual user IDs). Rejected because it requires an extra API call per group in the UI, and puts expansion logic in the client where it duplicates server validation.

### `InviteePicker`: new shared component in `@repo/ui`

A new `InviteePicker` component alongside `ConnectableUserPicker` in `packages/ui/src/social/`. It self-fetches connectable users and groups on mount (two parallel calls: `socialApi.getConnectableUsers()` and `socialApi.getGroups()`). Props:

```ts
interface Props {
  selected: Array<{ type: 'user'; userId: number } | { type: 'group'; groupId: number }>
  onChange: (invitees: Props['selected']) => void
  excludeUserIds?: number[]   // users already invited (skipped in the list)
}
```

UI layout: two sections — **People** (checkbox list, filtered by `excludeUserIds`) and **Groups** (each group row with name and a toggle button). Selecting a group adds `{ type: 'group', groupId }` to the selection; the group row shows as selected until deselected. Individual user rows show as checked.

The `excludeUserIds` prop is used in `EventDetailPage` to hide users who are already invited; omitted in `NewEventPage` (no existing invitees on create).

**Alternative considered**: extend `ConnectableUserPicker` to support groups. Rejected because the return type would be a breaking change to the existing interface and the two components have meaningfully different behavior.

### `DELETE /:id/invitees/:userId`: any participant may remove any invitee except the creator

The removal endpoint mirrors the social-groups model: any participant (host or invitee) may remove any invitee. One exception: the creator's invite row is protected. If `userId === event.createdByUserId`, the server returns 403. This prevents the host from being stripped of candidacy/voting rights while still holding host-only privileges.

Removing yourself (leaving the event) is allowed, as long as you are not the creator. A participant who removes themselves loses access to the event detail (they are no longer a participant), consistent with how removing yourself from a group works.

The UI renders a remove button on each invitee row in the "Invite More / Attendees" section, visible to any participant. The creator's row omits the remove button.

**Alternative considered**: only the host or the target user themselves may remove. Rejected in favor of full parity with social-groups equal-rights model.

### `removeInvitee(eventId, userId)` repository method

A counterpart to `addInvitee` — deletes the `watch_event_invites` row for the given user. Returns a boolean indicating whether a row was actually deleted (used to return 404 if the invitee did not exist).

### RSVP: no UI change needed

The `EventDetailPage` already renders RSVP buttons (yes/no/maybe) for invitees. Once users are actually invited via this change, RSVP becomes functional automatically. No additional UI work is required.

## Risks / Trade-offs

**Any participant can invite or remove anyone** → The host has no veto over who invitees bring in or remove. Acceptable for a small self-hosted app with trusted social connections; revisit if access control needs tighten.

**Self-removal leaves the event inaccessible** → A non-creator invitee who removes themselves can no longer view event details. This is intentional (mirrors leaving a group) but could be surprising. No mitigation planned; behavior is consistent with the groups model.

**Two extra API calls per page that embeds `InviteePicker`** → `NewEventPage` and `EventDetailPage` each make two additional requests on mount (connectable users + groups). On a local self-hosted server with a small social graph, this is negligible. If the picker is closed/collapsed by default in `EventDetailPage`, the calls can be deferred to when the section expands.

**Creator auto-invite with `attendance = 'yes'`** → Existing events in the database have no `watch_event_invites` row for their creator. The fix only applies to newly created events; historical events remain unchanged. The existing code already handles creators via `createdByUserId` checks for host-only actions (selection, complete), so old events are not broken — they just still can't nominate candidates.

## Migration Plan

1. Deploy backend changes:
   - Repository: extract `addInvitee`, update `createEvent` to auto-invite creator
   - Route: add group membership check to `POST /events`; add `POST /:id/invitees`; add `DELETE /:id/invitees/:userId`
   - Repository: add `removeInvitee(eventId, userId)` method
   - No schema migration needed — `watch_event_invites` already exists
2. Deploy frontend changes:
   - Add `InviteePicker` to `@repo/ui`
   - Update `NewEventPage` and `EventDetailPage`

No rollback complexity — the new endpoint is additive and the creator auto-invite only affects new events.

## Open Questions

None — the social-groups spec provides all the policy precedent needed.
