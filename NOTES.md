# Issues & Next Steps

## Open Issues

### Overnight running task — cannot set stop time to previous day

**Status:** Bug, behavior unclear

**Problem:**
If a task is left running past midnight (ET), the `TimePicker` in the Stop Task panel uses `new Date()` as the default stop time and enforces `min={entry.startedAt}` for validation. However, the `TimePicker` component appears to only allow picking a time within the current calendar day — it has no way to select a time on a *previous* day. This makes it impossible to correctly stop a task that ran from, say, 11 PM to 1 AM.

**Affected code:**
- `client/src/pages/HomePage.tsx` — `RunningTask`: `setStopTime(new Date())` on stop button click; `min={minTime}` passed to `TimePicker`
- `client/src/components/TimePicker.tsx` — renders only a time picker, no date component

**Open questions / options to decide:**
1. **Cap at 4 AM boundary** — automatically clamp the stop time to `3:59 AM ET` (end of the "previous" day boundary) as a convenience default, and allow the user to adjust within the same day. Simplest, matches the app's day model.
2. **Add a date selector to TimePicker** — allow picking both date and time. More flexible but significantly more UI complexity.
3. **Warn and auto-stop at midnight** — detect that a task is crossing the 4 AM boundary and prompt/auto-stop it. Prevents the problem entirely but may be surprising.
4. **Two-step picker** — when the current time is in a different "day" than `startedAt`, show a day selector first (yesterday / today), then the time picker.
5. **Do nothing / delete only** — since the app is single-user, document that the workaround is to delete the orphaned running task and manually log the entry. Acceptable given the edge-case frequency.


### Task that spans two days should be listed in both

As task should be listed on every day that it spans. If the start_time of the
task is on or before today and the end_time is one or after today, then the task
should appear in that day's task list.

### Bug: I can use invalid start time without an error

If I rollback the start time to before the previous task, no error is shown.
However, the started at does not use the earlier time. The earlier time is shown
in the time picker but not the larger display, so they do not match. When
pressing "Start task" it uses the proper time. The time picker should show an
error outline and/or icon if it is set too early with an error message.
error if it is set t


### Gap Start Task text and settings lost if navigating to Log

If the user enters text and changes the time in the Start Task dialog, then
navigates to the Log and back, their work is lost. The dialog should stay open
and anything they have entered should be there. Be sure to update the component
with any changes that have happened in the log. The user could have deleted an
entry or editing the end time of an entry (future capability).

A "Cancel" button should also be added to the "Start Task" dialog so that the
user can dismiss it by choice if they want to start over when adding a task.
This should reset the dialog.

### Bug: Live tag preview does not lowercase tags

Requirement: Live tag previous should fully normalize tags. It should replace
":" with "#" and lowercase the tag in the live preview. The user's text does not
need to be changed live. Entering "Work :coDING" should show "#coding" as the
live tag preview. Live preview should also de-dupe on the normalized tag name.

