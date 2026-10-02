## Context

client-games has six games to instrument (Ball Merge, Orbital Dodger, Space Golf, Woodoku, Hex Block, Favo); Dungeon Tactics is excluded. Users are logged in (shared `sid` cookie, same-origin `/api`), and are trusted playtesters. The production host is a t4g.micro (1 GB RAM, burstable), with one SQLite file. Game components live at `client-games/src/games/<slug>/` and are mounted from `registry.ts`; the shell (`App.tsx`) hides the nav bar in game (`isInGame`).

## Goals / Non-Goals

**Goals:** know how long people play, which levels they spend time on or abandon, and what they say; make both easy for an agent or the human to read; never affect play.

**Non-goals:** real-time dashboards, third-party analytics, funnels/cohorts, per-frame or per-tap logging, A/B testing, moderation workflows, replying to users, tracking Dungeon Tactics or other apps.

## Decisions

### D1. One shared envelope, per-game vocabulary

Every event is `{ t, kind, level?, data? }` where `t` is client ms offset. Kinds in two groups:

- **Shared** (emitted by the tracker itself, no game code): `session_start`, `session_end` (with `reason`: `exit` | `hidden` | `unload`, plus `activeMs`, `idleMs`, `wallMs`), `idle_start`, `idle_end`, `game_over`.
- **Per-game** (declared by the game): `level_start`, `level_end` (`outcome`: `won` | `lost` | `abandoned`, `durationMs`, `score?`), `score`, and a game-specific `interaction` with a `name` and small `data`.

Each game declares its vocabulary in a typed `trackingSpec` next to its component (list of allowed `level` ids and `interaction` names). The tracker drops unknown interaction names in dev (console warning) so vocabularies don't drift. Server stores kind, level, and the JSON `data` verbatim after size checks; it does not validate per-game vocabularies (a new game event must not need a server deploy).

**Abandonment** is derived, not sent: a level with `level_start` and no `level_end` before `session_end` is abandoned. The tracker also emits `level_end{outcome:'abandoned'}` on exit/page-hide when a level is open, so the common case is explicit; the derivation covers crashes and lost batches.

**Alternative rejected:** a raw interaction stream (every tap). Cost and noise on a tiny host, and little insight. Interactions are counted and summarised: games emit named events only for meaningful actions (piece placed, ball dropped, shot fired, undo used), and the tracker coalesces repeats of the same name within a level into `{count}` on `level_end` unless the game marks the event `keep`.

### D2. Client tracker

`lib/telemetry.ts` exports `useGameTracker(slug)` (React hook; creates a `sessionId` UUID, starts the session on mount, ends on unmount) returning `{ levelStart, levelEnd, interaction, gameOver, score }`. Games call it from their React wrapper; Phaser scenes receive the tracker through the same props/callback mechanism they already use for score submission.

- **Queue and flush:** events append to an in-memory queue. Flush every 30 s, at 20 queued events, on `visibilitychange→hidden` and `pagehide`. Page-hide flushes use `navigator.sendBeacon` with a `Blob` of type `application/json` (cookie travels with it, same origin); other flushes use `fetch` with `keepalive: true`. No flush is awaited by game code; all errors are swallowed.
- **Idle:** active time is counted in 1 s ticks that count only if there was a pointer/key/touch/devicemotion input in the last 15 s and the page is visible. `idle_start`/`idle_end` are emitted on transitions only, so a long idle is two events. A session with no input for 5 min ends with `reason: 'idle_timeout'` and a new session starts on the next input.
- **Offline / failures:** a failed flush keeps the batch in `localStorage` (`games.telemetry.queue`, capped at 200 events, oldest dropped) and retries on the next flush, on the `online` event, and at next app load. Events carry `sessionId` + `seq` so the server de-duplicates retries (`UNIQUE(user_id, session_id, seq)`, `INSERT OR IGNORE`).
- **Never blocks play:** no `await` on the render/game path; the tracker does no work per frame, only on discrete events plus the 1 s tick; the tick pauses when hidden.
- **Opt-out switch:** a build-time `VITE_TELEMETRY=off` and a `localStorage` flag disable it (useful for development and for tests).

### D3. Server ingest (shared plumbing)

