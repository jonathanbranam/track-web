## 1. Database Migrations

- [ ] 1.1 Add `display_name TEXT` column to `users` in `src/db.ts` (additive migration with `ALTER TABLE IF NOT EXISTS` guard)
- [ ] 1.2 Add `description TEXT` column to `groups` in `src/db.ts` (additive migration with `ALTER TABLE IF NOT EXISTS` guard)
- [ ] 1.3 Add `user_invite_codes` table to `src/db.ts`
- [ ] 1.4 Add `user_connections` table with `CHECK (user_id_a < user_id_b)` to `src/db.ts`
- [ ] 1.5 Add `user_connection_requests` table to `src/db.ts`
- [ ] 1.6 Add indexes: `idx_connections_a`, `idx_connections_b`, `idx_invite_codes_code`, `idx_conn_requests_to`

## 2. Repository

- [ ] 2.1 Define `SocialRepository` interface in `src/repositories/interfaces.ts` (connections, invite codes, connection requests, groups, connectable users query)
- [ ] 2.2 Implement `normalizeIds(a, b)` helper in `src/repositories/sqlite/social.repository.ts` ensuring `user_id_a < user_id_b`
- [ ] 2.3 Implement connection read/write/delete methods (`getConnections`, `isConnected`, `createConnection`, `deleteConnection`)
- [ ] 2.4 Implement invite code methods (`createInviteCode`, `listInviteCodes`, `getInviteCodeByToken`, `markCodeUsed`, `deleteInviteCode`)
- [ ] 2.5 Implement connection request methods (`createRequest`, `getActiveRequest`, `pruneStaleRequests`, `getPendingIncoming`, `getSentRequests`, `respondToRequest`)
- [ ] 2.6 Implement group methods (`createGroup`, `getGroup`, `listGroupsForUser`, `updateGroup`, `deleteGroup`)
- [ ] 2.7 Implement group membership methods (`addMember`, `removeMember`, `isMember`, `getMembersWithConnectionStatus`)
- [ ] 2.8 Implement `getConnectableUsers(userId)` — returns connected users for invite pickers
- [ ] 2.9 Implement `getVisibleCoMembers(userId)` — returns group co-members not connected (for PeopleTab locked section)

## 3. API Routes

- [ ] 3.1 Create `src/routes/social.ts` and register it under `/api/social/` in `src/app.ts`
- [ ] 3.2 Implement `GET /api/social/connections` and `DELETE /api/social/connections/:userId`
- [ ] 3.3 Implement `POST /api/social/invite-codes`, `GET /api/social/invite-codes`, `DELETE /api/social/invite-codes/:id`
- [ ] 3.4 Implement `POST /api/social/connect` (redeem invite code — validates expiry, single-use, not own code)
- [ ] 3.5 Implement `POST /api/social/connection-requests` (validates shared group, no existing active request, not already connected)
- [ ] 3.6 Implement `GET /api/social/connection-requests/pending` and `GET /api/social/connection-requests/sent` (decline masked as pending in sent)
- [ ] 3.7 Implement `PUT /api/social/connection-requests/:id` (accept creates connection; decline records silently; validates request belongs to caller)
- [ ] 3.8 Implement `GET /api/social/groups`, `POST /api/social/groups`, `GET /api/social/groups/:id`, `PUT /api/social/groups/:id`, `DELETE /api/social/groups/:id`
- [ ] 3.9 Implement `POST /api/social/groups/:id/members` (validates requester is member and is connected to new member) and `DELETE /api/social/groups/:id/members/:userId`
- [ ] 3.10 Implement `GET /api/social/users/connectable`

## 4. Auth Me Update

- [ ] 4.1 Update `GET /api/auth/me` handler to include `displayName` in response (use `display_name` if set, else email prefix before `@`)
- [ ] 4.2 Update `useAuth` in `packages/auth/src/useAuth.tsx` to expose `displayName` alongside `userId`
- [ ] 4.3 Update `scripts/create-user.ts` to accept optional `--name "<display name>"` flag and insert into `users.display_name`

## 5. Admin CLI

- [ ] 5.1 Create `scripts/admin.ts` with subcommand dispatch; add `"admin": "tsx scripts/admin.ts"` to `package.json` scripts
- [ ] 5.2 Implement `users:list` and `users:set-name <userId> "<name>"`
- [ ] 5.3 Implement `connections:create <a> <b>`, `connections:delete <a> <b>`, `connections:list <userId>`
- [ ] 5.4 Implement `codes:create <userId>`
- [ ] 5.5 Implement `groups:create`, `groups:list`, `groups:add-member`, `groups:remove-member`, `groups:delete`
- [ ] 5.6 Implement unknown-subcommand usage output and non-zero exit

## 6. Shared UI Package (`@repo/ui`)

- [ ] 6.1 Set up `packages/ui/src/social/index.ts` barrel export; verify Vite resolves `@repo/ui` without a pre-build step
- [ ] 6.2 Implement `ConnectableUserPicker` component (calls `GET /api/social/users/connectable`, emits `userId[]` via `onChange`)
- [ ] 6.3 Implement `InviteCodePanel` (generate code, list with status badges, delete unused)
- [ ] 6.4 Implement `RedeemInviteCode` (text input, submit, success/error feedback)
- [ ] 6.5 Implement `PeopleTab` (pending requests section, connected users section, visible co-members locked section)
- [ ] 6.6 Implement `GroupList` (fetch and render user's groups, "Create Group" entry point)
- [ ] 6.7 Implement `GroupEditor` (create/edit name+description; member list with connection badges; add-member via `ConnectableUserPicker`; remove member)

## 7. Watch App Integration

- [ ] 7.1 Add `@repo/ui` dependency to `client-watch/package.json`
- [ ] 7.2 Add `/people` route to `client-watch/src/App.tsx` (auth-gated)
- [ ] 7.3 Create `client-watch/src/pages/PeoplePage.tsx` rendering `PeopleTab`, `GroupList`, `GroupEditor`, `InviteCodePanel`, `RedeemInviteCode` in tabbed layout
- [ ] 7.4 Add **People** entry to watch `NavBar`
- [ ] 7.5 Replace hard-coded user ID assumptions in watch event creation with `ConnectableUserPicker`

## 8. Food App Integration

- [ ] 8.1 Add `@repo/ui` dependency to `client-food/package.json`
- [ ] 8.2 Add `/people` route to food app (auth-gated)
- [ ] 8.3 Create `PeoplePage.tsx` in food app (same structure as watch)
- [ ] 8.4 Add **People** entry to food `NavBar`
- [ ] 8.5 Use `ConnectableUserPicker` in food event creation invite flow

## 9. Tests

- [ ] 9.1 Add repository unit tests for `normalizeIds` and `isConnected`
- [ ] 9.2 Add API integration tests for invite code lifecycle (create, redeem, expired, double-use)
- [ ] 9.3 Add API integration tests for connection request lifecycle (send, accept, decline, re-request after expiry)
- [ ] 9.4 Add API integration tests for group membership rules (member can add connected user, cannot add unconnected user, non-member blocked)
- [ ] 9.5 Add API integration test for `GET /api/auth/me` `displayName` fallback (null → email prefix)
- [ ] 9.6 Verify existing tests pass after migrations
