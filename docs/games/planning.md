## Games App — Planned Future Work

- **Server-side leaderboard.** Single-player games (Ball Merge first) currently persist only a local best score in `localStorage`. A `/api/games/*` route plus a `game_scores` table (reusing the shared auth session) would enable cross-device high scores and per-game leaderboards.

- **Ball Merge — largest-ball pop-and-clear.** When two max-size balls meet, pop them for bonus points and free up space, instead of leaving them inert.

- **More casual single-player games.** The Phaser + registry shell supports any real-time game; add a few more small arcade games before tackling multiplayer infrastructure.

- **Isometric rendering.** After first game ships: upgrade from flat top-down to isometric (FF Tactics perspective) using Phaser's depth-sorting. Requires new tile art and sprite anchoring; game logic unchanged.

- **Procedural map generation.** Simplex noise → terrain height → biome for Mini Conquest. Makes every game different with ~100 lines of map generation code.

- **Fog of war.** Server strips invisible cells before returning state. Client renders an unexplored-tile overlay in Phaser. Needs a per-player `explored` bitmask in game state.

- **Animation polish.** Move tweens and attack flash between poll responses. Phaser interpolates unit positions; React HUD shows floating damage numbers.

- **Push notification on your turn.** PWA badge or notification via service worker when the active player shifts to you. Same deferred problem as the play app's timers.

- **Mobile layout.** Compact HUD for small screens. Pinch-to-zoom + tap-to-select already work in Phaser; the React overlay needs a responsive variant.

- **Dungeon Crawl (co-op).** Server-side monster AI acting between player turns. Good test of the initiative queue model without PvP pressure.

- **Spectator mode.** Full-map view with all fog stripped, read-only. Cheap with the polling model.

- **Long-poll upgrade.** Replace 3s short-poll with held long-poll (timeout ~8s, respond on state change). Reduces turn latency without WebSockets.

- **Replay viewer.** Walk through `game_moves` log to replay a completed game. Useful for post-game analysis and debugging.

- **Orbital Dodger — difficulty tiers.** The scores API keys on a `level`, and the planet-count knob is effectively a difficulty setting, but the game ships a single `level = 'classic'` so every run shares one leaderboard. Adding tiers (e.g. 3 / 5 / 7 planets) is purely new `level` values plus a pre-game picker — no API or schema change. Note that the fixed `400 × 720` field size is baked into every recorded score; if the field is ever resized, give it a new `level` rather than silently re-ranking history.

- **Orbital Dodger — leaderboard integrity under custom configs.** Since tuning configs shipped to production (`orbital-dodger-tuning-configs`), any player can play — or save over the Default — with e.g. gravity 0 or a huge fuel tank and still submit to the single `classic` leaderboard. Options: only submit when the values in play equal the Default's saved values (simplest; the panel already computes this comparison), or key `level` by config so each config gets its own board. Saving over the Default should then probably also reset or version its board, since its scores were earned under different physics.

- **Orbital Dodger — proximity-scaled star bonus.** Stars currently award a flat bonus wherever they sit, which can pull a player away from the close orbits the continuous scoring is designed to reward. Scaling the star bonus by proximity (the way the continuous rate already is) would make every point source push toward the same risky flying.

- **Orbital Dodger levels — deferred from `orbital-dodger-levels`.**
  - *Completion scoring.* Level Complete ends the run with the score as accrued; there is no completion bonus or leftover-fuel conversion yet, so a fast clear is not rewarded over a slow one.
  - *Leaderboard versioning on save-over.* A level's `level-<id>` board mixes scores from before and after its geometry was saved over. Version the board (e.g. `level-<id>-v<n>`) or reset it on save-over.
  - *Level ↔ config binding.* Levels are played under whatever config the browser has selected. A level may want to pin a config so its board is comparable.
  - *Per-level initial velocity.* Every start is at rest (or on a ring). The v1 layout document can gain an optional start velocity without a DB migration (`v: 2`, migrated on read).
  - *Editor undo/redo*, plus multi-select, snapping and copy/paste.

- **Orbital Dodger — sound, haptics, and motion controls.** None are wired up. Tilt/shake already exist for Ball Merge (`ball-merge-tilt-shake`) and the same `DeviceMotionEvent` plumbing would transfer; note the secure-context limitation when testing over a plain-HTTP LAN IP.