Both endpoints sit under `/api/games` behind the existing session/token auth and share one small helper, `ingestGuard`:

- JSON body cap (16 KB telemetry, 8 KB feedback), per-user rate limit (in-memory token bucket, keyed by user id: telemetry 30 requests/min, feedback 5 submissions/hour), `429` on excess.
- Context stamped **server-side**: `user_id` from auth, `received_at`, `app_version` (the `sha` from `version.json`, as `/api/version` already reads it), and the `User-Agent` header (truncated to 200 chars). The client adds only what the server can't know: `gameSlug`, `level`/state, viewport `WxH`, `sessionId`, `clientTs`.

`POST /api/games/telemetry` body: `{ sessionId, gameSlug, events: [{ seq, t, kind, level?, data? }] }`, max 100 events, `kind` ≤ 32 chars, `data` ≤ 1 KB serialised each. Returns `204`. `POST /api/games/feedback` body: `{ type: 'feedback' | 'idea', gameSlug?, level?, state?, text, viewport? }`, `text` 1 to 2000 chars after trim; returns `201 { id }`.

### D4. Storage and migrations

Two migrations in `src/db.ts` (ids follow the existing numbered scheme):

```sql
CREATE TABLE game_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  session_id  TEXT    NOT NULL,
  seq         INTEGER NOT NULL,
  game_slug   TEXT    NOT NULL,
  kind        TEXT    NOT NULL,
  level       TEXT,
  data        TEXT,              -- JSON, ≤ 1 KB
  occurred_at TEXT    NOT NULL,  -- ISO UTC, session start + t
  received_at TEXT    NOT NULL,
  app_version TEXT,
  UNIQUE (user_id, session_id, seq)
);
CREATE INDEX idx_game_events_game ON game_events(game_slug, kind, level);
CREATE INDEX idx_game_events_time ON game_events(received_at);

CREATE TABLE game_feedback (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  type        TEXT    NOT NULL CHECK (type IN ('feedback','idea')),
  game_slug   TEXT,              -- null for ideas from the home page
  level       TEXT,
  state       TEXT,              -- short free text, e.g. "game over, score 1240"
  text        TEXT    NOT NULL,
  app_version TEXT,
  user_agent  TEXT,
  viewport    TEXT,
  created_at  TEXT    NOT NULL,
  triaged_at  TEXT               -- set when a ticket was cut from it
);
CREATE INDEX idx_game_feedback_created ON game_feedback(created_at);
```

**Volume.** A 10-minute session emits ~10 to 60 events (session, level, interaction summaries, idle transitions), about 5 KB at ~100 B each. With ~10 playtesters at ~5 sessions/day: ~3k events/day, ~1 MB/day, ~90 MB for the retention window at the very top of the estimate. Even 10× that is fine for SQLite, and writes are batched in one transaction per request.

