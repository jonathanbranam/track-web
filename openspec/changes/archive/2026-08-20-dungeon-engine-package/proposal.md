> # ✅ IMPLEMENTED — awaiting archive
>
> All 27 tasks in `tasks.md` are complete; the extraction landed in commit
> `bd226c6` and `packages/dungeon-engine` is in use by both `client-games` and
> the sibling `pi/harness` dungeon bench.
>
> **This change directory is still open only as tracking debt.** Its delta spec
> has not been synced to `openspec/specs/dungeon-engine-package/` and it has not
> been moved to `openspec/changes/archive/`. Nothing here is work outstanding —
> archive it and the record is correct.
>
> Note that the action surface described in the harness repo's
> `docs/dungeon-harness/harness-rebuild/action-surface-plan.md` landed *after*
> this extraction and added `actions.ts` to the package; see the archived
> `2026-08-19-dungeon-engine-action-surface`.

## Why

The dungeon harness (a separate sibling repo) is being rebuilt so that a
designer can set up a board and play it through by hand against the **real**
game rules. The previous harness effort was stopped precisely because the
rules got re-implemented and then re-remembered outside the engine, and the
board drifted from the game. The fix is structural: **one implementation of
the rules, imported by both hosts.**

Today those rules are app-private modules inside `client-games/src/games/
dungeon-tactics-solo/`, and two of them (`defStore.ts`, `contentStore.ts`)
reach directly for browser `fetch` and `localStorage` — so a Node host cannot
import them at all.

## What Changes

- **New workspace package `packages/dungeon-engine` (`@repo/dungeon-engine`)**,
  source-only (`main: ./src/index.ts`, no build step), matching the existing
  `packages/{auth,config,ui}` convention.
- **Move the Phaser-free rules modules into it**, with their tests:
  `types`, `turn`, `pc`, `npc`, `pathfinding`, `attackFootprint`,
  `unitDefs`, `bundledMap`, `contentTypes`, plus the **pure halves** of
  `defStore` and `contentStore` (in-memory state, getters, setters,
  `applyLoaded`, `deserialize`, `clampDef`, `diffDefs`, `reset`).
- **Split loading out of the stores.** `loadFromServer`, `loadScenario`, and
  the `localStorage` active-scenario pointer move to new host-side loader
  modules in `client-games`. The package holds rules and in-memory state; the
  host supplies I/O. This is what makes the package importable from Node.
- **Update importers** in `client-games` — the Phaser scenes, the studio
  pages (map editor, unit designer), the unit tests, and the Gherkin step
  definitions — to import from `@repo/dungeon-engine`.
- **Wire the workspace**: root `package.json` `workspaces`, root
  `vitest.config.mts` `include`, and `client-games`'s dependency list.
- A **node-environment test inside the package** that imports the barrel and
  plays a turn, proving the package carries no browser-only dependency.

Phaser-coupled code (`DungeonTacticsScene`, `EditorScene`, `boardRender`),
the React UI, `editorModel`/`mapBounds` (map-editor logic), and the
`features/` Gherkin suite all stay in `client-games`.

**Not in scope**, deliberately:

- **No behavior change.** The game must play identically; this is a move plus
  a seam.
- **No instance-scoping.** `defStore`/`contentStore` stay module-level
  singletons (one board, one def table per process). The harness's first
  phases are single-board and do not need more; multi-board would.
- **No harness-side work.** Consuming the package from the sibling repo is a
  separate change over there.

## Capabilities

### New Capabilities

- `dungeon-engine-package`: the dungeon-tactics rules engine is distributed
  as a shared workspace package that runs in both a browser host and a Node
  host, with all I/O (server fetch, browser storage) supplied by the host
  rather than performed by the engine.

### Modified Capabilities

None. Existing dungeon-tactics specs describe behavior that is unchanged by
this move — including `dungeon-tactics-content-store`'s "the engine reads
board content only through the content store", which stays true when the
store lives in a package.

## Impact

- **Code**: `client-games/src/games/dungeon-tactics-solo/` (11 modules and 7
  test files move out; scenes, HUD, and editors stay and get new import
  paths), `client-games/src/studio/` (4 files), new
  `packages/dungeon-engine/`.
- **Build/test wiring**: root `package.json` (`workspaces`), root
  `vitest.config.mts` (`include`), `client-games/package.json`
  (`@repo/dungeon-engine` dependency).
  `vitest.dungeon-tactics.config.mts` needs no include change — the
  `.feature` files stay put — but its step definitions get new imports.
- **No API, route, database, or deploy impact**: no new client app, so no
  `Caddyfile`, `server-deploy.sh`, or `dev-local.sh` changes; no
  `openapi.yaml` or `llm-context.md` changes.
- **Downstream**: unblocks phase 1 of the harness rebuild
  (`harness:docs/dungeon-harness/harness-rebuild/phase-plan.md`).
