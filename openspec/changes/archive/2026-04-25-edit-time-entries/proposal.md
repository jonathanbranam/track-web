## Why

Users have no way to correct mistakes in a running or completed entry — a mistyped description or wrong start time requires deleting and re-entering. Editing is a core time-tracking workflow that the app currently lacks entirely.

## What Changes

- **Edit running entry**: An edit interface (similar to the start-task screen) lets the user change the description (tags re-derived automatically) and the start time, subject to the same lower-bound constraint as task creation (start time ≥ previous entry's end time, but may be pushed later to create a gap).
- **Edit on stop**: The stop-task screen shows a pencil icon in the upper right (replacing the delete icon, which is not shown during stop). Tapping it opens an edit interface for description, start time, and end time. The edit interface offers three actions: **Cancel** (discard changes, return to stop screen), **Stop Task** (save changes and stop), and **Save & Keep Running** (save changes without stopping).
- **Edit completed entry**: In the daily log, swiping right on an entry opens an edit interface; swiping left still deletes. The user can edit description, start time, and end time. Edits must not create overlaps with adjacent entries.
- **New API endpoint**: A `PATCH /api/entries/:id` endpoint handles updates for both running and completed entries, enforcing all ordering and overlap constraints server-side.

## Capabilities

### New Capabilities
- `edit-entry`: Edit interface and workflow for modifying a running or completed entry (description, start time, end time); covers UI, API contract, and constraint enforcement.

### Modified Capabilities
- `time-entries`: Adding a `PATCH /api/entries/:id` endpoint and update method to the repository interface.
- `time-adjustment`: Time picker is now used in edit context with different lower/upper bounds (edit-start: previous entry's end time; edit-end: entry's start time, and must not overlap next entry's start).
- `daily-log`: Adding swipe-right gesture to open the edit interface for a completed entry.

## Impact

- **Backend**: New `PATCH /api/entries/:id` route; `IEntryRepository` gains an `update` method; constraint logic must handle both running-entry edits (no upper bound on end) and completed-entry edits (no overlap with next entry).
- **Frontend**: New edit sheet/modal component reused across running-entry, stop-flow, and log-entry contexts; `LogPage` gains swipe-right handler; `HomePage` gains edit affordance on the running task display.
- **No new dependencies expected.**