**Retention.** Raw `game_events` older than 90 days are deleted by the existing `npm run prune-sessions` path (extended) or an equivalent step in the same cron. `game_feedback` is kept indefinitely (it is small, and it is the human's words). `db:export` already snapshots all tables, so both are backed up with no change.

### D5. Viewing (shared admin plumbing)

One admin surface for both datasets, user 1 only (`requireAdmin`):

- **API**: `GET /api/admin/games/stats?game=&since=` returns per-game aggregates; `GET /api/admin/games/feedback?type=&game=&since=&untriaged=1` lists feedback; `POST /api/admin/games/feedback/:id/triage` sets `triaged_at`.
- **Aggregates** (computed on demand in SQL/JS from raw events; no summary tables at this volume): per game: sessions, distinct players, median and p90 session wall/active time, idle share, abandon rate at session end; per level: started, won, lost, abandoned, median time to finish, median time before abandoning; interaction counts by name.
- **CLI** (primary, agent friendly): `npm run admin -- games:stats [game] [--since 7d] [--json]` and `games:feedback [--type idea] [--untriaged] [--json]`, and `games:feedback-export --markdown` writing a digest (grouped by game, newest first, with context and ids) to stdout. Both documented in `docs/games/admin-cli.md`.
- **Build loop**: an agent (or the human) runs `games:feedback --untriaged --json`, reads the free text, cuts tickets in `docs/tickets/`, then marks each handled item triaged with `games:feedback-triage <id>`. Engagement stats inform which games and levels to prioritise, shown beside the feedback in the same export.
- **client-admin**: a single "Games insights" page: a table of per-game aggregates with a level drill-down, and a feedback list with a triage button. Last in the task order; skippable if the CLI suffices.

### D6. Feedback UI

- **Button placement**: a small, low-contrast "💬" icon in the corner of the in-game chrome, outside the play area and away from controls (top-right, beside the existing exit/back control; position settled per game during implementation), and a full "Send feedback" button on each game's game-over/pause screen, where players are idle and receptive. Tapping it **pauses the tracker's active-time counter** (it is not play) and opens a modal.
- **Form**: one textarea (max 2000 chars, live counter), placeholder "What do you like, dislike, or want changed?", no categories, a Send button, a one-line thanks on success. Draft preserved in memory if the request fails.
- **Suggest a game**: a card/button on `HomePage` opening the same dialog with `type: 'idea'`, no game slug, placeholder "Describe a game you'd like to play".
- **Automatic context**: user, game slug, level/state (from the tracker's current level and a short state string the game can supply), app version, UA, viewport and timestamp. Stored as in D4.
- **Shared component**: both entries use one `FeedbackDialog` with a `type` prop.

### D7. Privacy

Stored per user: `user_id` (numeric, joins to the account) on every event and feedback row, session timing, in-game events, and the feedback text. Not stored: IP address, precise location, device IDs, cookies beyond the existing session, anything outside client-games. UA is kept (truncated) on feedback only, and the app version on both. Players are trusted, logged-in playtesters; they are told once, not asked: a one-line notice on the games home page ("This is a playtest: we record play time, levels and feedback to improve the games") with a link to a short plain description of what is recorded, in line with the `meta-shell` footer pattern if one fits. No consent gate, because there is no third-party sharing and the users are known playtesters. This must be revisited (notice plus opt-out, retention review) before opening to people outside the beta.

### D8. Per-game first pass

| Game | level id | per-game events |
|---|---|---|
| Ball Merge | level key from the picker (`levels.ts`), mode | `level_start/end` (won, lost on overflow), `interaction: drop`, `merge` (count by size), `score` at game over |
| Orbital Dodger | level/config id | `level_start/end` (reached goal, crashed, out of fuel, abandoned), `interaction: launch`, `retry`; fuel left at end |
| Space Golf | course/hole index | `level_start/end` per hole, `interaction: shot` (count = strokes), stars collected, `game_over` with total strokes |
| Woodoku | none (endless) | one level `run`; `interaction: place`, `clear` (lines cleared), `undo`/`swap` if present; `score` at game over |
| Hex Block | none (endless) | as Woodoku |
| Favo | none (endless) | as Woodoku; `interaction: place`, `clear` |

Each wrapper wires 3 to 6 call sites; game logic modules (`logic.ts`) stay pure and untouched. Hooks go in the React component or scene where the user-visible events already occur (score submission is a good anchor: it already fires on game over).

## Risks / Trade-offs

- **Most of this is outside the trial scope.** The client half is useless without the server half; mitigated by the silent-failure design (D2) so it can ship first, but the human must decide on scope widening.
- **sendBeacon on iOS PWAs** is best-effort; the last 30 s of a session can be lost. Mitigated by the `visibilitychange` flush, the periodic flush, and the derived-abandonment rule.
- **Data creep.** Free-form `data` could grow. Mitigated by the 1 KB cap and a per-game `trackingSpec`.
- **Idle thresholds** (15 s active window, 5 min session timeout) are guesses; they are constants in one file, easy to tune after the first data.
- **Rate limiter is in-memory**: it resets on restart, acceptable for trusted users.

## Open Questions

1. Widen the trial scope to `src/`, `openapi.yaml`, `scripts/` and `client-admin`, or ship the client half first and do the server outside bridle?
2. Is a one-line notice enough, or do you want an explicit opt-out toggle in client-me?
3. Is the CLI + markdown export enough, or do you want the client-admin Insights page in the first pass?
4. Retention: 90 days of raw events and indefinite feedback. OK?
5. Should the feedback button also appear on the Dungeon Tactics screens (feedback only, no tracking)? It is excluded by default.
