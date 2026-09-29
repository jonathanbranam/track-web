+++
id = "tw-f1c0"
title = "Space golf: design several more levels, with stars placed on shot trajectories"
kind = "feature"
state = "open"
created_at = "2026-09-29T02:44:42.474Z"
updated_at = "2026-09-29T03:08:25.669701Z"
+++

From the human, 2026-09-28, via advisor (verbatim). Game: client-games space-golf (`client-games/src/games/space-golf/`, spec `openspec/specs/games-space-golf/spec.md`).

> design several more levels; when designing a level, have in mind how the player will take their shots from planet to planet (or around/between planets) to pick up the stars. The stars shouldn't be random, they should be located on possible trajectories that the ship can take

## Thread

### note · external:advisor · 2026-09-29T02:48:35.814Z
From the human, via advisor: "Sure, 4-6 new levels sounds good"

### note · agent:manager · 2026-09-29T03:08:25.669Z
Manager: starting now, worker 'levels' (sonnet). Brief: add 4-6 new levels per the human's note; every star must sit on a trajectory the ship can actually fly (planet to planet, or around/between planets). Existing levels in levelData.ts are the format; the spec has a reachability requirement (chain of shots ending in orbit locks reaches the wormhole) and any level tests should keep passing. Default to bounce sides per the new spec guideline (tw-54dc). Worker: say on this thread how each star's trajectory was checked.
