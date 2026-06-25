import type { Cell } from './types'
import type { ContentMap, ContentTree } from './contentTypes'
import { BUNDLED_MAP } from './bundledMap'
import { fetchDefaultContent } from '../../api'

// The single in-memory source of truth the engine reads board content from —
// the board grid, its dimensions, tile objects, and the enemy/player spawn
// zones. It mirrors `defStore` (which holds unit stats): at game start
// `loadFromServer()` populates it from the persisted default Map; if that fetch
// fails it keeps the bundled `BUNDLED_MAP` so the game stays playable offline /
// on error. The engine (`npc.ts`, `pc.ts`, `pathfinding.ts`, `turn.ts`,
// `DungeonTacticsScene.ts`) reads board content only through the getters here —
// the bundled tree is the fallback seed.
//
// There is no polling / mid-session re-fetch: `loadFromServer()` runs once at
// game start. There is no localStorage "active content" pointer yet (no content
// editor in this change) — the store always loads the server default.

export const GAME_SLUG = 'dungeon-tactics-solo'

interface ActiveContent {
  cols: number
  rows: number
  // Deserialized board: terrain with destructible structures overlaid.
  cells: Cell[][]
  // Player-placeable tiles as "col,row" keys (reproduces the old spawnZoneTiles()).
  playerSpawnZone: Set<string>
  // Enemy spawner tiles.
  enemySpawners: Array<{ col: number; row: number }>
  // Per-archetype default placements.
  pcStartTiles: Record<string, { col: number; row: number }>
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
    pcStartTiles: map.pcStartTiles,
  }
}

let active: ActiveContent = deserialize(BUNDLED_MAP.map)
let loadedMapId: string | null = null

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

export function pcStartTiles(): Record<string, { col: number; row: number }> {
  return active.pcStartTiles
}

export function loadedMap(): string | null {
  return loadedMapId
}

// ─── Server load (no polling — called once at game start) ───────────────────────

// Load the persisted default Map into the store at game start. On any failure
// the store is left as-is (bundled map) so the game stays playable. Returns
// whether a load succeeded.
export async function loadFromServer(): Promise<{ ok: boolean; mapId: string | null }> {
  try {
    const tree = await fetchDefaultContent<ContentTree>(GAME_SLUG)
    active = deserialize(tree.map)
    loadedMapId = tree.map.id
    return { ok: true, mapId: tree.map.id }
  } catch {
    console.warn('[dungeon-tactics] content fetch failed; using bundled map')
    return { ok: false, mapId: null }
  }
}

// Restore the bundled map (tests / fallback).
export function reset(): void {
  active = deserialize(BUNDLED_MAP.map)
  loadedMapId = null
}
