## 1. Database Schema

- [ ] 1.1 Add `tags` table migration in `src/db.ts`
- [ ] 1.2 Add `movies`, `movie_tags`, `movie_series`, `movie_series_entries`, `user_movies` migrations
- [ ] 1.3 Add `tv_series`, `tv_series_tags`, `user_tv_series` migrations
- [ ] 1.4 Add `watch_events`, `watch_event_invites`, `watch_event_candidates`, `watch_event_votes`, `watch_event_selection` migrations

## 2. Repository Interfaces

- [ ] 2.1 Add `MovieRepository` interface to `src/repositories/interfaces.ts`
- [ ] 2.2 Add `TvRepository` interface to `src/repositories/interfaces.ts`
- [ ] 2.3 Add `WatchEventRepository` interface to `src/repositories/interfaces.ts`

## 3. SQLite Repository Implementations

- [ ] 3.1 Implement `src/repositories/sqlite/movie.repository.ts` — catalog CRUD, series management, watchlist operations
- [ ] 3.2 Implement `src/repositories/sqlite/tv.repository.ts` — catalog CRUD, watchlist with state and episode progress
- [ ] 3.3 Implement `src/repositories/sqlite/watch-event.repository.ts` — event CRUD, invites, candidates, votes, selection, completion with watchlist transitions

## 4. API Routes — Tags and Movies

- [ ] 4.1 Create `src/routes/watch/tags.ts` — `GET /api/watch/tags`, `POST /api/watch/tags`
- [ ] 4.2 Create `src/routes/watch/movies.ts` — catalog CRUD, series routes, watchlist routes
- [ ] 4.3 Register all watch route files in `src/app.ts` under `/api/watch/`

## 5. API Routes — TV and Events

- [ ] 5.1 Create `src/routes/watch/tv.ts` — catalog CRUD, watchlist routes
- [ ] 5.2 Create `src/routes/watch/events.ts` — event CRUD, RSVP, candidates, votes, selection, `POST /complete`
- [ ] 5.3 Implement vote handler: upsert watchlist rating seed on vote cast
- [ ] 5.4 Implement complete handler: apply watchlist state transitions and TV episode progress for yes-RSVP attendees

## 6. Frontend Setup

- [ ] 6.1 Rename `client-movies/` to `client-watch/`; update `package.json` workspace and script references
- [ ] 6.2 Create `vite.config.watch.ts` mirroring the `client-time` Vite config pattern
- [ ] 6.3 Add `build:watch` to `package.json` scripts; include in `build`
- [ ] 6.4 Set up `client-watch/src/App.tsx` with React Router routes, `AuthGuard`, and default redirect `/` → `/events`

## 7. Frontend — Events Pages

- [ ] 7.1 Implement `/events` — watch events list with event type, date, and RSVP status
- [ ] 7.2 Implement `/events/new` — create event form (type, title, date, invitees via `ConnectableUserPicker`)
- [ ] 7.3 Implement `/events/:id` — event detail: invitees + RSVP, candidates + voting, selection panel, complete button for host

## 8. Frontend — Movies Pages

- [ ] 8.1 Implement `/movies` — personal movie watchlist with Want to Watch / Watched tabs
- [ ] 8.2 Implement `/movies/catalog` — full catalog with title search and tag filter; add movie form; series browser

## 9. Frontend — TV Pages

- [ ] 9.1 Implement `/tv` — personal TV watchlist with Want / Watching / Watched tabs; show current S/E progress
- [ ] 9.2 Implement `/tv/catalog` — full TV catalog with title search and tag filter; add series form

## 10. Frontend — NavBar and People Tab

- [ ] 10.1 Implement NavBar with Events | Movies | TV | People tabs
- [ ] 10.2 Implement `/people` tab using `PeopleTab` and social components from `@repo/ui`

## 11. Login Page

- [ ] 11.1 Update watch login page to display "Watch" branding (app name and icon)

## 12. Deployment

- [ ] 12.1 Add `watch.branam.us` block to `Caddyfile` with handle-block pattern and SPA fallback
- [ ] 12.2 Add watch app static serving entry to `ecosystem.config.cjs`
- [ ] 12.3 Run full build and confirm PM2 starts the watch app cleanly

## 13. Verification

- [ ] 13.1 Run test suite and confirm all existing and new tests pass
