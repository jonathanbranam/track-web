## Why

Users want a shared way to track movies they intend to watch and have watched, then coordinate group viewing sessions. Without a structured list, good movies get forgotten and scheduling a group night requires out-of-band coordination to figure out what to watch.

## What Changes

- Each user maintains a personal movie list with two states: want to watch and have watched
- Movies have a title (required) plus optional metadata: runtime (minutes), description, and streaming platform
- Each list entry has a priority rank (how much the user wants to watch it) and a "would watch again" flag for already-watched entries
- Any user can create a **watch plan** — a scheduled event with a date — and invite individual users or groups
- Invited users indicate attendance: yes, no, or maybe
- Any invited user can suggest movies for a watch plan from the global movie catalog
- All invited users vote on each suggested movie using a 5-level scale stored as an integer: −2 (definitely no), −1 (no), 0 (no preference), 1 (yes), 2 (definitely yes)

## Capabilities

### New Capabilities

- `movies-catalog`: Global movie catalog — title, optional runtime, description, and streaming platform; shared across all users
- `movies-watchlist`: Per-user movie list tracking want-to-watch and have-watched state, priority rank, and "would watch again" flag
- `movies-watch-plan`: Scheduled group viewing event with a date, an invited user/group list, and attendance responses (yes / no / maybe)
- `movies-voting`: Per-plan movie suggestion and voting — any invitee can suggest movies; all invitees vote on each suggestion using a 5-level integer scale (−2 to 2)

## Impact

- `src/db.ts` — new tables: `movies`, `user_movies`, `watch_plans`, `watch_plan_invites`, `watch_plan_movies`, `watch_plan_votes`
- `src/routes/movies.ts` — new route file for catalog CRUD and watchlist management
- `src/routes/watchPlans.ts` — new route file for plan creation, invites, attendance, suggestions, and votes
- `src/repositories/sqlite/` — new repository implementations for movies and watch plans
- `client-movies/src/` — new pages and components: movie catalog browser, personal watchlist, watch plan detail (suggestions + vote UI), attendance picker
- `client-movies/src/api.ts` — API methods for all new endpoints
