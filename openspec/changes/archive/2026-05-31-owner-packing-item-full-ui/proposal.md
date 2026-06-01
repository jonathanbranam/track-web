## Why

The owner manages the packing list but currently has no UI to add or delete items from shared sections or from other members' FYP groups — those operations require the API or CLI. Since the owner is responsible for curating the full list, they should have the same add/delete controls everywhere that members have for their own items.

## What Changes

- Each shared section gains an inline add input (owner only) so the owner can append items to any existing section
- Each shared item gains a trash icon (owner only) with inline Cancel / Delete confirmation
- All members' FYP groups gain add input and trash icons for the owner — the previously read-only restriction on other members' FYP groups is lifted for the owner
- The owner's add input for a member's FYP group creates a personal item with `userId` set to that member's id
- `api.createPackingItem` gains a `section` parameter (currently omitted, defaulting to `''`) so the owner can create items scoped to a named shared section
- No backend changes required — owner permissions for create/delete any item are already enforced

## Capabilities

### New Capabilities

None — no new capabilities are introduced.

### Modified Capabilities

- `packing-items`: Owner now has full add/delete UI for shared sections and for all members' FYP groups. The previous constraint that the owner's view of other members' FYP groups is read-only is removed for the owner. The `createPackingItem` API client method gains a `section` parameter.

## Impact

- `client-trips/src/api.ts` — add `section?: string` parameter to `createPackingItem`
- `client-trips/src/pages/PackingPage.tsx` — add per-section add-item state; add trash icons to all shared items; add add input and trash icons to all FYP groups (owner only)
