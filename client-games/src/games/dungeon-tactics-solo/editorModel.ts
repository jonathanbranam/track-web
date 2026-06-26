import type { ContentMap, ContentObject, ContentRegion } from './contentTypes'
import type { Cell, TerrainType } from './types'
import { MAP_SIZE_MIN, MAP_SIZE_MAX } from './mapBounds'

// Pure, Phaser-free editor logic — the source-of-truth for every map mutation the
// editor performs. The React editor host owns a `ContentMap` in state and routes
// each tile event through `applyTool`, each resize through `resizeMap`, and each
// new map through `blankMap`; `validateMap` mirrors the server `mapSchema` for
// inline pre-save feedback. Keeping all of this here (no Phaser, no DOM) makes the
// hard logic exhaustively unit-testable; the scene is left a dumb renderer.

// The fixed party size. The four PCs (melee, ranger, magic-user, rogue) are seated
// from the player spawn zone at play time (see `npc.ts` `initialState`), so a valid
// map's `playerSpawnZone` must hold strictly more tiles than this. Mirrors the
// server's player-unit count check in `src/games/dungeon-tactics/map.ts`.
export const PC_COUNT = 4

// The editor's single tool selector. `terrain`/`object` consult the active brush;
// the zone tools and `erase` ignore it.
export type Tool = 'terrain' | 'object' | 'enemy-zone' | 'player-zone' | 'erase'

// The contextual brush for the terrain and object tools. `terrain` is the value
// the terrain tool paints; `objectKind`/`objectHp` describe what the object tool
// places (`objectHp` present → a destructible structure, absent → an inert object).
export interface Brush {
  terrain: string
  objectKind: string
  objectHp?: number
}

function tileKey(col: number, row: number): string {
  return `${col},${row}`
}

// Toggle a tile's membership in a "col,row" key list, returning a new array.
function toggleZone(zone: string[], col: number, row: number): string[] {
  const key = tileKey(col, row)
  return zone.includes(key) ? zone.filter((k) => k !== key) : [...zone, key]
}

// Drop any object on the given tile, returning a new array.
function removeObjectAt(objects: ContentObject[], col: number, row: number): ContentObject[] {
  return objects.filter((o) => !(o.col === col && o.row === row))
}

// Apply the active tool+brush to one tile, returning a new `ContentMap` (never
// mutating the input). Out-of-bounds tiles are returned unchanged.
export function applyTool(
  map: ContentMap,
  tool: Tool,
  brush: Brush,
  tile: { col: number; row: number },
): ContentMap {
  const { col, row } = tile
  if (col < 0 || col >= map.size.cols || row < 0 || row >= map.size.rows) return map

  switch (tool) {
    case 'terrain': {
      const terrain = map.terrain.map((r, ri) =>
        ri === row ? r.map((t, ci) => (ci === col ? (brush.terrain as TerrainType) : t)) : r,
      )
      return { ...map, terrain }
    }
    case 'object': {
      // Place/replace: an object on the tile is overwritten by the brush's.
      const next: ContentObject = { col, row, kind: brush.objectKind }
      if (brush.objectHp != null) next.hp = brush.objectHp
      return { ...map, objects: [...removeObjectAt(map.objects, col, row), next] }
    }
    case 'enemy-zone':
      return { ...map, enemySpawnZone: toggleZone(map.enemySpawnZone, col, row) }
    case 'player-zone':
      return { ...map, playerSpawnZone: toggleZone(map.playerSpawnZone, col, row) }
    case 'erase':
      // Clear whatever is on the tile: any object, and zone membership in both zones.
      return {
        ...map,
        objects: removeObjectAt(map.objects, col, row),
        enemySpawnZone: map.enemySpawnZone.filter((k) => k !== tileKey(col, row)),
        playerSpawnZone: map.playerSpawnZone.filter((k) => k !== tileKey(col, row)),
      }
  }
}

export interface ResizeResult {
  map: ContentMap
  dropped: { objects: number; enemyZone: number; playerZone: number }
}

// Resize the board to `cols`×`rows`. Growing fills new tiles with `fillTerrain`
// (defaulting to the map's current top-left terrain, which the caller sets to the
// region's first terrain for a faithful match). Cropping drops out-of-bounds
// objects and zone tiles and reports how many of each were removed. Sizes are
// clamped to the allowed bounds.
export function resizeMap(
  map: ContentMap,
  cols: number,
  rows: number,
  fillTerrain?: string,
): ResizeResult {
  const nextCols = Math.max(MAP_SIZE_MIN, Math.min(MAP_SIZE_MAX, Math.floor(cols)))
  const nextRows = Math.max(MAP_SIZE_MIN, Math.min(MAP_SIZE_MAX, Math.floor(rows)))
  const fill = (fillTerrain ?? map.terrain[0]?.[0] ?? 'plains') as TerrainType

  const terrain: TerrainType[][] = []
  for (let r = 0; r < nextRows; r++) {
    const rowArr: TerrainType[] = []
    for (let c = 0; c < nextCols; c++) {
      rowArr.push(map.terrain[r]?.[c] ?? fill)
    }
    terrain.push(rowArr)
  }

  const inBounds = (col: number, row: number) =>
    col >= 0 && col < nextCols && row >= 0 && row < nextRows
  const zoneInBounds = (key: string) => {
    const [c, r] = key.split(',').map(Number)
    return inBounds(c, r)
  }

  const objects = map.objects.filter((o) => inBounds(o.col, o.row))
  const enemySpawnZone = map.enemySpawnZone.filter(zoneInBounds)
  const playerSpawnZone = map.playerSpawnZone.filter(zoneInBounds)

  return {
    map: { ...map, size: { cols: nextCols, rows: nextRows }, terrain, objects, enemySpawnZone, playerSpawnZone },
    dropped: {
      objects: map.objects.length - objects.length,
      enemyZone: map.enemySpawnZone.length - enemySpawnZone.length,
      playerZone: map.playerSpawnZone.length - playerSpawnZone.length,
    },
  }
}

