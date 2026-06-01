## Context

The trips app's PackingPage currently renders all packing items read-only. Members can check items off but cannot add or remove their own personal (FYP) items through the UI — they must contact the trip owner to do it via the admin CLI. The backend already fully supports member create and delete for personal items (`POST /api/trips/:id/packing/items` and `DELETE /api/trips/:id/packing/items/:itemId`). No backend changes are required; this is a pure frontend change.

## Goals / Non-Goals

**Goals:**
- Any trip member (including the owner) can add personal items to their own FYP section from the UI
- Any trip member can delete their own personal items from the UI
- Delete requires an inline confirmation step before the item is removed
- The owner's elevated view of other members' FYP groups remains read-only in the UI

**Non-Goals:**
- Editing or renaming existing personal items
- Managing other members' items from the owner UI
- Specifying a section for member-added items (items are added sectionless, appearing in the flat FYP list)
- Any backend changes

## Decisions

**1. Inline confirmation over modal/dialog**

Tapping the trash icon transitions the row into a "pending delete" state showing Cancel and Delete buttons inline. This avoids a modal overlay on mobile, keeps focus in place, and matches the optimistic-toggle pattern already used for checkboxes.

Alternatives considered: `window.confirm()` (jarring native dialog, no styling control), a bottom sheet (heavier, overkill for a single action).

**2. Extend `ItemRow` with optional delete affordance rather than a new component**

`ItemRow` gains two optional props: `onDelete` and `isDeleting` (local state owned by the section). When `onDelete` is provided, the trash icon is rendered. This avoids component duplication while keeping the shared-item rows completely unchanged.

**3. Add input lives at the bottom of the current user's FYP group**

A text input + Add button is always visible at the bottom of the FYP section. It is not hidden behind a FAB or "+" button — the FYP section is the natural scope, and the input is always ready.

**4. Optimistic deletion (remove immediately, restore on error)**

Consistent with the existing optimistic toggle pattern. The item is removed from local state immediately; if the DELETE request fails, the item is restored.

## Risks / Trade-offs

- **Stale confirm state**: If a user taps the trash icon and then navigates away and back, the confirmation row resets (it's local React state). This is acceptable — confirmation state should not persist across navigation.
- **Race condition on fast double-tap**: Tapping delete twice quickly before the first request completes could send two DELETE requests. Mitigated by disabling the Delete button while the request is in-flight (or relying on the optimistic removal meaning the row is gone after the first tap).
