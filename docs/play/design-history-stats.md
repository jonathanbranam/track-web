# Play App — History & Statistics Design

> Scopes "save history so we can go back and view games played and
> statistics about win/loss" against what's already flagged as future work in
> `planning.md`. This doc draws the line between what the setup/timer/scoring
> additions must capture *now* so nothing is lost, versus aggregate
> dashboards that stay deferred.

## Already true today

`score_games` rows are never deleted on completion — the existing `ListView`
in `ScorePage.tsx` already lists completed games as history. That doesn't
change. What changes is how much a completed row can tell you.

## In scope for this pass

Every field added in `design-session-setup.md` and `design-turn-timer.md`
is already persisted (not computed/derived), so history is a read of
existing rows, not a new capture mechanism:

- **Roles** (`score_players.role`) — "Jon played Lightning's Swift Strike" /
  "Jon played Marquise de Cat," shown in the history detail view.
- **Setup meta** (`score_games.meta`) — "Root · Autumn map · Tower,
  Marketplace."
- **Outcome** (`score_games.outcome`) — coop win/loss badge in the history
  list, alongside the existing winner-by-total for competitive games.
- **Per-player time usage** — a chess-clock game's final per-player
  `score_timers.accumulated_seconds` (frozen once the game is completed,
  since nothing is running anymore) becomes "Jon: 42:10, Sarah: 38:55" in the
  completed-game detail view.

The **history list and per-game detail view need to grow** to surface this
(role/meta/outcome/time-usage weren't fields before), but that's a UI
extension of `ScorePage.tsx`'s existing `HistoryRow`/`ResultsView`, not a new
subsystem.

## Explicitly deferred (unchanged from `planning.md`)

- **Aggregate win-rate / leaderboard stats** ("Jon wins 60% as Vagabond,"
  head-to-head records) — already tracked as
  "Score tracker: leaderboard / standings" and "Statistics dashboard" in
  `planning.md`. This pass ensures the raw fields those aggregates would
  read (`role`, `outcome`, round totals) exist and are populated, so that
  future work isn't blocked on a schema migration — it just isn't building
  the dashboard itself.
- **Per-phase timing history** — per `design-turn-timer.md`, the shared
  clock overwrites its row on each phase advance rather than archiving past
  phases. So "how long did the Invader Phase take across our games" is
  **not** answerable from this design. Flagging clearly so it's a known
  scope cut rather than an oversight — if per-phase duration stats turn out
  to matter, the shared-clock table needs to switch from update-in-place to
  insert-per-phase.

## Open questions

- Does the history list need a way to filter/group by role or faction (e.g.
  "show me all games where I played Vagabond") in this pass, or is
  chronological history with per-game detail enough for now, leaving
  filtering to the deferred statistics work?
- Guest players (non-`user_id` names) accumulate history under a bare name
  string today, with no retroactive-linking mechanism (that was a
  `design.md` idea that was never built for the shipped score tracker). Does
  win/loss-by-faction stats need guest identity resolved, or is per-session
  name matching good enough until/unless that's built?
