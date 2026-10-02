## 1. Server: storage and ingest (outside trial scope: `src/`)

- [ ] 1.1 Add the `game_events` migration to `src/db.ts` (table, unique key, two indexes)
- [ ] 1.2 Add the `game_feedback` migration to `src/db.ts` (table, index)
- [ ] 1.3 Add repository interfaces and SQLite implementations for events and feedback in `src/repositories/`
- [ ] 1.4 Add the `ingestGuard` helper: body size cap, per-user in-memory rate limit, server-side context stamping (user, app version from `version.json`, truncated UA)
- [ ] 1.5 Add `POST /api/games/telemetry` (batch validation, `INSERT OR IGNORE`, one transaction, `204`) with tests
- [ ] 1.6 Add `POST /api/games/feedback` (type, length 1 to 2000, rate limit, `201 { id }`) with tests
- [ ] 1.7 Extend `scripts/prune-sessions.ts` to delete `game_events` older than 90 days, with a test

## 2. Server: admin read side (outside trial scope: `src/`, `scripts/`)

- [ ] 2.1 Add `GET /api/admin/games/stats` (per-game and per-level aggregates) with tests on fixture events
- [ ] 2.2 Add `GET /api/admin/games/feedback` and `POST /api/admin/games/feedback/:id/triage`, admin-only, with tests
- [ ] 2.3 Add CLI commands `games:stats`, `games:feedback`, `games:feedback-triage`, `games:feedback-export` to `scripts/admin.ts`
- [ ] 2.4 Document the CLI in `docs/games/admin-cli.md`; update `openapi.yaml` and `llm-context.md` for all new routes

## 3. Client: tracker (in trial scope: `client-games/`)

- [ ] 3.1 Add `client-games/src/lib/telemetry.ts`: queue, flush (timer, size, `visibilitychange`, `pagehide`), `sendBeacon`/`fetch keepalive`, localStorage retry queue with cap, `seq`, opt-out flag
- [ ] 3.2 Add idle detection and active-time accounting; shared events `session_start`, `session_end`, `idle_*`, `game_over`
- [ ] 3.3 Add `useGameTracker(slug)` hook and the `trackingSpec` type; derive abandonment on exit
- [ ] 3.4 Unit tests (vitest, fake timers): batching, flush on hide, idle transitions, offline retry and cap, no throw on fetch failure

## 4. Client: feedback (in trial scope)

- [ ] 4.1 Add `FeedbackDialog` (type prop, textarea, counter, error keeps draft) and `FeedbackButton`
- [ ] 4.2 Mount the button in the in-game chrome and on game-over/pause screens; pause active-time while open
- [ ] 4.3 Add a "Suggest a game" entry and the playtest notice on `HomePage`
- [ ] 4.4 Add `api.ts` functions for feedback; component tests

## 5. Client: per-game instrumentation (in trial scope, no Dungeon Tactics)

- [ ] 5.1 Ball Merge  5.2 Orbital Dodger  5.3 Space Golf  5.4 Woodoku  5.5 Hex Block  5.6 Favo: add `trackingSpec` and call sites per the design table; logic modules unchanged
- [ ] 5.7 Confirm each game plays identically with the server returning 404 (silent failure)

## 6. Admin page (outside trial scope: `client-admin`, optional)

- [ ] 6.1 Add "Games insights" page: per-game table, level drill-down, feedback list with triage button
