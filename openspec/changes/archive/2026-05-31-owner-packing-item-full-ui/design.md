## Context

The trips app's PackingPage currently restricts the owner's UI-based add/delete to only their own FYP group; shared sections and other members' FYP groups are read-only in the UI. The previous `packing-member-add-remove` change surfaced add/delete for members on their own FYP items. This change extends the owner's UI to cover everything: shared sections (full add/delete) and all members' FYP groups (full add/delete). The backend already enforces owner permissions for create and delete on all items — no backend changes required.

The key new complexity over `packing-member-add-remove` is that multiple independent add inputs must coexist: one per shared section plus one per FYP group.

## Goals / Non-Goals

**Goals:**
- Owner can add items to any shared section from the UI
- Owner can delete any shared item from the UI
- Owner can add personal items to any member's FYP group from the UI
- Owner can delete any item from any member's FYP group from the UI
- `api.createPackingItem` gains a `section` parameter so shared-section items are created with the correct section

**Non-Goals:**
- Editing or renaming existing items (add/delete only)
- Specifying position for newly added items (position defaults to 0; backend ordering by `section ASC, position ASC` places new items first within the section)
- Any backend changes
- Member ability to manage shared sections or other members' FYP groups

## Decisions

**1. Per-section add-input state via a single `Record<string, string>` keyed by section identity**

Each section that has an add input needs its own controlled text value. Rather than lifting individual `useState` calls per section, a single `Record<string, string>` (e.g., `addInputs`) keyed by a composite key suffices: `shared:<sectionName>` for shared sections, `personal:<userId>` for FYP groups. This keeps the state shape simple and avoids a proliferation of state variables as the number of sections grows.

Alternatives considered: a separate `useState` per section (doesn't scale, breaks with dynamic section lists); a single shared input with an "active section" pointer (confusing UX — user types in one section, scrolls elsewhere, and the input is no longer visually tied to where they started).

**2. `AddItemInput` component receives a section-specific handler (no shared `handleAddItem`)**

The existing `handleAddItem` callback is replaced by an inline handler or a factory function `makeAddHandler(section, userId?)` that closes over the correct `section` (for shared items) or `userId` (for FYP items). This keeps the `AddItemInput` component unchanged and moves the variation to call-site.

**3. Extend `createPackingItem` in `api.ts` to accept `section?: string`**

The backend `POST /api/trips/:id/packing/items` already accepts `section`. The client method currently omits it, defaulting the column to `''`. Adding `section?: string` (default `''`) to the method signature is backward-compatible — existing callers (member FYP add) pass no section and continue to work unchanged.

**4. Inherit inline-confirmation delete pattern from `packing-member-add-remove`**

The `ItemRow` component already supports an optional `onDelete` prop that renders the trash icon and inline Cancel / Delete confirmation. Owner shared-section rows and owner-view personal rows simply receive `onDelete` where they previously received none. No changes to `ItemRow` are needed.

**5. Optimistic deletion consistent with existing pattern**

Same as `packing-member-add-remove`: item removed immediately from local state, restored on API error.

## Risks / Trade-offs

- **New items appear at top of section (position 0)**: Owner-added items will sort before existing items within the same section since position defaults to 0. This is visible immediately but is acceptable — reordering is a future concern.
- **Per-section input state on re-render**: If the items list refreshes (e.g., after an add), the `addInputs` state is preserved since it is separate from the items list. No risk of clearing mid-type.
- **Owner accidentally adding to wrong FYP group**: With multiple add inputs on screen, the owner could add to the wrong member's FYP. Mitigation: section headings clearly label each group, and items can be deleted immediately.
- **Race on fast double-tap delete**: Same risk as `packing-member-add-remove`. Mitigated by optimistic removal — the row disappears after the first tap so the second can't fire.
