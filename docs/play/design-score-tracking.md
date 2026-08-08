# Play App — Score Tracking Design

> Clarifies how the shipped round-based score tracker (`score_games` /
> `score_players` / `score_round_scores`, `client-play/src/pages/ScorePage.tsx`)
> integrates with roles, setup meta, and turn timers rather than needing a
> parallel mechanism for "different kinds" of games. The scoring mechanism
> itself is not changing — this is about which games use it and how a winner
> is derived.

## Three shapes turn out to be two

Going in, it looked like there might be three distinct game shapes needing
different result-tracking:

1. Round-scored competitive (Sushi Go) — **already built**.
2. Rank/role competitive (Root) — assumed to need something new.
3. Cooperative team (Spirit Island) — assumed to need something new.

Root, on inspection, doesn't need a new mechanism. Root's victory points are
tracked per-round exactly like Sushi Go — the existing `score_round_scores`
table and `Scoreboard` totals-and-winner logic in `ScorePage.tsx` apply
unchanged. Root only adds:

- a `role` per player (`design-session-setup.md`) — the chosen faction,
- `meta` on the game (`design-session-setup.md`) — map/landmarks/hirelings,
- a per-player chess clock (`design-turn-timer.md`).

None of those three touch scoring. **Winner is still "highest round total,"
same code path as Sushi Go.**

Spirit Island is the genuinely different case: there is no per-player score
at all — the whole table wins or loses together against the Invader deck.
That's the one case needing a new field.

## Winner / outcome representation

```
Competitive (Sushi Go, Root, ...)     Cooperative (Spirit Island, ...)
──────────────────────────────        ─────────────────────────────────
score_games.outcome = NULL            score_games.outcome = 'win' | 'loss'
winner derived from                   no per-player score; every player's
  MAX(sum(score_round_scores))          "result" is the shared outcome
  same as today
```

`score_games.outcome` (added in `design-session-setup.md`) is only ever set
for games with no meaningful per-player score. Competitive games leave it
`NULL` and keep deriving the winner the way `ScorePage.tsx` already does.
There's no `rank` column needed on `score_players` — competitive rank is
always derivable from `score_round_scores` totals, and cooperative games
have no individual rank to store.

## Setup screen implications

For games with `roleChoices`/`setupFields` but no `phases`/coop timer (i.e.
Root-shaped configs), the existing round-entry flow in `PlayView` /
`RoundEntry` is unchanged — the only additions are displaying each player's
`role` next to their name in the `Scoreboard`, and a completion step that
also asks for chess-clock totals (already recorded live via
`score_timers`, not re-entered).

For coop-shaped configs (`phases` present, no `rounds`), the "round entry"
UI doesn't apply at all — completion is instead "did the Spirit board win or
lose," setting `outcome` directly. This is a different completion flow, not
a different scoring mechanism layered onto rounds.

## Open questions

- Should a future game exist that's *both* round-scored *and* has a team
  outcome (e.g. a game where individual score matters but there's also a
  shared win/loss condition against the game itself)? Not needed by Spirit
  Island or Root today — `outcome` and round-derived-winner can coexist on
  the same row without conflict if that ever comes up, so no schema change
  would be required.
