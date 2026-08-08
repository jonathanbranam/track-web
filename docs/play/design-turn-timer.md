# Play App — Turn Timer Design

> A single generalized timer primitive, reusable across very different game
> shapes: a shared "phase clock" cycling through Spirit Island's fixed round
> structure, and a per-player "chess clock" for games like Root. Supersedes
> the chess-clock-only "Turn timer" feature area in `design.md` — that
> description only covered the per-player case; this doc covers both as one
> mechanism.

## The count-up / count-down unification

Count-up-with-alert and count-down-with-alert are the same data with a
different display transform — not two features:

```
elapsed = accumulated_seconds + (running ? now - started_at : 0)

direction = 'down'                          direction = 'up'
────────────────────                        ──────────────────
display = alert_seconds - elapsed           display = elapsed
alert_seconds is BOTH the starting          alert_seconds is just the
duration and the alert trigger (at 0)       threshold; start is always 0
elapsed > alert_seconds                     elapsed > alert_seconds
  → display goes negative, red "overtime"     → red "overtime" styling
```

One row, one `alert_seconds` field (nullable — omit it entirely for a plain
stopwatch with no alert), one `direction` flag. No duplicated
duration-vs-alert fields.

## Schema

```sql
CREATE TABLE score_timers (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id             INTEGER NOT NULL REFERENCES score_games(id) ON DELETE CASCADE,
  player_id           INTEGER REFERENCES score_players(id),  -- NULL = shared/game-level clock
  label               TEXT,               -- e.g. "Spirit Phase"; NULL for a plain clock
  direction           TEXT NOT NULL DEFAULT 'up',  -- 'up' | 'down'
  alert_seconds       INTEGER,            -- NULL = no alert
  accumulated_seconds REAL NOT NULL DEFAULT 0,
  running             INTEGER NOT NULL DEFAULT 0,
  started_at          TEXT                -- wall-clock timestamp of last start; NULL while paused
);

CREATE INDEX idx_score_timers_game ON score_timers(game_id);
```

Elapsed time is always computed from `accumulated_seconds` +
`now - started_at` (while running) rather than ticked server-side — the
server only needs to persist start/stop/reset events, and each client
computes its own display locally. This avoids needing a live push channel
just to keep a number moving.

## Two usage patterns, one table

### Shared clock (Spirit Island) — `player_id IS NULL`

One row per game. "Advance phase" is: stop the current row (fold its
elapsed into nothing — it's discarded, not archived), reset
`accumulated_seconds` to 0, relabel to the next phase's name from the static
`phases` list (`design-session-setup.md`), and start it running again.

```
┌──────────────┐  advance  ┌──────────────┐  advance  ┌──────────────┐
│ Spirit Phase │──────────▶│ Fast Powers  │──────────▶│ Invader Phase│─ ...
│ 00:00 → n:nn │           │ reset to 0   │           │ reset to 0   │
└──────────────┘           └──────────────┘           └──────────────┘
```

**This intentionally does not retain a history of past phases' durations** —
each advance overwrites the same row. That's a deliberate scope cut: nobody
asked for "how long did Round 3's Invader Phase take," and keeping it simple
avoids a `score_phase_history` table nobody would query. If per-phase timing
history is wanted later, promote this to insert-a-new-row-per-phase instead
of update-in-place — the schema doesn't block it, it's just not built now.

Turn timing is explicitly **optional** per the original ask — a coop game can
run with zero `score_timers` rows and just use the phase checklist for
pacing, no clock at all.

### Chess clock (Root) — `player_id` set, one row per player

One row per player in the game. Exactly one row has `running = 1` at a time.
"Pass turn" is: stop the active player's row (freeze their
`accumulated_seconds`), start the next player's row. Each player's total
turn-time-to-date is always visible as their row's elapsed value, which
doubles as the per-player time-usage stat referenced in
`design-history-stats.md`.

```
Jon (running)  ──pass──▶  Jon (paused)      Sarah (running)
 accumulated: 4:12          accumulated: 4:12   accumulated: 3:05 → ticking
```

Direction here is normally `'up'` with no alert (a plain stopwatch per
player) — Root doesn't have an official per-turn time limit, but nothing
stops a group from setting `alert_seconds` if they want a soft "you're taking
too long" cue.

## Where timer settings come from

A game's `GameConfig` (`design-session-setup.md`) can either bake in fixed
timer defaults (Spirit Island always uses a shared clock; Root defaults to a
plain per-player stopwatch) or, for the generic "Multiplayer" config, leave
it to the host: at setup time, pick shared vs. per-player, `direction`, and
an optional `alert_seconds`. Either path produces the same `score_timers`
row shape — "configurable" just means the values come from a setup-screen
prompt instead of a static config file, nothing about the schema or runtime
behavior changes.

## Alert behavior

- Visual: display flips to a red "overtime" style once `elapsed >
  alert_seconds` (for `up`) or once the countdown crosses zero (for `down`,
  where it's the same condition).
- Audio/vibration: fire once at the crossing instant, not repeatedly.
- **Known limitation, not solved here**: iOS pauses timers when the screen
  locks (see `docs/play/planning.md` — "Timer alerts on locked phones"). This
  design doesn't attempt a fix; it's still an open investigation
  (Web Audio keep-alive vs. service-worker push).

## Pause / resume

Both patterns support pause: `running → 0`, `started_at → NULL`, elapsed
stays frozen at `accumulated_seconds`. Resume: `started_at → now`,
`running → 1`. This is the same operation whether it's a shared clock or one
player's chess-clock row.

## Open questions

- Should a game be allowed to run a shared clock *and* per-player clocks
  simultaneously (e.g. an overall game-length stopwatch alongside Root's
  per-player chess clock)? Nothing in the schema prevents multiple rows per
  game; the open question is purely whether any real game needs it yet.
- Server vs. client authority while `running`: since elapsed is computed from
  a wall-clock `started_at`, a device with a wrong clock or a long
  disconnect will drift. Acceptable for a table-side companion app; flagging
  in case it matters for cross-device chess-clock scenarios (one phone
  running the clock, another device watching).
