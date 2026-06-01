## 1. API client

- [ ] 1.1 Add `createPackingItem(tripId: number, text: string)` to `client-trips/src/api.ts` — POST with `{ text, section: '', position: 0 }`
- [ ] 1.2 Add `deletePackingItem(tripId: number, itemId: number)` to `client-trips/src/api.ts` — DELETE, returns void

## 2. ItemRow component

- [ ] 2.1 Add optional `onDelete?: () => void` prop to `ItemRow` in `PackingPage.tsx`
- [ ] 2.2 When `onDelete` is provided, render a trash icon button on the right side of the row
- [ ] 2.3 Add local `pendingDelete` state to `ItemRow`; tapping trash sets it true, showing inline Cancel and Delete buttons
- [ ] 2.4 Cancel button resets `pendingDelete` to false
- [ ] 2.5 Delete button calls `onDelete` and resets `pendingDelete` to false

## 3. FYP section — delete wiring

- [ ] 3.1 In `PackingPage`, add a `handleDelete(itemId)` callback: optimistically remove item from `items` state, call `api.trips.deletePackingItem`, restore on error
- [ ] 3.2 Pass `onDelete` to `ItemRow` only for personal items where `item.userId === userId` (member's own FYP section)
- [ ] 3.3 Confirm owner's own FYP group also gets `onDelete` (same `item.userId === userId` condition covers this)
- [ ] 3.4 Confirm other members' FYP groups (owner view) render without `onDelete` — no trash icons

## 4. FYP section — add input

- [ ] 4.1 Add `newItemText` state (string) to `PackingPage`
- [ ] 4.2 Render a text input + Add button at the bottom of the current user's FYP section
- [ ] 4.3 Add button and Enter key both trigger `handleAddItem`: POST via `api.trips.createPackingItem`, append returned item to `items` state, clear `newItemText`
- [ ] 4.4 Disable the Add button when `newItemText` is empty or a request is in-flight

## 5. Empty state adjustment

- [ ] 5.1 When `items.length === 0`, still render the FYP add input (remove the early-return that hides all content when no items exist, or restructure so the FYP add input is always shown)

## 6. Build and type check

- [ ] 6.1 Run `npm run build:watch` (client-trips) and confirm zero TypeScript errors

## 7. Docs

- [ ] 7.1 Update `openapi.yaml` — no route changes needed (existing POST and DELETE routes are unchanged); confirm no edits required
