## Context

The `PATCH /api/entries/:id` endpoint already exists and handles `startedAt`/`endedAt` for stopping tasks, but it does not accept `description`, does not re-derive tags, and does not check overlap with adjacent entries. The frontend `RunningTask` component in `HomePage` already has a stop screen as an inline view toggle; `LogPage` already has a left-swipe-to-delete gesture using pointer events.

## Goals / Non-Goals

**Goals:**
- Extend PATCH to accept `description` and re-derive tags; add overlap constraint checks against adjacent entries
- Edit running entry: pencil icon on the running task card → edit description + start time
- Edit on stop: pencil icon in stop screen → edit description + start time + end time, with Stop Task / Save & Keep Running / Cancel actions
- Edit completed entry: right-swipe in LogPage → edit description + start time + end time

**Non-Goals:**
- Bulk editing
- Editing entries from past days (LogPage only shows today)
- Audit trail of edits

## Decisions

### 1. Extend the existing PATCH endpoint rather than add a new one

The existing `PATCH /api/entries/:id` only lacks `description` support and overlap checks. Extending it keeps the API surface minimal. The `updateEntrySchema` gains an optional `description` field; the route re-derives tags when description is provided; and constraint checks against neighbors are added.

**Overlap constraint logic added to PATCH:**
- Fetch the previous entry (most recent completed entry with `started_at` < this entry's `started_at`; excludes self)
- Fetch the next entry (earliest entry with `started_at` > this entry's `started_at`; excludes self)
- New `started_at` must be ≥ previous entry's `ended_at` (422 if violated)
- New `ended_at` (if provided) must be ≤ next entry's `started_at` (422 if violated)

**New repository methods needed** on `IEntryRepository`:
- `getPreviousEntry(userId, entryId): Entry | null` — the completed entry immediately before the given entry
- `getNextEntry(userId, entryId): Entry | null` — the entry immediately after the given entry

*Alternative considered*: Fetch all day's entries in the route and do the check in-memory. Simpler but unnecessarily loads the whole day; the two-query approach is clearer about intent.

### 2. Single `EditEntryForm` component, rendered inline (not a modal)

The existing stop screen is an inline view swap within `RunningTask` (a `showStop` boolean gates which JSX is rendered). The edit form follows the same pattern — no modal/sheet overlay — to stay consistent with the existing UI approach.

A single `EditEntryForm` component is parameterized by context:

| Context | Fields shown | Action buttons |
|---|---|---|
| `running` | description, start time | Save & Keep Running, Cancel |
| `stopping` | description, start time, end time | Stop Task, Save & Keep Running, Cancel |
| `completed` | description, start time, end time | Save, Cancel |

The component accepts:
- `entry` — the entry being edited
- `context: 'running' | 'stopping' | 'completed'`
- `lowerBound: Date | null` — minimum allowed `started_at` (previous entry's `ended_at`)
- `upperBound: Date | null` — maximum allowed `ended_at` (next entry's `started_at`; null for running)
- `onSave(data)` — callback with updated fields
- `onStop(data)` — callback used in stopping context (saves + stops)
- `onCancel` — callback to dismiss

*Alternative considered*: Separate `EditRunningEntry` and `EditCompletedEntry` components. More explicit but duplicates all the TimePicker and description-input wiring.

### 3. Edit button on running task: pencil icon alongside existing trash icon

The running task card in `HomePage` already shows a trash icon. A second icon (pencil) is added to the same icon row. Tapping it transitions to a new `showEdit` view within `RunningTask`, analogous to `showStop` and `showDelete`. Only one view (`showEdit`, `showStop`, `showDelete`) is active at a time.

### 4. Stop-screen edit: pencil icon in upper right; edit mode drops the icon and reorders actions

The stop screen header has a pencil icon button in the upper-right corner (delete is not shown in the stop screen). Tapping it transitions from `showStop` to `showEdit` with `context='stopping'`.

**Edit mode layout (stopping context):**
1. Header: "Edit Task" — pencil icon is gone (no icon in edit mode header)
2. Description field with live tag-chip preview
3. **Started at** — time display + manual time input only; no -5m/-10m/-30m offset buttons
4. **Save & Keep Running** (indigo, full-width) — immediately below Started at
5. Divider
6. **Ended at** — full TimePicker including offset buttons
7. **Cancel | Stop Task** side by side (matching the existing stop-screen button layout)

The "Save & Keep Running" button's position directly below Started at communicates that it only saves the description and start time — the Ended at section below the divider is visually scoped to the stopping decision. "Save & Keep Running" ignores the Ended at value even if the user has adjusted it.

### 5. Swipe-right for edit in LogPage

The existing gesture handler uses pointer events and clamps `dragX` to `[-120, 0]`. The right-swipe edit extends this to also handle positive drag, clamping to `[0, 120]`. Threshold at `+80` triggers `onSwipeEdit`. The visual treatment mirrors the left-swipe delete reveal (a colored background revealed as the card slides) but uses a different color (e.g., indigo, matching the app's accent color) and a pencil icon.

The `EntryRow` component gains `onSwipeEdit` and `editingId` props analogous to the existing `onSwipeDelete` / `deletingId` pattern. When `editingId` matches, the row renders the `EditEntryForm` in `completed` context inline (same pattern as the delete confirmation).

## Risks / Trade-offs

**Overlap checks require two extra queries per PATCH** → Acceptable: this is a single-user SQLite app with negligible query cost. The queries are indexed on `userId` and `started_at`.

**Two icon buttons on the running task card may feel crowded on small screens** → The icons are small (24px) and the card has enough horizontal padding. If it feels tight, the trash icon can move inside the delete confirmation view only.

**"Save & Keep Running" discards end time in stopping context** → Could surprise users who adjusted the end time and expected it to be remembered if they choose "Save & Keep Running". Mitigated by: the end time field is only visible in stopping context, and the button label makes it explicit that the task stays running (no end time).

**Right-swipe gesture conflicts with browser back navigation on some mobile browsers** → The existing left-swipe already handles this via `isScrollRef` (first significant movement determines scroll vs. swipe). Right-swipe uses the same disambiguation and won't conflict if horizontal drag is detected before vertical.
