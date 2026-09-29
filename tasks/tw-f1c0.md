+++
id = "tw-f1c0"
title = "Space golf: design several more levels, with stars placed on shot trajectories"
kind = "feature"
state = "integrated"
created_at = "2026-09-29T02:44:42.474Z"
updated_at = "2026-09-29T03:19:42.314125Z"
branch = "bridle/levels"
commit = "b2f134f"
summary = "Five new levels (Slalom, Crosswind, The Seam, Grand Central, Gauntlet), bounce sides except The Seam (wrap). Stars sit on flights found with the game's own simulateShot; solver.ts starWitnesses and levels.test.ts assert every new star is collectable. Spec updated (>=9 levels). Old four levels are not covered by the star-witness test."
+++

From the human, 2026-09-28, via advisor (verbatim). Game: client-games space-golf (`client-games/src/games/space-golf/`, spec `openspec/specs/games-space-golf/spec.md`).

> design several more levels; when designing a level, have in mind how the player will take their shots from planet to planet (or around/between planets) to pick up the stars. The stars shouldn't be random, they should be located on possible trajectories that the ship can take

## Thread

### note · external:advisor · 2026-09-29T02:48:35.814Z
From the human, via advisor: "Sure, 4-6 new levels sounds good"

### note · agent:manager · 2026-09-29T03:08:25.669Z
Manager: starting now, worker 'levels' (sonnet). Brief: add 4-6 new levels per the human's note; every star must sit on a trajectory the ship can actually fly (planet to planet, or around/between planets). Existing levels in levelData.ts are the format; the spec has a reachability requirement (chain of shots ending in orbit locks reaches the wormhole) and any level tests should keep passing. Default to bounce sides per the new spec guideline (tw-54dc). Worker: say on this thread how each star's trajectory was checked.

### note · agent:levels · 2026-09-29T03:19:35.253Z
Added 5 levels (Slalom, Crosswind, The Seam, Grand Central, Gauntlet); bounce sides except The Seam (wrap, stars sit on the seam). Star method: with a throwaway sampler using the game's simulateShot, I swept release angle x power from each planet, kept flights that lock on the next planet (or reach the wormhole) with under 5 hull lost, and put stars at points along a straight-ish and a wide-arc flight of each hop (arcs around/between planets). Check that stays: solver.ts starWitnesses BFS-es lies reachable by locking shots and, per star, finds a shot (lie, angle, power) whose simulateShot flight passes through it and survives to a lock/wormhole; levels.test.ts asserts every star of the 5 new levels has one (72 angles x 12 powers). Reachability test covers all levels. Spec updated (star placement, collectable scenario, >=9 levels). Caveat: the old four levels are not covered by the star-witness test.

### note · agent:manager · 2026-09-29T03:19:42.314Z
integrated: b2f134f (branch bridle/levels)
