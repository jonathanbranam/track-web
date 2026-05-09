## 1. Repository layer

- [ ] 1.1 Extract the inline `INSERT OR IGNORE INTO watch_event_invites` from `createEvent` into a standalone `addInvitee(eventId: number, userId: number): void` method in `watch-event.repository.ts`
- [ ] 1.2 Add `removeInvitee(eventId: number, userId: number): boolean` method — deletes the row and returns `true` if a row was deleted, `false` if none matched
- [ ] 1.3 Update `createEvent` to call `addInvitee` for the creator immediately after inserting the event row, with `attendance = 'yes'`
- [ ] 1.4 Add `addInvitee` and `removeInvitee` signatures to `IWatchEventRepository` in `src/repositories/interfaces.ts`

## 2. Backend: bug fix and new endpoints

- [ ] 2.1 Fix `POST /api/watch/events`: add `socialRepo.isMember(inv.groupId, userId)` check before expanding group invites; return 403 if the creator is not a member of the group
- [ ] 2.2 Add `POST /api/watch/events/:id/invitees` route — auth: `isHost || isInvited`; reuse the existing `inviteeSchema`; apply the same per-invitee connection and group-membership validation (using the requester's userId); call `eventRepo.addInvitee` for each resolved user; return 409 if `completedAt` is set
- [ ] 2.3 Add `DELETE /api/watch/events/:id/invitees/:userId` route — auth: `isHost || isInvited`; return 403 if `:userId` equals `event.createdByUserId`; return 409 if `completedAt` is set; call `eventRepo.removeInvitee` and return 404 if it returns `false`

## 3. Shared UI: InviteePicker component

- [ ] 3.1 Create `packages/ui/src/social/InviteePicker.tsx` — on mount, fetch connectable users and groups in parallel (`socialApi.getConnectableUsers()` and `socialApi.getGroups()`); render a **People** section (checkbox list filtered by `excludeUserIds`) and a **Groups** section (toggle button per group); `onChange` fires with `Array<{ type: 'user'; userId: number } | { type: 'group'; groupId: number }>`
- [ ] 3.2 Export `InviteePicker` from `packages/ui/src/social/index.ts`
- [ ] 3.3 Export `InviteePicker` from `packages/ui/src/index.ts`

## 4. API client

- [ ] 4.1 Add `events.addInvitees(id: number, invitees: Invitee[]): Promise<{ ok: boolean }>` to `client-watch/src/api.ts` — calls `POST /api/watch/events/:id/invitees`
- [ ] 4.2 Add `events.removeInvitee(id: number, userId: number): Promise<{ ok: boolean }>` to `client-watch/src/api.ts` — calls `DELETE /api/watch/events/:id/invitees/:userId`

## 5. Frontend: NewEventPage

- [ ] 5.1 Import `InviteePicker` from `@repo/ui`; add it below the date field with a label (e.g. "Invite"); manage selected invitees in local state
- [ ] 5.2 Pass the selected invitees array to `api.events.create({ title, scheduledDate, invitees: selected })` on submit

## 6. Frontend: EventDetailPage

- [ ] 6.1 Add a collapsed "Invite More" section visible to any participant (`myInvite` truthy or `isHost`); expand on tap to render `InviteePicker` with `excludeUserIds` set to the IDs of all current invitees
- [ ] 6.2 On "Invite More" submit, call `api.events.addInvitees` with the picker selection; on success reset the picker and reload the event detail
- [ ] 6.3 Add a remove button to each invitee row where `inv.userId !== event.createdByUserId`; on tap call `api.events.removeInvitee(eventId, inv.userId)` and reload
- [ ] 6.4 After a successful self-removal (removed userId equals current user's id), navigate to `/events` instead of reloading
