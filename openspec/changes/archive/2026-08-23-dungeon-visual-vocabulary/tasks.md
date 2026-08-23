## 1. The vocabulary module (engine)

- [x] 1.1 Add `packages/dungeon-engine/src/palette.ts` exporting exactly what
      `design.md` §2 lists, with the values given there. **Every value is the
      game's present value** — read it off `boardRender.ts` and
      `DungeonTacticsScene.ts` rather than from design.md alone, and say so in
      the report if any disagrees.
- [x] 1.2 No import of Phaser, React, or any DOM type in that file. It is data
      plus the `css()` helper and `pipHeightRatio()`; nothing in it draws.
- [x] 1.3 `css(color)` zero-pads to six hex digits — `css(0x00ff88)` is
      `'#00ff88'`.
- [x] 1.4 `trianglePoints(r)` returns `[[0, -r], [0.87r, 0.7r], [-0.87r, 0.7r]]`
      — the proportions `renderNpc` uses today. Have `renderNpc` call it (task
      3.3) rather than keeping the literals.
- [x] 1.4a `pipHeightRatio(maxHp)` is
      `min(maxHeightRatio, (maxColumnRatio - (maxHp - 1) * gapRatio) / maxHp)`,
      per design.md §2.
- [x] 1.5 Add `SOLICITED_SIDES` and `solicitedSides(phase)` to `palette.ts`, per
      design.md §3. It is a `Record<TurnPhase, UnitKind[]>`, **not** a switch, so
      a new phase fails to compile until it is answered for. Carry the comment
      given there — including why it lives in this module and that it decides
      nothing.
- [x] 1.6 Add `outlineRole({ phase, side, seats })` to `palette.ts`, returning
      `'live'` exactly when the phase solicits that side and `seats` includes it.
- [x] 1.7 Export the new surface from `packages/dungeon-engine/src/index.ts`, in
      its own commented section matching the file's existing style.
- [x] 1.8 Add the `"./palette": "./src/palette.ts"` subpath to
      `packages/dungeon-engine/package.json`'s `exports`, per design.md §7. Keep
      `"."` as it is.
- [x] 1.9 **`palette.ts` must import only types.** Verify this by reading its
      import list when you are done: a runtime import here would drag engine state
      into a browser bundle through the subpath, and that is the whole reason the
      phase table is in this file. Say so in your report if you could not hold it.

## 2. Engine tests

- [x] 2.1 Add `packages/dungeon-engine/src/palette.test.ts` covering: `css()`
      zero-padding; that `pipHeightRatio(3) * 80 === 10` and
      `pipHeightRatio(5) * 80 === 7` (the game's present pixels — this is the
      test that says the extraction changed nothing); and `outlineRole` over the
      full matrix in design.md §3, both `seats` values.
- [x] 2.2 Extend `packages/dungeon-engine/src/nodeHost.test.ts` to read the
      vocabulary through the package barrel, so the standing "no browser global,
      no renderer" guard covers it too.
- [x] 2.3 Assert `SOLICITED_SIDES` covers every `TurnPhase` — a test that reads
      the table's keys, so the failure is a named one rather than only a compile
      error.

## 3. The game's adoption (client-games)

- [x] 3.1 `boardRender.ts`: `TERRAIN_COLORS`, `STRUCTURE_COLOR`, `TOWER_COLOR`,
      the white cross colour, and the two structure-pip fills come from the
      palette. Delete the local constants. `TERRAIN_COLORS` is re-exported from
      here today — check for importers before removing the name, and keep a
      re-export if anything outside depends on it.
- [x] 3.2 `boardRender.ts`: structure pip geometry becomes ratio-derived from
      `PIP` and `pipHeightRatio(maxHp)` against `TILE_SIZE`, replacing the
      `pipW`/`pipH`/`pipGap` literals and the `isTower ? 7 : 10` special case.
      **The rendered pixels must not move** — that is what task 2.1's test is for.
- [x] 3.3 `DungeonTacticsScene.ts`: `UNIT_COLORS` and the overlay colours in
      `drawHighlights` come from the palette. Delete the local tables.
- [x] 3.4 `DungeonTacticsScene.ts`: `drawHpPips` takes its geometry from `PIP`
      and `pipHeightRatio`, same constraint as 3.2.
- [x] 3.5 Draw the archetype initial on every unit token, from `UNIT_INITIAL`,
      white and centred on the token. The existing turn-order label sits at the
      upper left — leave it where it is and check the two do not overlap.
- [x] 3.6 Replace `PC_STROKE` / `NPC_STROKE` / `PC_SELECT_STROKE` with the
      live/idle rule: `outlineRole({ phase: state.phase, side: unit.kind, seats:
      ['pc'] })` picks `OUTLINE.live` or `OUTLINE.idle`. Hoist the host's seats
      to a named module constant with a one-line comment saying the game seats the
      player only — an inline array literal at the call site is where the next
      reader stops understanding why.
- [x] 3.7 A selected unit takes the two-ring mark instead of its live/idle
      outline: `OUTLINE.selected` inside `OUTLINE.selectedBacking`. Widths are the
      game's own choice (design.md §4); pick what reads on an 80px tile.
- [x] 3.8 Leave the spawner, projectile, flash and area colours where they are.
      They are the game's own presentation, and moving them is out of scope.

## 4. Verify and hand back

- [x] 4.1 `npm test` from the repo root. Paste failures verbatim.
- [x] 4.2 `npm run build -w client-games` (its `build` is `tsc -b && vite build`,
      so this is the typecheck).
- [x] 4.3 Report: what changed file by file; exact test output; every test you
      changed and why, distinguishing "fixture needed updating" from "this
      asserted behaviour that no longer exists"; and anything in the plan that
      turned out wrong, impossible or ambiguous — plainly, not worked around
      silently.
- [x] 4.4 **Do not commit and do not archive.** The driver verifies in a browser
      and presents to the designer; archiving is the designer's call alone.
