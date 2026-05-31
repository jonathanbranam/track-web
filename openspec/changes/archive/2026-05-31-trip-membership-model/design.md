## Context

The trips app currently scopes all data to `trips.user_id`: `GET /api/trips` and `GET /api/trips/current` filter on `trips.user_id = :userId`, and mutation routes check ownership the same way. There is no mechanism to grant another user access to a trip.

This change adds a `trip_members` table and shifts authorization from `trips.user_id` ownership to membership. It is done as a standalone phase — before any family members are added to the system — so the breaking access-semantics change lands once and cleanly.

## Goals / Non-Goals

**Goals:**
- Allow multiple users to read a trip and its future sub-resources (days, info, packing)
- Preserve a simple owner/member role split: owner can write, member can read
- Provide member management via CLI/API with no in-app UI

**Non-Goals:**
- In-app member management UI
- Self-serve join or invite flow
- Role granularity beyond `owner` | `member` (no per-tab permissions)
- Changes to the frontend (membership is transparent to the existing UI)

## Decisions

### 1. Separate `trip_members` table, not a denormalized column

A separate table is the only practical choice once membership is 1-to-many. It supports multiple members per trip, tracks role and join date, and can be extended without touching `trips`.

**Alternative considered**: A comma-separated `shared_with` column on `trips`. Rejected — no per-member metadata, no FK integrity, harder to query.

### 2. Role model: `owner` | `member`

Two roles cover all present requirements. `owner` has full read/write access and manages members. `member` has read-only access (plus future packing-state toggles). The owner is also the developer; all management is via API.

**Alternative considered**: Single role with an `is_owner` flag on `trips`. Rejected — role belongs on `trip_members` so it is per-membership, not per-trip.

### 3. Authorization at Hono route level, not in the repository

Routes call `isMember(tripId, userId)` and `getMemberRole(tripId, userId)` (methods added to `ITripRepository`) and return 403 before reaching any data-layer call. Repositories stay focused on data access with no auth logic.

**Alternative considered**: Add userId membership checks inside repository methods. Rejected — mixes concerns, makes repositories harder to test and reuse in CLI scripts.

### 4. Backfill runs inside the same migration transaction

The migration that creates `trip_members` immediately backfills all existing trips with an `owner` row derived from `trips.user_id` and `trips.created_at`. Both statements run in a single `db.transaction()` call — if the backfill fails, the table is not created either.

After migration succeeds, all existing trips are accessible to their original owners with no manual intervention.

### 5. Member management methods on `ITripRepository` (not a separate interface)

`trip_members` is tightly coupled to trips (cascade-deleted with the trip, auto-inserted on create). Keeping member methods on `ITripRepository` avoids an extra interface and extra DI wiring for what is essentially a join table. If membership grows complex later (invitations, per-tab roles), split it then.

## Risks / Trade-offs

- **Existing trips inaccessible if backfill fails** → Mitigated: backfill runs in the same SQLite transaction as table creation; failure rolls back both.
- **`trips.user_id` column stays but is no longer authoritative** → Minor confusion risk in future. The column remains correct for all existing rows and serves as provenance. No action needed.
- **No rollback path** → Migration is additive (new table + new rows). Rolling back requires dropping `trip_members` and reverting route logic. Acceptable for a self-hosted single-user-initially system.

## Migration Plan

1. Deploy updated backend. On startup the `db.ts` migration runs:
   - `CREATE TABLE IF NOT EXISTS trip_members (...)`
   - `INSERT OR IGNORE INTO trip_members (trip_id, user_id, role, joined_at) SELECT id, user_id, 'owner', created_at FROM trips`
2. Smoke test: `trips:members:list <id>` on an existing trip — expect one row with `role: owner`.
3. No frontend changes required; the app always sees only the current user's trips.
