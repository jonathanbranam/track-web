## Context

See `proposal.md` — Why. The state that shapes this design:

- `client-games/src/games/dungeon-tactics-solo/` holds ~28 files. The rules are
  already Phaser-free and operate on plain serializable data: `GameState` is a
  struct, and every rules function is `(state, …) => GameState`.
- Two modules are not portable. `defStore.ts` calls `fetchUnitDefs` /
  `fetchScenarioUnitDefs` from `client-games/src/api.ts` and reads/writes a
  `localStorage` active-scenario pointer; `contentStore.ts` calls
  `fetchDefaultContent` / `fetchMapWithEncounters`. Nothing else in the movable
  set touches a browser global.
- Both stores are **module-level singletons**: one board and one unit-def table
  per process. The rules read them by import (`turn.ts` 5 reads, `npc.ts` 21,
  `pc.ts` 7, `pathfinding.ts` 4) rather than by argument.
- `packages/{auth,config,ui}` establish the house style for a workspace
  package: `private`, `type: module`, `main: ./src/index.ts`, **no build step** —
  consumers compile the TypeScript themselves.
- The consumer that motivates this lives in a *different repo* checked out
  beside this one, and runs its server on `tsx` and its client on Vite.

## Goals / Non-Goals

**Goals:**

- One implementation of the rules, importable by a browser host and a Node host.
- A cut line that survives the harness rebuild: the engine owns rules and
  in-memory state, hosts own I/O.
- A move that is provably behavior-preserving — existing tests pass with only
  import paths changed.

**Non-Goals:**

- Any change to how the rules behave, or to the shape of `GameState`.
- Instance-scoping the stores (see Risks).
- Publishing the package, or adding a build/bundling step.
- Anything in the harness repo.

## Decisions

### Package shape: source-only `@repo/dungeon-engine`, public surface via a barrel

`packages/dungeon-engine/package.json` mirrors `@repo/auth` exactly — `private`,
`type: module`, `main`/`exports` pointing at `./src/index.ts`, no `build` script,
no dependencies. `src/index.ts` re-exports the intended public surface (types,
turn/PC/NPC resolution, queries, store getters and appliers); tests inside the
package may import modules directly.

*Alternative — compile to `dist/`:* rejected. No other package here does it, and
both consumers already compile TypeScript from source (Vite in the clients,
`tsx` in the harness server). A build step would add a rebuild-on-every-edit
loop to a tool whose entire value is immediacy.

### The cut line: rules and in-memory state move; rendering, UI, and map-editor logic stay

Moves: `types`, `turn`, `pc`, `npc`, `pathfinding`, `attackFootprint`,
`unitDefs`, `bundledMap`, `contentTypes`, and the pure halves of `defStore` and
`contentStore` — with their tests (`attackFootprint`, `contentStore`, `defStore`,
`npc`, `placement`, `undo`, `unitDefs`).

Stays: `DungeonTacticsScene`, `EditorScene`, `boardRender` (Phaser);
`DungeonTacticsGame`, `ScenarioEditor`, `MapSelectDialog`, `hud/` (React);
`features/` (the Gherkin suite, which tests the game as assembled); and
`editorModel` + `mapBounds`.

`editorModel`/`mapBounds` are the judgment call: they are map-*editing* logic
used by the studio, not rules the engine consults, and the harness generates its
own boards rather than importing track-web's. If the map editor later moves into
the harness, they move then — as their own change, with their own reasons.

### The store split: the package applies, the host loads

`defStore` and `contentStore` each divide in two.

**In the package** — everything that is state or a pure transform: the module-level
store, `getDef`/`getMaxHp`/`getMoveRange`/`getAllDefs`, `setDef`/`setMaxHp`/
`setMoveRange`, `clampDef`, `withMinRange`/`withMaxRange`, `diffDefs`,
`applyLoaded`, `reset`; and `deserialize`, `gridCols`/`gridRows`/`boardCells`
and the spawn-zone getters.

**In `client-games`** — new `defStoreLoader.ts` and `contentStoreLoader.ts`
holding `loadFromServer`, `loadScenario`, the `localStorage` active-scenario
pointer, and the `loadedScenario`/`loadedMap` bookkeeping that only a loading
host needs. They import the package; the package never imports them.

*Alternative — inject an I/O port:* have the package define a fetcher interface
that each host implements, keeping `loadFromServer` inside the engine. Rejected:
it preserves a load *lifecycle* in a module that should not have one, and it
would force the harness to implement a fetcher it has no use for — the harness
constructs boards locally and applies them directly.

### Singletons are preserved as-is

The move does not thread a context argument through the rules. Keeping the
singletons makes this change a mechanical move that existing tests can police,
and the harness's first phases are single-board by design.

*Alternative — instance-scope now:* rejected for this change. It touches every
rules call site and every test simultaneously, which is exactly the kind of
"refactor plus behavior risk in one step" that makes a move unreviewable. It
becomes necessary when multiple boards must coexist in one process; that is a
later change, called out in the harness's phase plan.

### Test strategy

- Moved tests come along unchanged except for import paths, and must pass.
- The split stores' tests split with them: assertions about applying, clamping,
  diffing, and reading stay in the package; assertions about fetching, falling
  back, and remembering the active scenario move to the host loaders' tests.
- **New:** a node-environment test in `packages/dungeon-engine` that imports the
  barrel, builds a board, places units, and resolves a full round — the standing
  guard for the "runs in a Node host" requirement. It fails if anyone
  reintroduces a browser global.
- Root `vitest.config.mts` gains `packages/dungeon-engine/src/**/*.test.ts`.
  `vitest.dungeon-tactics.config.mts` needs no include change (the `.feature`
  files stay put), but its step definitions get new imports.

## Risks / Trade-offs

- **Silent behavior drift while moving code** → No logic edits in the same
  change. The success criterion is that `npm test`, `npm run test:dungeon-tactics`,
  and `npm run build:games` all pass with only import paths altered.

- **The scenario-selection pointer changes hands** → `localStorage` handling moves
  verbatim into `defStoreLoader.ts`; `defStore.test.ts` and
  `unitDesignerPersistence.test.ts` split along the same line so both halves stay
  covered.

- **Process-global stores in a long-lived server** → The harness server keeps one
  agent session per login in a single process, so a module-level def table is
  shared by every session in it. Acceptable for a single-user POC; it becomes
  wrong the moment the harness serves two designers or two boards, and
  instance-scoping is the known remedy.

- **Cross-repo TypeScript consumption is unproven** → The harness will depend on
  this package by relative `file:` path, which means its Vite dev server must be
  allowed to serve files outside its own root and its `tsc`/`tsx` must accept
  sources from outside the project directory. This change does not prove that
  out; the harness-side change does, and if it turns out to need a build step
  after all, that is a change to this package's `package.json` and nothing else.

- **A future contributor re-adds a fetch to the engine** → The node-environment
  test is the tripwire, and the requirement it enforces is written down in the
  spec rather than left as folklore.

## Migration Plan

Single change, no runtime migration: nothing is deployed differently, no data
moves, no API changes. Verification is `npm test`, `npm run test:dungeon-tactics`,
`npm run build:games`, and a manual pass through the game and both studio editors
(map editor, unit designer) confirming they behave as before. Rollback is
reverting the change.
