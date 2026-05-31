## Context

The `packing_items` table and `PackingPage` were added in Spec 6. The page currently renders items grouped by section as a static read-only list with unchecked checkbox icons — no user interaction. This change adds the state layer: a `packing_state` table keyed on `(packing_item_id, user_id)` that tracks whether each family member has checked off each item, and makes the PackingPage interactive.

## Goals / Non-Goals

**Goals:**
- Each user can independently check/uncheck their own packing items
- State persists across sessions and devices
- Owner (user_id 1) sees a per-member completion summary
- State survives item renames; state is cleaned up when items are deleted

**Non-Goals:**
- Shared/group state (one check affects all users) — individual tracking is the stated design
- Conflict resolution beyond last-write-wins
- Undo / history of check actions
- In-app edit or delete of packing items (API/CLI only)

## Decisions

### Separate `packing_state` table vs. inline per-user state

State is stored in a normalized `packing_state` table (`packing_item_id, user_id, checked`) rather than embedding it as a JSON column or denormalized fields on `packing_items`. This keeps the item definition separate from user-specific state, enables efficient per-user queries, and lets `ON DELETE CASCADE` on `packing_item_id` automatically clean up orphaned state when an item is deleted via API.

### State representation: sparse (checked rows only)

The `packing_state` table stores only explicit `checked=1` rows rather than a row for every `(item, user)` pair. Absence means unchecked. This keeps the table small and avoids bulk inserts when items are created. The API's `GET /packing/state` returns `Record<itemId, boolean>` — items not present in the response are implicitly `false`.

**Alternative considered:** Upsert a row for every item on first page load to make the state complete. Rejected — adds write overhead on reads and gains no correctness benefit since the client can treat missing keys as unchecked.

### Optimistic toggle in the UI

The frontend toggles the local state immediately on tap, then fires `PUT /packing/state`. On error, it reverts the local toggle. This eliminates visible latency for a fast local network (the common case) while maintaining correctness on failure.

**Alternative considered:** Wait for server confirmation before updating UI. Rejected — it creates a noticeable lag on every tap for a family-facing app, hurting the feel of a checklist.

### Owner summary: server-side SQL aggregation

`GET /packing/summary` runs a single aggregated SQL query joining `packing_items`, `packing_state`, and `trip_members` to return `checked/total` per member. The client displays these without further computation.

**Alternative considered:** Client fetches raw state for all users and aggregates. Rejected — it would expose other users' individual item state to non-owners, which is unnecessary data exposure.

### State fetch strategy: parallel with items

On mount, `PackingPage` fetches `/packing/items` and `/packing/state` in parallel via `Promise.all`. The state map is merged into the item list before first render. The summary (`/packing/summary`) is fetched only for owner (user_id 1) and is a third parallel request.

### Admin CLI commands

All three state routes will have corresponding CLI commands (`packing state get`, `packing state set`, `packing summary`) with `--json` output for scripting.

## Risks / Trade-offs

- **Stale state after bulk-replace**: `bulkReplace` deletes all existing items and inserts new ones with new IDs. Any `packing_state` rows cascade-delete with the old items — users lose their checked state. This is acceptable per the design doc ("packing_state rows for deleted item IDs cascade automatically") and is a known trade-off of the bulk-replace approach.
  → Mitigation: document in CLI help that `bulk-replace` resets all checked state.

- **Optimistic revert jarring on slow connections**: If the server call fails after a user taps, the checkbox visibly snaps back.
  → Mitigation: on error, show a brief toast or error indicator so the user understands why.

- **Summary only for user_id 1**: The summary route hard-codes owner identity as `user_id = 1`. This couples the feature to the current single-admin model.
  → Acceptable for now given the "API is the admin interface" design principle; can be generalized to role-based in a future spec.
