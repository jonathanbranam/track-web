## Play App — Planned Future Work

- **Score tracker: leaderboard / standings.** The score-tracker persists completed games (players, per-round scores, timestamps) but intentionally ships **no** aggregation. A follow-up change can add cross-game leaderboards, win rates, and head-to-head records on top of the existing `score_*` tables. See `design-history-stats.md` — the `role`/`outcome` fields this aggregation would read are being added now even though the dashboard itself isn't.

- **Score tracker: mid-game player edits.** Players are fixed once the first round is entered (editable only via "Edit setup" before scoring, which starts a fresh game). A follow-up could allow adding/removing/reordering players within a live game.

- **Offline / crash-safe scoring.** Persist active session state to `localStorage` so a page reload or network drop doesn't lose in-progress scores. Sync to the server on reconnect.

- **Timer alerts on locked phones.** Current browser timers pause when the screen sleeps. Investigate Web Audio API keep-alive or a service-worker push approach for reliable chess-clock alerts. Called out as an explicit known limitation, not solved, in `design-turn-timer.md`.

- **Role reveal screen.** For Secret Hitler and Avalon, a per-device private role reveal so each player sees their own role on their own phone without others seeing. Likely needs a per-session join link or QR code.

- **Game catalog management UI.** Game configs (`roleLabel`, `setupFields`, `timer` defaults, `phases`) are static client-side data (`gameDefaults.ts` / `GameConfig`, see `design-session-setup.md`), deliberately not backend-stored — no one's asked for an admin screen yet. An in-app editor for these would require moving configs to a backend-stored template table first.

- **Statistics dashboard.** Aggregated win rates, score trends, and head-to-head records across sessions. Especially useful for games played often (Root, One Night). `design-history-stats.md` scopes the current pass to raw data capture (`role`, `outcome`) only — this dashboard is the deferred aggregation layer on top.

- **Export session.** Simple shareable summary of a completed session — who played what, scores, and winners — as a plain-text or image format for posting to group chats.
