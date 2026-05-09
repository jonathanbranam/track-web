## Why

Watch events support an invite list at creation time, but the UI always sends `invitees: []`, so no one ever gets invited. The creator is not added to the invite list either, which prevents them from nominating candidates or RSVPing. This change wires up invite selection in the create form, adds post-creation invite management for all participants, and makes RSVP attendance functional end-to-end.

## What Changes

- The event creator is automatically added to `watch_event_invites` on creation (so they can RSVP and nominate candidates)
- The create-event form gains an invite picker — connected users with checkboxes, plus groups with an "Add all" action
- A new `POST /api/watch/events/:id/invitees` endpoint lets any current participant (host or invitee) add more invitees to an existing event; no permission tiers — all participants have equal rights, mirroring the social-groups model
- The event detail page gains an "Invite More" section (visible to host and invitees) that calls the new endpoint
- Inviting a group expands to all current members at invite time; later group changes do not affect the invite list
- **Group invite rule (aligned with social-groups)**: to invite a group, the requester must be a member of that group; fixes an existing gap in `POST /api/watch/events` where group membership was not validated
- Connection validation always uses the requester's own connections — an invitee adding someone new must be connected to that person
- Duplicate invites are silently skipped
- Any participant (host or invitee) can remove any invitee except the creator; mirroring the social-groups equal-rights model with one protected role — the creator's invite row cannot be deleted because hosthood is tied to `created_by_user_id`
- Invited users can indicate attendance as `yes`, `no`, or `maybe` on the event detail page (already specced and implemented in the backend; this change makes it reachable by ensuring people are actually invited)

## Capabilities

### New Capabilities

None — this change extends existing capabilities only.

### Modified Capabilities

- `watch-events`: Creator auto-invite on event creation; `POST /:id/invitees` for adding invitees post-creation; `DELETE /:id/invitees/:userId` for removing invitees (any participant, creator protected); group membership validation on group invites (both at creation and post-creation)
- `watch-mobile-ui`: Invite picker on the create-event form; "Invite More" section on event detail with per-invitee remove action; RSVP attendance controls (yes/no/maybe) surfaced as a functional UI element

## Impact

- `src/repositories/sqlite/watch-event.repository.ts` — `createEvent` inserts creator into `watch_event_invites`; extract `addInvitee(eventId, userId)` and add `removeInvitee(eventId, userId)` methods
- `src/repositories/interfaces.ts` — add `addInvitee` and `removeInvitee` to `IWatchEventRepository`
- `src/routes/watch/events.ts` — fix group membership check in `POST /`; new `POST /:id/invitees` route; new `DELETE /:id/invitees/:userId` route; participant auth allows host or any invitee
- `packages/ui/src/social/InviteePicker.tsx` — new shared component: checkbox list of connected users + group rows with "Add all"; returns `Array<{ type: 'user', userId } | { type: 'group', groupId }>`
- `packages/ui/src/social/index.ts` and `packages/ui/src/index.ts` — export `InviteePicker`
- `client-watch/src/api.ts` — add `events.addInvitees(id, invitees)` method
- `client-watch/src/pages/NewEventPage.tsx` — add `InviteePicker` section; pass selections to `api.events.create`
- `client-watch/src/pages/EventDetailPage.tsx` — add "Invite More" section for participants; RSVP attendance buttons already present, no UI change needed
