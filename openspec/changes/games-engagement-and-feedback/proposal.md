## Why

Everyone using client-games today is a trusted playtester, but nothing tells us whether they enjoy a game, where they stall, or when they give up. Two related needs, both from the human (2026-10-02, tickets xmrt and d6a6):

1. **Engagement tracking**: per-game play events (session length, idle time, interactions, levels, abandonment) sent async to the server.
2. **Direct feedback**: a free-text feedback button in every game, plus a way to suggest new games.

Both send small authenticated records from the client to the server, store them in SQLite with the same automatic context, and are read by the human (or an agent) through the same admin plumbing. They are designed as one change so that plumbing is built once.

## What Changes

- A small shared **tracker** in `client-games` (`lib/telemetry`): session start/end, active vs idle time, abandonment, game over, plus per-game events each game declares. Batched, async, flushed with `sendBeacon` on page hide, queued in memory/localStorage when offline.
- A shared **feedback widget**: a button in the in-game chrome opening a free-text form; a separate "Suggest a game" entry on the games home page. Context is attached automatically.
- Server **ingest**: `POST /api/games/telemetry` (batched events) and `POST /api/games/feedback` (feedback or idea), sharing auth, size cap, rate limit and context stamping.
- Storage: one `game_events` table and one `game_feedback` table (one migration each in `src/db.ts`). Raw events pruned after 90 days.
- **Viewing**: admin-only aggregate endpoints, an `admin.ts` CLI (`games:stats`, `games:feedback`, `games:feedback-export`) and a minimal Insights page in `client-admin`. The CLI and a markdown export are the primary route; the admin page is optional/last.
- First-pass instrumentation of Ball Merge, Orbital Dodger, Space Golf, Woodoku, Hex Block and Favo. Dungeon Tactics is excluded.

## Capabilities

### New Capabilities

- `games-engagement-tracking`: client tracker, event model, ingest, storage, retention, privacy, per-game instrumentation
- `games-feedback`: feedback button, suggest-a-game entry, context capture, ingest, storage, moderation limits
- `games-insights-admin`: admin API, CLI and export for reading both datasets

### Modified Capabilities

None. (`games-app-shell` is unchanged; the feedback button mounts in game chrome and the home page without altering the registry or catalog requirements.)

## Trial scope

The bridle trial is limited to `client-games/` minus Dungeon Tactics (`.bridle/rules/scope.md`). This change **mostly falls outside it**:

| Part | In trial scope? |
|---|---|
| `client-games/src/lib/telemetry*`, feedback widget, per-game instrumentation, client tests | Yes |
| Ingest and admin routes, repositories, migrations, pruning (`src/`) | **No** |
| `openapi.yaml`, `llm-context.md`, `docs/games/admin-cli.md` | **No** |
| `scripts/admin.ts` CLI commands | **No** |
| `client-admin` Insights page | **No** |
| Deploy files | Not touched |

Without server work the client half has nothing to talk to. To build it the human must either widen the scope for `src/`, `openapi.yaml`, `scripts/` and `client-admin`, or have that half done outside bridle. The client tracker is written to fail silently on a 404, so the client half can ship first and start collecting once the server lands.

## Impact

- `client-games/src/lib/telemetry.ts` (+ tests), `client-games/src/components/FeedbackButton.tsx`, `FeedbackDialog.tsx`, `SuggestGameDialog.tsx`; small hooks in each of the six game components and `HomePage`/`GamePage`.
- `src/db.ts` (two migrations), `src/routes/games.ts` or new `src/routes/gameTelemetry.ts`, `src/repositories/sqlite/`, `src/routes/admin/`, `scripts/admin.ts`, `scripts/prune-sessions.ts`, `openapi.yaml`, `client-admin`.
- Not affected: Dungeon Tactics, `@repo/dungeon-engine`, Phaser loading.
