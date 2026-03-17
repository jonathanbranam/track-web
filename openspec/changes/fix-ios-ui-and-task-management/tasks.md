## 1. iOS Top Safe Area

- [x] 1.1 In `client/src/App.tsx`, add `style={{ paddingTop: 'var(--sat)' }}` to the `<div className="flex-1 overflow-auto pb-16">` scroll container so all page headings clear the iOS status bar / Dynamic Island.

## 2. `:tag` Live Preview in Start Task

- [x] 2.1 In `client/src/pages/HomePage.tsx` `StartTask`, update the tag-match line from:
  ```ts
  const tagMatches = description.match(/#[a-zA-Z][a-zA-Z0-9-]*/g) ?? []
  ```
  to:
  ```ts
  const tagMatches = (description.match(/(#|:)[a-zA-Z][a-zA-Z0-9-]*/g) ?? [])
    .map(t => t.replace(/^[#:]/, ''))
  ```
  Update the chip render loop to use the pre-stripped tag strings (no `.replace` needed there).

## 3. Stop Task — Show Start Time and Elapsed Time

- [x] 3.1 In `client/src/pages/HomePage.tsx` `RunningTask`, above the `<TimePicker>` in the stop branch, add:
  - A "Started at" line using `entry.startedAt` formatted as `h:mm a` via `toLocaleTimeString`.
  - An elapsed duration calculated from `entry.startedAt` to the current `stopTime` state value (not live clock time). Format as `Xh Ym` or `Ym` using the same rounding logic as `formatDuration` in `LogPage`. Recalculates whenever `stopTime` changes via the `TimePicker`.

## 4. Delete Running Task

- [x] 4.1 **Repository interface** — add `delete(id: number): boolean` to `IEntryRepository` in `src/repositories/interfaces.ts`.
- [x] 4.2 **SQLite implementation** — add `delete(id: number): boolean` to `SqliteEntryRepository` in `src/repositories/sqlite/entry.repository.ts`:
  ```ts
  delete(id: number): boolean {
    const result = this.db.prepare('DELETE FROM time_entries WHERE id = ?').run(id)
    return result.changes > 0
  }
  ```
- [x] 4.3 **API route** — add `DELETE /api/entries/:id` in `src/routes/entries.ts` after the PATCH route:
  ```ts
  router.delete('/:id', (c) => {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid entry ID.' }, 422)
    const existing = entryRepo.findById(id)
    if (!existing || existing.userId !== userId) return c.json({ error: 'Entry not found.' }, 404)
    entryRepo.delete(id)
    return c.body(null, 204)
  })
  ```
- [x] 4.4 **API client** — add `delete(id: number): Promise<void>` to `api.entries` in `client/src/api.ts`:
  ```ts
  delete: async (id: number) => {
    await request(`/api/entries/${id}`, { method: 'DELETE' })
  },
  ```
- [x] 4.5 **UI — trash icon button** — in `RunningTask` (normal running view), add a trash icon button in the top-right area (next to the elapsed time). Use an SVG trash icon styled `text-gray-500 hover:text-red-400`. Add `showDelete` / `setShowDelete` state.
- [x] 4.6 **UI — delete confirmation view** — when `showDelete` is true, render a confirmation panel inside the card (same pattern as the stop view):
  - Header: "Delete Task?"
  - Description of the task
  - Cancel button (sets `showDelete` to false)
  - "Delete" button (red, calls `api.entries.delete(entry.id)`, then calls `onDeleted()`)
  - Add `deleting` state + error display for failure cases.
- [x] 4.7 **HomePage wiring** — add `onDeleted` prop to `RunningTask`; in `HomePage.handleDeleted`, reset to `empty` mode (fetch the previous ended-at same as initial load via `refresh()`).

## 5. Swipe-to-Delete in Log

- [x] 5.1 **LogPage state** — add a `deletingId: number | null` state to track which entry is in confirm-delete state.
- [x] 5.2 **Swipe gesture** — wrap each entry `<div>` in a container that tracks `onPointerDown`, `onPointerMove`, `onPointerUp`/`onPointerCancel`. Track `dragX` (capped at 0, minimum −120 px). Apply `transform: translateX(${dragX}px)` with a `transition` that activates only on release. When released at ≤ −80 px, set `deletingId` to the entry's id (instead of completing the delete immediately).
- [x] 5.3 **Delete confirmation row** — when `deletingId === entry.id`, render an inline confirmation row inside the entry card instead of the swipe transform:
  - "Delete this entry?" text
  - Cancel button (clears `deletingId`)
  - Delete button (red, calls `api.entries.delete(entry.id)`, removes entry from `entries` state optimistically, reverts on error)
- [x] 5.4 **Reset on scroll** — call `setDeletingId(null)` (and reset drag state) if a new pointer-down starts on a different entry while one is already confirming.
