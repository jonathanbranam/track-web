## Context

Five discrete UX fixes for the iOS PWA. Each is self-contained; they share no inter-dependencies and can be implemented in any order. The stack is Hono (backend) + React 19 + Tailwind CSS v4 (frontend).

## Goals / Non-Goals

**Goals:**
- Page headings always visible below iOS status bar / Dynamic Island
- Live tag-chip preview for `:tag` tokens while typing (matching existing `#tag` behavior)
- Stop confirmation shows start time + live elapsed time so the user has full context
- Running task can be deleted without stopping first, with a confirmation step
- Log entries can be deleted by swiping left, with a confirmation step

**Non-Goals:**
- Editing completed entry descriptions or times (separate feature)
- Bulk delete or undo
- Android swipe gesture parity (desktop/Android hover states are fine)

## Decisions

### 1. iOS safe area — padding on page wrappers, not the `<html>` element

**Decision**: Add `padding-top: var(--sat)` (already defined as `env(safe-area-inset-top, 0px)` in `index.css`) to the scrollable content wrapper in `App.tsx` (`<div className="flex-1 overflow-auto pb-16">`). This applies consistently across all authenticated pages without touching each page component.

**Rationale**: The CSS variable `--sat` is already defined. Adding `pt-[var(--sat)]` on the outer scroll container is a single-line change that covers all routes automatically. Applying it per-page would require touching `HomePage`, `LogPage`, and any future pages.

**Alternative considered**: Adding `paddingTop: 'var(--sat)'` inline per page — more brittle and repetitive.

### 2. `:tag` live preview — extend the regex in `StartTask`

**Decision**: Change the tag-match regex in `StartTask` from `/#[a-zA-Z][a-zA-Z0-9-]*/g` to `/(#|:)[a-zA-Z][a-zA-Z0-9-]*/g` to capture both prefixes for the chip preview. The chip label strips the prefix, so both `#home` and `:home` display as `home`.

**Rationale**: The server already normalizes `:tag` → `#tag`. The UI should preview what the server will store. A single regex change with a `.replace(/^[#:]/, '')` strip keeps the change minimal.

**Alternative considered**: Duplicating the server-side `parseTags` utility on the client — heavier, and the live preview doesn't need full normalization.

### 3. Stop confirmation context — add start time + elapsed display

**Decision**: In the `RunningTask` component's stop view, add two lines above the `TimePicker`:
- "Started at HH:MM AM/PM" (formatted from `entry.startedAt`)
- A live elapsed counter reusing the existing `useElapsed` hook

**Rationale**: The user already sees elapsed time in the running card. When they tap "Stop Task" the card switches to the stop form and that context disappears. Keeping it visible prevents mis-stops.

**Alternative considered**: Keeping the elapsed counter in the top-right of the stop card header — acceptable, but inline context rows are cleaner with the existing card layout.

### 4. Delete running task — trash icon + bottom sheet confirmation

**Decision**: Add a small trash icon button to the running task card (top-right corner, next to the elapsed time). Tapping it shows a confirmation view within the same card (replacing the normal running view, similar to how the stop view works). Confirming calls `DELETE /api/entries/:id`.

Backend:
- Add `delete(id: number): boolean` to `IEntryRepository` and `SqliteEntryRepository`
- Add `DELETE /api/entries/:id` route: auth-check, ownership-check, then delete. Return 204.
- Only running entries (or any entry) can be deleted — no special guard needed beyond ownership.

Frontend:
- `api.entries.delete(id)` method added to `api.ts`
- `RunningTask` gets a `onDeleted` callback prop; `HomePage` handles it by resetting to `empty` mode (no `prevEndedAt` since the timeline is now as-if the entry never happened — use the previously-ended entry's time, same as initial load)

**Rationale**: Inline confirmation within the card avoids a modal overlay and is consistent with the stop flow pattern already used.

### 5. Swipe-to-delete in Log — CSS transform + pointer events, no library

**Decision**: Implement swipe-to-delete in `LogPage` without a third-party library, using `onPointerDown/Move/Up` events on each entry row. A horizontal drag of > 80 px left reveals a red "Delete" button underneath. Releasing at that threshold triggers a confirmation (an inline "Are you sure?" row replacing the entry, with Yes/Cancel buttons). Confirming calls `DELETE /api/entries/:id`, removes the entry optimistically from state, and reverts on error.

**Rationale**: The app has no gesture library dependency. The entries list is short (one day of tasks). A lightweight pointer-event implementation avoids adding a dependency and gives full control over the animation style.

**Alternative considered**: `react-swipeable` library — would be cleaner but adds a dependency for one UI pattern.

### 6. DELETE API endpoint

```
DELETE /api/entries/:id
```
- Auth required (existing middleware)
- 404 if not found or not owned by current user
- 204 No Content on success
- No request body

The `IEntryRepository` interface gains:
```ts
delete(id: number): boolean  // returns false if not found
```
`SqliteEntryRepository` implements it with a single `DELETE FROM time_entries WHERE id = ?` statement.
