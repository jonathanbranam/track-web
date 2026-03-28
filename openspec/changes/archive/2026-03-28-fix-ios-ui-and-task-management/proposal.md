## Why

Several small but noticeable UX issues have surfaced from daily iOS use of the PWA. The page headings clip behind the notch/Dynamic Island, the colon tag shortcut (`:tag`) doesn't show live chip previews while typing, the stop flow loses the elapsed-time context, and there's no way to discard a mistakenly started task or delete completed entries from the log.

## What Changes

- **iOS top safe area**: Apply `env(safe-area-inset-top)` padding to page content so "Track" and "Today" headings no longer overlap the iOS status bar / Dynamic Island.
- **`:tag` live preview**: In the Start Task input, recognize `:tag` tokens (in addition to `#tag`) as in-progress tag chips while the user types. Mirrors the server-side normalization already in place.
- **Stop task context**: The stop confirmation panel shows the start time and the elapsed duration from start to the selected stop time. The duration updates live as the user adjusts the stop time via the time picker, reflecting the exact duration that will be recorded.
- **Delete running task**: A trash icon on the running task card opens a confirmation sheet; confirming deletes the entry via a new `DELETE /api/entries/:id` endpoint.
- **Swipe-to-delete in Log**: Each completed entry in the Log tab can be swiped left to reveal a Delete action; confirming removes the entry and refreshes the list.

## Capabilities

### Modified Capabilities

- `time-entries`: Add `DELETE /api/entries/:id` endpoint; add `delete(id)` to `IEntryRepository` and `SqliteEntryRepository`.
- `daily-log`: Log entries support swipe-to-delete with optimistic removal and error recovery.
- `pwa-shell`: Top safe-area inset applied to all authenticated page containers.
- `tags`: UI tag-chip preview extended to recognize `:tag` tokens while typing.

### New Capabilities

None.

## Impact

- **Frontend only** for safe-area, elapsed-time display, `:tag` preview, and delete-running-task UI.
- **Backend + frontend** for the delete endpoint and swipe-to-delete.
- **No schema changes** — deletion removes rows, no new columns needed.
- **No breaking API changes** — the new `DELETE` route is additive.
