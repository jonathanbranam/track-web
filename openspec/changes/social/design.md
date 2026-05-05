## Context

The monorepo has a shared Hono backend and SQLite database. `users`, `groups`, and `group_members` tables already exist in `src/db.ts` but have no behavior spec — they were created ahead of demand. The watch and food changes both reference group invite expansion as a given, but the mechanism has never been designed. This change specifies it.

The backend follows a repository pattern (`src/repositories/sqlite/`) with interfaces in `src/repositories/interfaces.ts`. Routes live in `src/routes/` registered in `src/app.ts`. Shared frontend packages live in `packages/` as npm workspaces (`@repo/auth`, `@repo/ui`).

## Goals / Non-Goals

**Goals:**
- Two-tier visibility model: visible (shared group) vs. connected (explicit trust)
- Invite codes for bootstrapping connections with strangers (out-of-band, 7-day expiry)
- In-app connection requests for users who already share a group (7-day expiry, re-requestable)
- Group management: create, edit, delete; add/remove connected members; any member can alter
- `display_name` on users; `description` on groups
- Shared `@repo/ui` People/Groups UI consumed by watch and food apps
- Admin CLI for full control without authentication

**Non-Goals:**
- Generic user search
- Viewing another user's watchlist or food history
- Notification infrastructure (push, email, SMS)
- Permission tiers within groups
- Social features in the time app

## Decisions

### 1. Two-Tier Visibility: Visible vs. Connected

A user's relationship to others falls into three tiers:

- **Invisible** — no shared group, no connection. The user cannot be found, seen, or contacted.
- **Visible** — share a group membership. Display name is shown in group context. Cannot be invited to events or other groups. Can send or receive an in-app connection request.
- **Connected** — explicit bilateral connection. Can invite to and be invited to events and groups. Either side can revoke.

The key invariant: **group membership creates visibility, not connection.** Joining a large group does not automatically grant invite rights over all members. Each connection is individually established.

**Alternative considered**: Make group membership imply connection. Rejected because adding someone to a large shared group would silently expand everyone's invite reach — a privacy concern at any scale.

### 2. Canonical Connection Storage

`user_connections` stores each connection as a single row with `user_id_a < user_id_b` enforced by a `CHECK` constraint. This prevents duplicate rows (A→B and B→A). The repository layer normalizes `(x, y)` to `(min, max)` before any read or write.

```sql
CREATE TABLE user_connections (
  user_id_a    INTEGER NOT NULL REFERENCES users(id),
  user_id_b    INTEGER NOT NULL REFERENCES users(id),
  connected_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id_a, user_id_b),
  CHECK (user_id_a < user_id_b)
);
```

**Alternative considered**: Two rows per connection (A→B and B→A). Rejected because it doubles write surface, complicates revocation (two deletes), and creates consistency risk.

### 3. Two Distinct Connection Bootstrap Paths

**Invite code** (strangers): User A generates a code, shares it out-of-band. User B redeems it via `POST /api/social/connect`. The code is a cryptographically random token (UUID v4), single-use, expires 7 days after creation. Redemption fails if expired or already used.

**In-app connection request** (group co-members): User A sees User B in a shared group in "locked" style. A sends a request. B receives it in their People tab and can accept or decline. Accept creates the connection. Decline is recorded silently — A never sees the declined status, only "pending." After 7 days the request expires regardless of response, and A may re-request. When a new request is created, stale expired/declined rows for that pair are pruned first.

```sql
CREATE TABLE user_invite_codes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  code               TEXT    NOT NULL UNIQUE,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at         TEXT    NOT NULL,
  used_by_user_id    INTEGER REFERENCES users(id),
  used_at            TEXT
);

CREATE TABLE user_connection_requests (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER NOT NULL REFERENCES users(id),
  to_user_id   INTEGER NOT NULL REFERENCES users(id),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT    NOT NULL,
  responded_at TEXT,
  status       TEXT    NOT NULL DEFAULT 'pending'
               CHECK(status IN ('pending','accepted','declined')),
  CHECK(from_user_id != to_user_id)
);
```

No unique constraint on `user_connection_requests` — active-request uniqueness is enforced at the application layer: before inserting, check for any row with `status = 'pending'` and `expires_at > now()`. Old rows are pruned on re-request.

**Alternative considered**: Unique constraint on `(from_user_id, to_user_id)`. Rejected because it prevents re-request after expiry without a separate cleanup job or partial index hack.

### 4. Decline Privacy

When B declines A's request, `status` is set to `'declined'` in the DB, but the `GET /api/social/connection-requests/sent` endpoint returns all non-accepted, non-expired requests as `'pending'` regardless of actual status. A never learns they were declined; from their view the request is simply open until it expires.

**Alternative considered**: Notify A of the decline. Rejected — for a family app this creates social friction; letting the request silently expire is friendlier.

### 5. Group Rules

Any group member can: add a connected user, remove any member (including themselves), update the group name/description, or delete the group. No owner or admin role for MVP.

Adding a member requires the requester to be connected to the new member. This prevents a group member from adding arbitrary visible users without an established connection.

**Alternative considered**: Only the creator can modify the group. Rejected as too restrictive for informal family groups.

### 6. Database Schema (full)

