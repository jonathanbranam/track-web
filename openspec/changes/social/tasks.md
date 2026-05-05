## 1. Database Migrations

- [x] 1.1 Add `display_name TEXT` column to `users` in `src/db.ts` (additive migration with `ALTER TABLE IF NOT EXISTS` guard)
- [x] 1.2 Add `description TEXT` column to `groups` in `src/db.ts` (additive migration with `ALTER TABLE IF NOT EXISTS` guard)
- [x] 1.3 Add `user_invite_codes` table to `src/db.ts`
- [x] 1.4 Add `user_connections` table with `CHECK (user_id_a < user_id_b)` to `src/db.ts`
- [x] 1.5 Add `user_connection_requests` table to `src/db.ts`
- [x] 1.6 Add indexes: `idx_connections_a`, `idx_connections_b`, `idx_invite_codes_code`, `idx_conn_requests_to`

## 2. Repository

- [x] 2.1 Define `SocialRepository` interface in `src/repositories/interfaces.ts` (connections, invite codes, connection requests, groups, connectable users query)
- [x] 2.2 Implement `normalizeIds(a, b)` helper in `src/repositories/sqlite/social.repository.ts` ensuring `user_id_a < user_id_b`
- [x] 2.3 Implement connection read/write/delete methods (`getConnections`, `isConnected`, `createConnection`, `deleteConnection`)
- [x] 2.4 Implement invite code methods (`createInviteCode`, `listInviteCodes`, `getInviteCodeByToken`, `markCodeUsed`, `deleteInviteCode`)
- [x] 2.5 Implement connection request methods (`createRequest`, `getActiveRequest`, `pruneStaleRequests`, `getPendingIncoming`, `getSentRequests`, `respondToRequest`)
- [x] 2.6 Implement group methods (`createGroup`, `getGroup`, `listGroupsForUser`, `updateGroup`, `deleteGroup`)
- [x] 2.7 Implement group membership methods (`addMember`, `removeMember`, `isMember`, `getMembersWithConnectionStatus`)
- [x] 2.8 Implement `getConnectableUsers(userId)` — returns connected users for invite pickers
- [x] 2.9 Implement `getVisibleCoMembers(userId)` — returns group co-members not connected (for PeopleTab locked section)

## 3. API Routes

- [x] 3.1 Create `src/routes/social.ts` and register it under `/api/social/` in `src/app.ts`
- [x] 3.2 Implement `GET /api/social/connections` and `DELETE /api/social/connections/:userId`
- [x] 3.3 Implement `POST /api/social/invite-codes`, `GET /api/social/invite-codes`, `DELETE /api/social/invite-codes/:id`
- [x] 3.4 Implement `POST /api/social/connect` (redeem invite code — validates expiry, single-use, not own code)
- [x] 3.5 Implement `POST /api/social/connection-requests` (validates shared group, no existing active request, not already connected)
- [x] 3.6 Implement `GET /api/social/connection-requests/pending` and `GET /api/social/connection-requests/sent` (decline masked as pending in sent)
- [x] 3.7 Implement `PUT /api/social/connection-requests/:id` (accept creates connection; decline records silently; validates request belongs to caller)
- [x] 3.8 Implement `GET /api/social/groups`, `POST /api/social/groups`, `GET /api/social/groups/:id`, `PUT /api/social/groups/:id`, `DELETE /api/social/groups/:id`
- [x] 3.9 Implement `POST /api/social/groups/:id/members` (validates requester is member and is connected to new member) and `DELETE /api/social/groups/:id/members/:userId`
- [x] 3.10 Implement `GET /api/social/users/connectable`

## 4. Auth Me Update

- [x] 4.1 Update `GET /api/auth/me` handler to include `displayName` in response (use `display_name` if set, else email prefix before `@`)
- [x] 4.2 Update `useAuth` in `packages/auth/src/useAuth.tsx` to expose `displayName` alongside `userId`
- [x] 4.3 Update `scripts/create-user.ts` to accept optional `--name "<display name>"` flag and insert into `users.display_name`

## 5. Admin CLI

- [x] 5.1 Create `scripts/admin.ts` with subcommand dispatch; add `"admin": "tsx scripts/admin.ts"` to `package.json` scripts
- [x] 5.2 Implement `users:list` and `users:set-name <userId> "<name>"`
- [x] 5.3 Implement `connections:create <a> <b>`, `connections:delete <a> <b>`, `connections:list <userId>`
- [x] 5.4 Implement `codes:create <userId>`
- [x] 5.5 Implement `groups:create`, `groups:list`, `groups:add-member`, `groups:remove-member`, `groups:delete`
- [x] 5.6 Implement unknown-subcommand usage output and non-zero exit

## 6. Shared UI Package (`@repo/ui`)

- [x] 6.1 Set up `packages/ui/src/social/index.ts` barrel export; verify Vite resolves `@repo/ui` without a pre-build step
- [x] 6.2 Implement `ConnectableUserPicker` component (calls `GET /api/social/users/connectable`, emits `userId[]` via `onChange`)
- [x] 6.3 Implement `InviteCodePanel` (generate code, list with status badges, delete unused)
- [x] 6.4 Implement `RedeemInviteCode` (text input, submit, success/error feedback)
- [x] 6.5 Implement `PeopleTab` (pending requests section, connected users section, visible co-members locked section)
- [x] 6.6 Implement `GroupList` (fetch and render user's groups, "Create Group" entry point)
- [x] 6.7 Implement `GroupEditor` (create/edit name+description; member list with connection badges; add-member via `ConnectableUserPicker`; remove member)

## 7. Watch App Integration

- [x] 7.1 Add `@repo/ui` dependency to `client-watch/package.json` (applied to `client-movies/package.json`)
- [x] 7.2 Add `/people` route to `client-watch/src/App.tsx` (applied to `client-movies/src/App.tsx`, auth-gated)
- [x] 7.3 Create `client-watch/src/pages/PeoplePage.tsx` rendering `PeopleTab`, `GroupList`, `GroupEditor`, `InviteCodePanel`, `RedeemInviteCode` in tabbed layout (applied to `client-movies`)
- [x] 7.4 Add **People** entry to watch `NavBar` (added inline NavBar to `client-movies`)
- [x] 7.5 Replace hard-coded user ID assumptions in watch event creation with `ConnectableUserPicker` (N/A — no event creation UI exists in client-movies yet)

## 8. Food App Integration

- [ ] 8.1 Add `@repo/ui` dependency to `client-food/package.json` (BLOCKED: client-food does not exist yet)
- [ ] 8.2 Add `/people` route to food app (auth-gated) (BLOCKED: client-food does not exist yet)
- [ ] 8.3 Create `PeoplePage.tsx` in food app (same structure as watch) (BLOCKED: client-food does not exist yet)
- [ ] 8.4 Add **People** entry to food `NavBar` (BLOCKED: client-food does not exist yet)
- [ ] 8.5 Use `ConnectableUserPicker` in food event creation invite flow (BLOCKED: client-food does not exist yet)

## 9. Tests

- [x] 9.1 Add repository unit tests for `normalizeIds` and `isConnected`
- [x] 9.2 Add API integration tests for invite code lifecycle (create, redeem, expired, double-use)
- [x] 9.3 Add API integration tests for connection request lifecycle (send, accept, decline, re-request after expiry)
- [x] 9.4 Add API integration tests for group membership rules (member can add connected user, cannot add unconnected user, non-member blocked)
- [x] 9.5 Add API integration test for `GET /api/auth/me` `displayName` fallback (null → email prefix)
- [x] 9.6 Verify existing tests pass after migrations
