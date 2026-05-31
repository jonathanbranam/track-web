## 1. Database Migration

- [ ] 1.1 Add `trip_members` table to `src/db.ts` with columns: `id`, `trip_id` (FK ON DELETE CASCADE), `user_id`, `role` (default `'owner'`), `joined_at`; unique constraint on `(trip_id, user_id)`
- [ ] 1.2 Add backfill `INSERT OR IGNORE INTO trip_members ... SELECT id, user_id, 'owner', created_at FROM trips` in the same transaction as the `CREATE TABLE`
- [ ] 1.3 Add `trip_members` to `TABLE_NAMES` in `src/db.ts`

## 2. Repository Interface

- [ ] 2.1 Add `isMember(tripId: number, userId: number): boolean` to `ITripRepository` in `src/repositories/interfaces.ts`
- [ ] 2.2 Add `getMemberRole(tripId: number, userId: number): string | null` to `ITripRepository`
- [ ] 2.3 Add `listMembers(tripId: number): TripMember[]` to `ITripRepository` (define `TripMember` type: `{ userId, role, joinedAt }`)
- [ ] 2.4 Add `addMember(tripId: number, userId: number, role?: string): TripMember` to `ITripRepository`
- [ ] 2.5 Add `removeMember(tripId: number, userId: number): boolean` to `ITripRepository`

## 3. Repository Implementation

- [ ] 3.1 Update `SqliteTripRepository.create()` to auto-insert owner row in `trip_members` within a transaction
- [ ] 3.2 Update `SqliteTripRepository.list(userId)` to JOIN `trip_members` instead of filtering on `trips.user_id`
- [ ] 3.3 Update `SqliteTripRepository.findCurrent(userId)` to JOIN `trip_members` instead of filtering on `trips.user_id`
- [ ] 3.4 Implement `isMember`, `getMemberRole`, `listMembers`, `addMember`, `removeMember` in `SqliteTripRepository`

## 4. Route Authorization

- [ ] 4.1 Add `requireTripMember` helper in `src/routes/trips.ts` that calls `isMember` and returns 403 if not a member; apply to all existing `/api/trips/:id` routes
- [ ] 4.2 Add `requireTripOwner` helper that additionally checks `getMemberRole === 'owner'`; apply to `PUT /api/trips/:id`, `DELETE /api/trips/:id`, and `PUT /api/trips/:id/set-current`
- [ ] 4.3 Update "not found" handling on mutation routes: membership/ownership failures return 403; truly non-existent trips return 404

## 5. Member Management Routes

- [ ] 5.1 Add `GET /api/trips/:id/members` → `{ members: TripMember[] }`; requires membership
- [ ] 5.2 Add `POST /api/trips/:id/members` body `{ userId }` → 201 with new member row; requires owner role; validate user exists; return 409 on duplicate, 404 on unknown userId
- [ ] 5.3 Add `DELETE /api/trips/:id/members/:userId` → 204; requires owner role; return 400 if owner removes self, 404 if userId not a member

## 6. Admin CLI

- [ ] 6.1 Add `trips:members:list <tripId>` command to `scripts/admin.ts` with `--json` flag
- [ ] 6.2 Add `trips:members:add <tripId> <userId>` command
- [ ] 6.3 Add `trips:members:remove <tripId> <userId>` command
- [ ] 6.4 Update `README.md` with the three new CLI commands

## 7. Documentation

- [ ] 7.1 Update `openapi.yaml` with new `/api/trips/:id/members` routes (GET, POST, DELETE) and updated authorization notes on existing trip routes
- [ ] 7.2 Update `llm-context.md` to reflect membership-based access model replacing `trips.user_id` ownership

## 8. Build Verification

- [ ] 8.1 Run `npm run build:server` and confirm zero TypeScript errors
