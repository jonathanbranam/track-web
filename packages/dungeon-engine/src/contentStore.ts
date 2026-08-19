import type { Cell } from './types'
import type { ContentMap } from './contentTypes'
import { BUNDLED_MAP } from './bundledMap'

// The single in-memory source of truth the engine reads board content from —
// the board grid, its dimensions, tile objects, and the enemy/player spawn
// zones. It mirrors `defStore` (which holds unit stats): it seeds itself from
// the bundled `BUNDLED_MAP` so the engine has a playable board the moment it is
// imported, with no I/O of any kind. A host supplies a real board by calling
// `applyMap()` with a Map it fetched (or built) itself; if the host's load fails
// the bundled map stays in place so the game remains playable. The engine
// (`npc.ts`, `pc.ts`, `pathfinding.ts`, `turn.ts`, and the rendering host) reads
// board content only through the getters here — the bundled tree is the
// fallback seed.
//
// Fetching a Map and deciding which one is active belong to the host (see
// `contentStoreLoader.ts` in the game client), not to this module.

export interface ActiveContent {
  cols: number
  rows: number
  // Deserialized board: terrain with destructible structures overlaid.
  cells: Cell[][]
  // Player-placeable tiles as "col,row" keys (reproduces the old spawnZoneTiles()).
  playerSpawnZone: Set<string>
  // Enemy spawner tiles.
  enemySpawners: Array<{ col: number; row: number }>
}

// Rebuild the engine's runtime board from the persisted Map shape: overlay
// `objects` onto the terrain grid — an object *with* `hp` becomes a destructible
// structure cell (HP + kind); one *without* leaves the cell non-structural
// (today's board has no inert objects, and `Cell` has no inert representation) —
// and expose the spawn zones as tile-key sets. Board dimensions come from the
// Map's `size`.
export function deserialize(map: ContentMap): ActiveContent {
  const cells: Cell[][] = map.terrain.map(row =>
    row.map(terrain => ({ terrain, hasStructure: false } as Cell)),
  )
  for (const obj of map.objects) {
    if (obj.hp != null) {
      const base = cells[obj.row][obj.col]
      cells[obj.row][obj.col] = {
        terrain: base.terrain,
        hasStructure: true,
        structureHp: obj.hp,
        structureKind: obj.kind as Cell['structureKind'],
      }
    }
  }
  return {
    cols: map.size.cols,
    rows: map.size.rows,
    cells,
    playerSpawnZone: new Set(map.playerSpawnZone),
    enemySpawners: map.enemySpawnZone.map(key => {
      const [col, row] = key.split(',').map(Number)
      return { col, row }
    }),
  }
}

let active: ActiveContent = deserialize(BUNDLED_MAP.map)

// ─── Reads (the single engine seam) ────────────────────────────────────────────

export function gridCols(): number {
  return active.cols
}

export function gridRows(): number {
  return active.rows
}

// A fresh deep copy of the deserialized board, so callers (e.g. `initialState`)
// can mutate freely without touching the canonical content.
export function boardCells(): Cell[][] {
  return active.cells.map(row => row.map(cell => ({ ...cell })))
}

// The set of placeable spawn-zone tile keys ("col,row") — replaces the old
// `spawnZoneTiles()`.
export function playerSpawnZone(): Set<string> {
  return new Set(active.playerSpawnZone)
}

export function enemySpawners(): Array<{ col: number; row: number }> {
  return active.enemySpawners.map(s => ({ ...s }))
}

// The player spawn-zone tiles in a stable order (row, then col). PC initial
// placement is derived from the head of this list (see `npc.ts` `initialState`),
// replacing the removed per-archetype `pcStartTiles`.
export function playerStartTiles(): Array<{ col: number; row: number }> {
  return [...active.playerSpawnZone]
    .map(key => {
      const [col, row] = key.split(',').map(Number)
      return { col, row }
    })
    .sort((a, b) => a.row - b.row || a.col - b.col)
}

// ─── Applying host-supplied content ────────────────────────────────────────────

// Swap the engine's runtime board to a Map the host supplied. The host is
// responsible for deciding which Map that is and for leaving the store alone
// when its own load fails.
export function applyMap(map: ContentMap): void {
  active = deserialize(map)
}

// Restore the bundled map (tests / fallback).
export function reset(): void {
  active = deserialize(BUNDLED_MAP.map)
}
