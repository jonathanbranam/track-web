## Games App — Planned Future Work

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
