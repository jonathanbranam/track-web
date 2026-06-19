## Context

`docs/games/design.md` specifies the games platform's tech approach (Phaser 3 primary + React shell, a `GameDefinition` registration pattern, dev port 6035, `games.branam.us`). That doc, however, assumes every game is async turn-based multiplayer (rooms, `active_player_id`, polling). This change establishes the platform with a single-player real-time game, so the registration pattern is reduced to what a client-only game needs, and the multiplayer server surface is deferred.

This change deliberately introduces **no backend**: no routes, no tables, no env vars. That keeps the first game shippable and isolates the Phaser + shell integration as the thing being proven.

## Goals / Non-Goals

**Goals**
- Stand up `client-games` as a peer of the other client workspaces, auth-gated, deployable to `games.branam.us`.
- Establish a Phaser-in-React host and a client-side game registry that scales to more casual games.
- Ship Ball Merge end-to-end: drop, stack, merge, score, lose, restart, persist best score locally.
- Keep merge/scoring/loss rules in pure, unit-testable functions separate from the Phaser scene.

**Non-Goals**
- No rooms, turns, polling, or multiplayer (the design doc's server model is untouched and deferred).
- No backend leaderboard or cross-device score sync (local best score only).
- No new shared `@repo/ui` primitives; the game canvas is self-contained.
- No isometric/tilemap work — irrelevant to a physics arcade game.

## Decisions

### Phaser 3 with Matter.js physics, mounted in a React host
A single React component (`PhaserGame`) creates the `Phaser.Game` on mount against a `<div ref>` and destroys it on unmount. Phaser's bundled **Matter.js** physics is used (not Arcade physics): circle-circle resting contacts, stacking, and restitution need a real rigid-body solver, which Arcade's AABB model does not provide. React owns everything outside the canvas (catalog, score HUD, game-over modal); the scene communicates score and game-over to React via a lightweight callback/emitter passed in at construction. This matches the design doc's "Phaser canvas + React shell" split.

### Client-side game registry, category-tagged
A `games` array (the registry) holds `{ slug, name, category: 'single-player' | 'multiplayer', mount }`. The home page maps it to catalog cards; `/game/:slug` looks it up and mounts. This is the design doc's `GameDefinition` reduced to the client-only fields a casual game needs, with a `category` field added so the catalog can host both real-time and (future) turn-based games. Multiplayer games will extend registry entries with their server hooks later — no migration needed.

### Pure game logic, separate from rendering
Merge resolution, scoring, ball-size progression, and the spawn-size distribution live in `src/games/ball-merge/logic.ts` as pure functions over plain data: `nextSize(size)`, `mergeScore(size)`, `pickSpawnSize(rng)`, and `isOverflow(bodyY, topLine, restingVelocity)`. The Phaser scene calls these; tests exercise them directly without a canvas. This satisfies the design rule to add coverage for new requirements despite Phaser being hard to unit-test in jsdom.

### Loss condition: rest above the open top
A ball "falls outside the container" when it comes to rest with its body above the container's top line. Because the container is three-sided (no lid), overflow naturally means a stack has grown past the opening or a ball was dropped and settled on the rim. Detection: a body whose top edge is above `topLine` while its speed is below a small threshold for a short grace period triggers game-over. The grace period avoids ending the game during the instant a freshly-dropped ball passes through the opening.

### Same-size merge into next size up
Each ball has a discrete `size` index (e.g. 0..N). On a Matter collision between two bodies of equal `size`, both are removed and one new body of `size + 1` is created at the contact midpoint, awarding `mergeScore(size)` points. The largest size does not merge further (or merges into a "cleared" pop — MVP: it simply stops merging). Spawn sizes are drawn from only the smaller few sizes so larger balls are earned, not dropped.

### No backend; best score in localStorage
Single-player and offline-friendly. `localStorage['ball-merge:best']` holds the high score. This avoids the full weight of the platform's data model and CLI/openapi obligations for a casual game. A server-side leaderboard is future work, recorded in `docs/games/planning.md`.

## Risks / Trade-offs

- **Physics tuning is empirical.** Gravity, restitution, friction, and the merge-spawn impulse need hand-tuning for a satisfying feel; the spec fixes rules, not constants. Mitigation: constants centralized in one config object in the scene.
- **Phaser bundle size.** Phaser 3 is ~1MB gzipped. Acceptable for a games PWA; code-split so the catalog/shell loads without pulling Phaser until a game opens.
- **Merge race conditions.** Two simultaneous same-size collisions touching a shared ball could double-merge. Mitigation: mark bodies "consumed" synchronously in the collision handler and ignore already-consumed bodies.
- **jsdom can't run Phaser/canvas.** Scene behavior is verified manually (and via Playwright screenshot) rather than unit-tested; only the extracted pure logic is unit-tested. Accepted.

## Migration Plan

Additive only. New workspace and deploy entries; no existing app, route, schema, or build output changes behavior. `npm install` picks up the new workspace and `phaser` dependency. No data migration.

## Open Questions

- **Largest-ball behavior** — does the top size pop-and-clear (granting bonus points and freeing space) or simply persist? MVP persists; pop-and-clear is a fast follow.
- **Container shape** — fixed three straight walls for MVP. A rounded/funnel base is a feel tweak left to implementation tuning.
- **Server leaderboard** — deferred; when added it reuses the shared auth session and would introduce the first `/api/games/*` route and a `game_scores` table.
