## 1. API client

- [x] 1.1 Add `createPackingItem(tripId: number, text: string)` to `client-trips/src/api.ts` — POST with `{ text, section: '', position: 0 }`
- [x] 1.2 Add `deletePackingItem(tripId: number, itemId: number)` to `client-trips/src/api.ts` — DELETE, returns void

## 2. ItemRow component

- [x] 2.1 Add optional `onDelete?: () => void` prop to `ItemRow` in `PackingPage.tsx`
- [x] 2.2 When `onDelete` is provided, render a trash icon button on the right side of the row
- [x] 2.3 Add local `pendingDelete` state to `ItemRow`; tapping trash sets it true, showing inline Cancel and Delete buttons
- [x] 2.4 Cancel button resets `pendingDelete` to false
- [x] 2.5 Delete button calls `onDelete` and resets `pendingDelete` to false

## 3. FYP section — delete wiring

- [x] 3.1 In `PackingPage`, add a `handleDelete(itemId)` callback: optimistically remove item from `items` state, call `api.trips.deletePackingItem`, restore on error
- [x] 3.2 Pass `onDelete` to `ItemRow` only for personal items where `item.userId === userId` (member's own FYP section)
- [x] 3.3 Confirm owner's own FYP group also gets `onDelete` (same `item.userId === userId` condition covers this)
- [x] 3.4 Confirm other members' FYP groups (owner view) render without `onDelete` — no trash icons

## 4. FYP section — add input

- [x] 4.1 Add `newItemText` state (string) to `PackingPage`
- [x] 4.2 Render a text input + Add button at the bottom of the current user's FYP section
- [x] 4.3 Add button and Enter key both trigger `handleAddItem`: POST via `api.trips.createPackingItem`, append returned item to `items` state, clear `newItemText`
- [x] 4.4 Disable the Add button when `newItemText` is empty or a request is in-flight

## 5. Empty state adjustment

- [x] 5.1 When `items.length === 0`, still render the FYP add input (remove the early-return that hides all content when no items exist, or restructure so the FYP add input is always shown)

## 6. Build and type check

- [x] 6.1 Run `npm run build:watch` (client-trips) and confirm zero TypeScript errors

## 7. Docs

- [x] 7.1 Update `openapi.yaml` — no route changes needed (existing POST and DELETE routes are unchanged); confirm no edits required
