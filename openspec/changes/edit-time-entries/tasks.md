## 1. Backend — Repository

- [x] 1.1 Add `getPreviousEntry(userId: number, entryId: number): Entry | null` to `IEntryRepository` interface in `src/repositories/interfaces.ts`
- [x] 1.2 Add `getNextEntry(userId: number, entryId: number): Entry | null` to `IEntryRepository` interface
- [x] 1.3 Implement `getPreviousEntry` in the SQLite repository (`src/repositories/sqlite/`) — query for the completed entry with the largest `started_at` strictly less than the subject entry's `started_at`, excluding the subject entry
- [x] 1.4 Implement `getNextEntry` in the SQLite repository — query for the entry with the smallest `started_at` strictly greater than the subject entry's `started_at`, excluding the subject entry

## 2. Backend — PATCH Endpoint

- [x] 2.1 Add optional `description` field to `updateEntrySchema` in `src/routes/entries.ts`
- [x] 2.2 When `description` is provided in a PATCH request, normalize it and re-derive tags using the existing `normalizeDescription` / `parseTags` / `tagsToString` utilities, then include `description` and `tags` in the `entryRepo.update()` call
- [x] 2.3 Add `description` and `tags` fields to the `update()` method signature on `IEntryRepository` and its SQLite implementation
- [x] 2.4 Add lower-bound constraint check to PATCH: call `getPreviousEntry` and return 422 with `previousEndedAt` if the new `startedAt` is earlier than the previous entry's `endedAt`
- [x] 2.5 Add upper-bound constraint check to PATCH: call `getNextEntry` and return 422 with `nextStartedAt` if the new `endedAt` is later than the next entry's `startedAt`

## 3. Frontend — EditEntryForm Component

- [x] 3.1 Create `client/src/components/EditEntryForm.tsx` accepting props: `entry`, `context: 'running' | 'stopping' | 'completed'`, `lowerBound: Date | null`, `upperBound: Date | null`, `onSave`, `onStop`, `onCancel`
- [x] 3.2 Render a description `<input>` pre-filled with `entry.description`; show live tag-chip preview below it using the existing `#tag` / `:tag` regex
- [x] 3.3 Render Started at: time display, manual `<input type="time">`, and offset buttons (-5m/-10m/-30m) — except when `context === 'stopping'`, where offset buttons are omitted
- [x] 3.4 Render Ended at (when `context !== 'running'`): full TimePicker with offset buttons; enforce both `lowerBound` (started_at value) and `upperBound` (next entry's startedAt) — disable Save/Stop when violated
- [x] 3.5 Render Save & Keep Running button (full-width, indigo) immediately after the Started at section when `context === 'stopping'`; add a divider before Ended at
- [x] 3.6 Render action buttons: for `stopping` — Cancel and Stop Task side by side; for `running` — Save & Keep Running and Cancel side by side; for `completed` — Cancel and Save side by side
- [x] 3.7 Wire Save & Keep Running to call `api.entries.update(id, { description, startedAt })` then `onSave`; wire Stop Task to call `api.entries.update(id, { description, startedAt, endedAt })` then `onStop`; wire Save (completed context) similarly with all changed fields

## 4. Frontend — Running Task Edit (HomePage)

- [x] 4.1 Add a pencil icon button to the running task card header in `HomePage.tsx` alongside the existing trash icon; tapping it sets a new `showEdit` state (mutually exclusive with `showStop` and `showDelete`)
- [x] 4.2 Fetch `lowerBound` for the edit form: call `api.entries.list()` to get today's entries and find the previous completed entry's `endedAt` (or null if none)
- [x] 4.3 Render `<EditEntryForm>` with `context='running'` when `showEdit` is true; on `onSave` refresh the running entry and return to the normal card view; on `onCancel` return to the normal card view

## 5. Frontend — Stop Screen Edit (HomePage)

- [x] 5.1 Add a pencil icon button to the stop screen header in `HomePage.tsx`; tapping it sets `showEdit` (which also clears `showStop`)
- [x] 5.2 Pass the same `lowerBound` used for running-edit, and the current `stopTime` as the initial `endedAt` value, into `<EditEntryForm context='stopping'>`
- [x] 5.3 On `onStop` (Stop Task): update the entry and call the existing `onStopped` handler to transition to the start-task view; on `onSave` (Save & Keep Running): update the entry and return to the normal running card; on `onCancel`: return to the stop screen (`showStop = true`)

## 6. Frontend — Log Entry Edit (LogPage)

- [x] 6.1 Extend the `EntryRow` gesture handler in `LogPage.tsx` to track positive drag (`dragX` clamped to `[0, 120]`); on release past `+80px` call a new `onSwipeEdit(id)` prop
- [x] 6.2 Add indigo background with pencil icon on the left side of the entry row (revealed as the card slides right), mirroring the existing red/trash reveal on the right
- [x] 6.3 Add `editingId` state to `LogPage`; when `editingId === entry.id`, render `<EditEntryForm context='completed'>` inline in place of the swipeable row (same pattern as the existing delete confirmation)
- [x] 6.4 Fetch `lowerBound` and `upperBound` for each entry from the sorted entries list (previous entry's `endedAt` and next entry's `startedAt`); pass them to `EditEntryForm`
- [x] 6.5 On `onSave`: call `api.entries.update`, replace the entry in local state with the returned entry, clear `editingId`; on `onCancel`: clear `editingId`
- [x] 6.6 Ensure mutual exclusion: opening an edit row clears any open `deletingId`; opening a delete row clears any open `editingId`
