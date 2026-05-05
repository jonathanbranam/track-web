## Why

The watch and food apps need to coordinate group events — inviting people, collecting RSVPs, and voting — but the app has no way to model who knows whom or surface other users safely. This change introduces the social layer: connections, invite codes, and groups, with a privacy model that prevents unwanted discovery while enabling family-scale coordination.

## What Changes

- `users` table gains a `display_name` column (optional; UI falls back to email username prefix)
- `groups` table gains a `description` column
- New **connection** model: bilateral, explicit trust between two users; required before either can invite the other to an event or group
- New **invite code** flow: single-use, 7-day-expiry tokens shared out-of-band to bootstrap connections between users with no prior shared context
- New **connection request** flow: in-app requests between users who share a group but are not yet connected; 7-day expiry; re-requestable after expiry
- New **group management** API and UI: any authenticated user can create a group; any group member can add/remove members (connected users only) or update group metadata; no permission tiers for MVP
- New **People tab** in `@repo/ui` (shared package): manages connections, pending requests, invite codes, and groups; used by both the watch and food apps
- New **admin CLI** (`scripts/admin.ts`): full control over users, connections, and groups without authentication, for the self-hosted admin

## Capabilities

### New Capabilities

- `social-connections`: User connection model — `user_connections` table, invite code lifecycle (`user_invite_codes`), in-app connection requests (`user_connection_requests`), two-tier visibility (visible vs. connected), connection revocation
- `social-groups`: Group management — create/edit/delete groups, add/remove connected members, group detail with per-member connection status
- `social-ui`: Shared `@repo/ui` components — `PeopleTab`, `GroupList`, `GroupEditor`, `InviteCodePanel`, `RedeemInviteCode`, `ConnectableUserPicker`
- `social-admin-cli`: Admin CLI tool (`scripts/admin.ts`) for managing users, connections, and groups without authentication

### Modified Capabilities

- `user-auth`: `users` table gains `display_name TEXT` (nullable); `GET /api/auth/me` response includes `displayName`

## Impact

- `src/db.ts` — additive migrations: `users.display_name`, `groups.description`, new tables `user_invite_codes`, `user_connections`, `user_connection_requests`
- `src/routes/social.ts` — new route file registered under `/api/social/` in `app.ts`
- `src/repositories/sqlite/social.repository.ts` — new repository; interface added to `repositories/interfaces.ts`
- `packages/ui/src/` — new social UI components exported from `@repo/ui`; consumed by `client-watch` and `client-food`
- `scripts/admin.ts` — new CLI tool; `package.json` gains `admin` script
- `watch` and `food` changes depend on this change landing first; their group-invite-expansion logic requires `user_connections` and the visible-user model to exist
- `time` app is unaffected — social features do not apply to time tracking
