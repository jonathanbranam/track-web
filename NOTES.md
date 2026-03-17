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