// Build a fresh map for a region: the region's first terrain painted across the
// grid and no objects. A default player spawn zone (the bottom two rows) is seeded
// so the new map immediately satisfies the server's `playerSpawnZone > PC_COUNT`
// rule and is therefore persistable on create; the author refines it in the editor.
export function blankMap(
  region: ContentRegion,
  size: { cols: number; rows: number } = { cols: 8, rows: 8 },
): ContentMap {
  const fill = (region.terrainTypes[0] ?? 'plains') as TerrainType
  const terrain: TerrainType[][] = Array.from({ length: size.rows }, () =>
    Array.from({ length: size.cols }, () => fill),
  )
  const playerSpawnZone: string[] = []
  for (let r = Math.max(0, size.rows - 2); r < size.rows; r++) {
    for (let c = 0; c < size.cols; c++) playerSpawnZone.push(tileKey(c, r))
  }
  return {
    // Placeholder id — the create endpoint mints the real id from the name slug,
    // but the shared `mapSchema` validates the body first and requires a non-empty
    // id (the test fixture uses 'placeholder' for the same reason).
    id: 'new-map',
    regionId: region.id,
    name: 'New Map',
    order: 0,
    size,
    terrain,
    objects: [],
    enemySpawnZone: [],
    playerSpawnZone,
  }
}

// Project a `ContentMap` onto the engine's `Cell[][]` for rendering through the
// shared `drawBoard` helper: terrain grid with HP-bearing objects overlaid as
// destructible structure cells (mirrors `contentStore.deserialize`, but pure and
// without touching the global store). Inert objects (no `hp`) have no `Cell`
// representation; the editor scene draws them as a separate overlay.
export function mapToCells(map: ContentMap): Cell[][] {
  const cells: Cell[][] = map.terrain.map((row) =>
    row.map((terrain) => ({ terrain, hasStructure: false } as Cell)),
  )
  for (const o of map.objects) {
    if (o.hp != null && cells[o.row]?.[o.col]) {
      cells[o.row][o.col] = {
        terrain: cells[o.row][o.col].terrain,
        hasStructure: true,
        structureHp: o.hp,
        structureKind: o.kind as Cell['structureKind'],
      }
    }
  }
  return cells
}

export interface ValidationProblem {
  message: string
  // The offending tile, when the problem localizes to one (so the HUD can flag it).
  tile?: { col: number; row: number }
}

// Client mirror of the server `mapSchema` (structural + terrain-enum) checks, used
// for inline pre-save feedback. The server remains the authority — this only
// disables Save and flags tiles early. Returns an empty array for a valid map.
export function validateMap(map: ContentMap, region: ContentRegion): ValidationProblem[] {
  const problems: ValidationProblem[] = []
  const { cols, rows } = map.size
  const inBounds = (col: number, row: number) =>
    col >= 0 && col < cols && row >= 0 && row < rows
  const allowed = new Set(region.terrainTypes)

  if (cols < MAP_SIZE_MIN || cols > MAP_SIZE_MAX || rows < MAP_SIZE_MIN || rows > MAP_SIZE_MAX) {
    problems.push({ message: `size must be within ${MAP_SIZE_MIN}×${MAP_SIZE_MIN}–${MAP_SIZE_MAX}×${MAP_SIZE_MAX}` })
  }

  // Terrain grid matches size, and every value is in the region's enum.
  if (map.terrain.length !== rows) {
    problems.push({ message: `terrain must have ${rows} rows, got ${map.terrain.length}` })
  }
  map.terrain.forEach((rowArr, r) => {
    if (rowArr.length !== cols) {
      problems.push({ message: `terrain row ${r} must have ${cols} cols, got ${rowArr.length}` })
    }
    rowArr.forEach((value, c) => {
      if (!allowed.has(value)) {
        problems.push({ message: `terrain "${value}" is not one of the region's terrain types`, tile: { col: c, row: r } })
      }
    })
  })

  // Objects in bounds.
  map.objects.forEach((o) => {
    if (!inBounds(o.col, o.row)) {
      problems.push({ message: `object (${o.col},${o.row}) is out of bounds`, tile: { col: o.col, row: o.row } })
    }
  })

  // Spawn-zone tiles in bounds.
  const checkZone = (zone: string[], label: string) => {
    zone.forEach((key) => {
      const [c, r] = key.split(',').map(Number)
      if (!inBounds(c, r)) {
        problems.push({ message: `${label} tile ${key} is out of bounds`, tile: { col: c, row: r } })
      }
    })
  }
  checkZone(map.enemySpawnZone, 'enemy spawn zone')
  checkZone(map.playerSpawnZone, 'player spawn zone')

  // Player spawn zone must give real placement choice: more tiles than PCs.
  if (map.playerSpawnZone.length <= PC_COUNT) {
    problems.push({ message: `player spawn zone (${map.playerSpawnZone.length}) must exceed the party size (${PC_COUNT})` })
  }

  return problems
}
