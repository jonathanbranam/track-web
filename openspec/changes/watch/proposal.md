## Why

Users want a shared way to track movies and TV series they intend to watch and have already watched, then coordinate group viewing sessions. Without a structured list, good content gets forgotten, series watch orders get lost, and scheduling a group night requires out-of-band coordination to figure out what to watch.

## What Changes

- Each user maintains a personal watchlist covering both movies and TV series
- Movie states: **unseen**, **watched**, **would watch again**; TV series states: **unseen**, **watching**, **watched**, **would watch again**
- Movies have a title, optional runtime, description, streaming platform, and one or more genre tags
- Movies can belong to a named **series** (e.g., MCU) with an explicit watch-order position
- TV series have a title, streaming platform, and one or more genre tags; series are structured as seasons with episode counts per season
- Watch progress is tracked per episode; users can bulk-mark all episodes watched up to a given season/episode
- Any user can create a **watch event** (movie or TV type), invite individual users or groups, collect RSVPs, vote on candidates using a 5-level scale, and confirm a selection; TV events additionally set episode mode (latest or specific range)

## Capabilities

### New Capabilities

- `watch-catalog`: Global catalog for movies and TV series with genre tags; movies include runtime, description, streaming, and optional series membership; TV series include typical episode runtime and per-season episode counts
- `watch-movie-series`: Named movie series grouping with defined watch-order positions; a movie can belong to multiple series
- `watch-watchlist`: Per-user state for movies (unseen / watched / would watch again) and TV series (unseen / watching / watched / would watch again), a −2 to 2 rating expressing desire to watch, and per-episode progress log for TV; event votes propagate to rating when none is set
- `watch-events`: Scheduled group viewing events (movie or TV) with invite list, RSVP, candidate suggestions, 5-level voting, and host-confirmed selection; TV events specify latest or a specific episode range

### Renamed / Superseded

- `client-movies` → `client-watch` (serves `watch.branam.us`)
- Prior `movies-watchlist` and `movies-watch-party` capabilities superseded by the above

## Impact

- `src/db.ts` — new tables: `tags`, `movie_tags`, `movie_series`, `movie_series_entries`, `user_movies`, `tv_series`, `tv_series_seasons`, `tv_series_tags`, `user_tv_series`, `user_tv_progress`, `watch_events`, `watch_event_invites`, `watch_event_candidates`, `watch_event_votes`, `watch_event_selection`
- `src/routes/watch/` — new route files: `movies.ts`, `tv.ts`, `events.ts`, `tags.ts`; registered under `/api/watch/` in `app.ts`
- `src/repositories/sqlite/` — new: `movie.repository.ts`, `tv.repository.ts`, `watch-event.repository.ts`; interfaces added to `repositories/interfaces.ts`
- `client-watch/src/` — replaces `client-movies/`; pages: movie watchlist, TV watchlist, catalogs, event list/detail
- `vite.config.watch.ts` — Vite config for `client-watch` build (mirrors `client-time` pattern)
- `package.json` — add `build:watch` script; include in `build`
- `ecosystem.config.cjs`, `Caddyfile` — add `watch.branam.us` entry
