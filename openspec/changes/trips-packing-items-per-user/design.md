## Context

Packing items are currently a shared, owner-managed list. All members see the same items. The trips app supports multiple users (trip members) who may have personal items (e.g., medications, personal gear) that don't belong on the shared list.

Any trip member can create and delete their own personal packing items via the API. The owner can create/delete any item (shared or personal for any user). There is no UI affordance for member item management in this change — members use the API directly. Members read and check/uncheck items through the app as before.

## Goals / Non-Goals

**Goals:**
- Add a `user_id` column to `packing_items` to scope items to a specific member or leave them shared (NULL)
- Any trip member can create and delete their own personal items via the API (no UI affordance in this change)
- Owner can create/delete any item (shared or personal for any user) and can specify `userId` when creating via API and CLI
- `GET /api/trips/:id/packing/items` returns shared items + the requesting user's personal items
- `PackingPage` renders personal items in a section labeled **"FYP"** (separate from shared sections)
- Owner (`user_id 1`) can see all items (shared + all members' personal items) — needed for summary view

**Non-Goals:**
- Members cannot edit (update) packing items — update remains owner-only
- No member-facing UI for creating or deleting personal items in this change
- No per-user bulk-replace endpoint

## Decisions

### D1: Nullable `user_id` column on `packing_items`

Add `user_id INTEGER REFERENCES users(id) ON DELETE CASCADE` (nullable) to `packing_items`. NULL = shared (visible to all members); non-null = personal (visible to owner + that user only).

**Alternative considered**: separate `personal_packing_items` table. Rejected — would duplicate the entire items schema and split repository logic. A single table with a nullable discriminator is simpler and lets existing list/section/position logic work unchanged for personal items.

### D2: Scoped list endpoint

`GET /api/trips/:id/packing/items` returns:
- If requester is owner: all items for the trip (shared + all personal)
- If requester is a regular member: shared items (`user_id IS NULL`) + their own personal items (`user_id = requester.id`)

This avoids a separate endpoint and keeps the client logic simple.

### D3: Member self-service create/update/delete; owner manages all

`POST /api/trips/:id/packing/items`: any trip member may call this endpoint. Non-owners always create personal items (stored with `user_id = requester.id` regardless of request body); they cannot create shared items or items for other users. The owner may pass an optional `userId` to create a personal item for any user, or omit it to create a shared item.

`DELETE /api/trips/:id/packing/items/:itemId`: members may delete their own personal items (`user_id = requester.id`); the owner may delete any item. Attempts to delete shared items or another member's personal items return 403.

`PUT /api/trips/:id/packing/items/:itemId`: members may update `section`, `text`, and `position` on their own personal items (`user_id = requester.id`). Members cannot update shared items or another member's personal items (403). The owner may update any item; only the owner may set or clear the `userId` field to reassign or promote/demote an item.

### D4: "FYP" section label in client

Personal items are rendered in a section labeled **"FYP"** above or below the shared sections (implementation choice: render after shared sections). The section only appears when the user has personal items. Owner sees a "FYP – [member name]" section per member who has personal items.

### D5: packing_state cascade still correct

`packing_state` already cascades on `packing_items(id)` delete. No changes needed — personal items participate in state/check-off the same as shared items.

## Risks / Trade-offs

- **Owner seeing all items changes list response shape**: The owner's list now includes other members' personal items. The owner uses this to see the full picture (already does via summary). Low risk.
- **Migrating existing data**: Existing rows get `user_id = NULL` (shared) — correct default, no data migration needed. SQLite `ALTER TABLE ADD COLUMN` with default handles this.
- **Position ordering across personal/shared**: Personal items have their own `section`/`position` values. FYP section sorts by position within it, independent of shared sections. No conflict.

## Migration Plan

1. Add `user_id INTEGER REFERENCES users(id) ON DELETE CASCADE` to `packing_items` via inline migration in `db.ts` (existing rows default to NULL — shared).
2. Deploy server; existing items unaffected.
3. Deploy client; FYP section only renders when personal items exist (no visual change for existing trips without personal items).

Rollback: revert migration is not needed — NULL rows stay valid even on old code. Client FYP section simply won't render on old client.

## Resolved Questions

- **FYP section placement**: Renders after shared sections.
- **Admin CLI list scope**: Shows all items (shared and personal) by default — no flag needed; it's an admin command.