```sql
-- Additive migrations on existing tables
ALTER TABLE users  ADD COLUMN display_name TEXT;
ALTER TABLE groups ADD COLUMN description  TEXT;

-- New tables
CREATE TABLE user_invite_codes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  code               TEXT    NOT NULL UNIQUE,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at         TEXT    NOT NULL,
  used_by_user_id    INTEGER REFERENCES users(id),
  used_at            TEXT
);

CREATE TABLE user_connections (
  user_id_a    INTEGER NOT NULL REFERENCES users(id),
  user_id_b    INTEGER NOT NULL REFERENCES users(id),
  connected_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id_a, user_id_b),
  CHECK (user_id_a < user_id_b)
);

CREATE TABLE user_connection_requests (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER NOT NULL REFERENCES users(id),
  to_user_id   INTEGER NOT NULL REFERENCES users(id),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT    NOT NULL,
  responded_at TEXT,
  status       TEXT    NOT NULL DEFAULT 'pending'
               CHECK(status IN ('pending','accepted','declined')),
  CHECK(from_user_id != to_user_id)
);

CREATE INDEX idx_connections_a ON user_connections(user_id_a);
CREATE INDEX idx_connections_b ON user_connections(user_id_b);
CREATE INDEX idx_invite_codes_code ON user_invite_codes(code);
CREATE INDEX idx_conn_requests_to ON user_connection_requests(to_user_id, status);
```

### 7. API Routes

All routes under `/api/social/` require authentication via existing session middleware.

**Connections**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/social/connections` | List my connected users (id, email, displayName) |
| DELETE | `/api/social/connections/:userId` | Revoke a connection |

**Invite codes**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/social/invite-codes` | Generate a new single-use invite code |
| GET | `/api/social/invite-codes` | List my codes with status (active/used/expired) |
| DELETE | `/api/social/invite-codes/:id` | Delete an unused code |
| POST | `/api/social/connect` | Redeem a code `{ code }` → create connection |

**Connection requests**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/social/connection-requests` | Send a request `{ toUserId }` (must share a group) |
| GET | `/api/social/connection-requests/pending` | Incoming non-expired pending requests |
| GET | `/api/social/connection-requests/sent` | My sent requests (declined shown as pending) |
| PUT | `/api/social/connection-requests/:id` | Respond `{ action: 'accept' \| 'decline' }` |

**Groups**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/social/groups` | List groups I'm a member of |
| POST | `/api/social/groups` | Create a group `{ name, description?, memberUserIds[] }` |
| GET | `/api/social/groups/:id` | Group detail + members with `connected` flag per member |
| PUT | `/api/social/groups/:id` | Update name or description (any member) |
| POST | `/api/social/groups/:id/members` | Add a member `{ userId }` (must be connected to requester) |
| DELETE | `/api/social/groups/:id/members/:userId` | Remove a member (any member) |
| DELETE | `/api/social/groups/:id` | Delete the group (any member) |

**Connectable users** (used by watch/food invite pickers)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/social/users/connectable` | My connected users — the invite-eligible set |

### 8. Repository Pattern

One new repository:

- `SocialRepository` — all social operations: connections, invite codes, connection requests, group CRUD, group membership, visible/connectable user queries

Interface in `src/repositories/interfaces.ts`; implementation in `src/repositories/sqlite/social.repository.ts`.

Key query: `isConnected(userA, userB)` — normalizes to `(min, max)` and checks `user_connections`. Used by group membership add and event invite validation in watch/food.

### 9. Shared UI Package (`@repo/ui`)

`packages/ui` (`@repo/ui`) exists as an empty workspace. Social UI components are added under `packages/ui/src/social/`:

- **`PeopleTab`** — three sections: incoming pending requests (accept/decline buttons), connected users (with revoke), visible-not-connected group co-members (locked style + "Request Connection" action)
- **`GroupList`** — list of groups I'm in; "Create Group" entry point
- **`GroupEditor`** — create/edit group name and description; member list with add (connected users picker) and remove controls; any group member shown with connection status badge
- **`InviteCodePanel`** — generate a new code (displays the token for copying); list of my codes with status badges; delete unused codes
- **`RedeemInviteCode`** — text input + submit for redeeming a code
- **`ConnectableUserPicker`** — multi-select component returning `userId[]`; used by watch/food event creation and group member add flows; only shows connected users

Components call `/api/social/` endpoints directly using the same fetch wrapper pattern as other client packages.

The consuming apps (watch, food) add a **People** nav tab that renders `PeopleTab`, `GroupList`, and `InviteCodePanel`/`RedeemInviteCode` in a tabbed layout.

### 10. Admin CLI (`scripts/admin.ts`)

New script, no authentication required. Registered as `npm run admin`. Subcommand structure:

```
npm run admin -- users:list
npm run admin -- users:set-name <userId> "<display name>"
npm run admin -- connections:create <userIdA> <userIdB>
npm run admin -- connections:delete <userIdA> <userIdB>
npm run admin -- connections:list <userId>
npm run admin -- codes:create <userId>
npm run admin -- groups:create --name "<name>" [--description "<desc>"] [--members 1,2,3]
npm run admin -- groups:list
npm run admin -- groups:add-member <groupId> <userId>
npm run admin -- groups:remove-member <groupId> <userId>
npm run admin -- groups:delete <groupId>
```

Uses `better-sqlite3` directly (same pattern as `scripts/create-user.ts`). No HTTP, no session.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| `user_id_a < user_id_b` constraint breaks if the repository layer fails to normalize | Repository helper `normalizeIds(a, b)` is the single place this logic lives; all connection reads/writes go through it |
| Expired invite codes or requests accumulate as dead rows | Rows are small; prune stale connection-request rows on new request creation; invite codes can be listed and deleted by the user |
| Any group member can delete the group | Acceptable for family-scale use; can add owner-only delete later if needed |
| `GET /api/social/users/connectable` is called by watch/food event creation — coupling between apps | The endpoint is intentionally simple (returns user id + name); watch/food treat it as a dependency, not a shared table join |
| `display_name` is nullable — UI must handle fallback to email username | Defined fallback: split email on `@`, take the first segment |

## Open Questions

None — all decisions resolved during exploration.
