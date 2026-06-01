## Why

The current packing list is a single shared list managed only by the trip owner, but individual members may need to track personal items (toiletries, medications, gear) that are unique to them and not relevant to the group. Allowing members to create and manage their own personal packing items alongside the shared list gives everyone a complete packing experience in one place.

## What Changes

- `packing_items` gets an optional `user_id` column. Rows with `user_id = NULL` are shared items (visible to all members); rows with a `user_id` are personal items (visible only to that user and the owner).
- Any authenticated trip member can create and delete their own personal packing items via the API — no UI affordance is added in this change.
- The trip owner retains exclusive rights to shared items (existing behavior unchanged).
- `GET /api/trips/:id/packing/items` returns shared items plus the requesting user's personal items.
- The `PackingItem` type gains an optional `userId` field.
- The `PackingPage` renders personal items in a **"FYP"** section after the shared sections.
- The owner view shows each member's personal items alongside shared items in the summary.

## Capabilities

### New Capabilities

_(none — this change extends an existing capability rather than introducing a new one)_

### Modified Capabilities

- `packing-items`: The data model gains a nullable `user_id` column. Any member can create and delete their own personal items via the API; update remains owner-only. List returns personal items scoped to the requesting user alongside shared items. The `PackingItem` type and repository interface are updated accordingly.

## Impact

- **Database**: `packing_items` migration to add `user_id INTEGER REFERENCES users(id) ON DELETE CASCADE` (nullable).
- **Repository**: `IPackingItemRepository.listByTrip` signature changes to accept `userId` so it can include personal items; `create` accepts optional `userId`.
- **Routes**: `POST /api/trips/:id/packing/items` — members can create (always stored as personal to themselves); owner can create shared or personal for any user. `DELETE` — members can delete their own personal items; owner can delete any. `PUT` remains owner-only.
- **Client**: `PackingPage` — renders a "FYP" section for the current user's personal items; owner sees per-member "FYP – [member]" sections.
- **CLI**: Admin packing commands gain optional `--user` flag to scope create/list to a specific user.
