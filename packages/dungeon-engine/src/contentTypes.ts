import type { TerrainType } from './types'

// Client-side shape types for serialized board content (Region → Map →
// Encounter). These mirror the server-side Zod schemas in
// `src/games/dungeon-tactics/map.ts` (the two live in separate npm workspaces and
// cannot share a module). When you change one, mirror the other.

export interface ContentRegion {
  id: string
  name: string
  theme: string
  order: number
  terrainTypes: string[]
}

// A tile object: `hp` present marks a destructible structure (power center,
// tower); absent marks an inert object (decor, blocker).
export interface ContentObject {
  col: number
  row: number
  kind: string
  hp?: number
}

export interface ContentMap {
  id: string
  regionId: string
  name: string
  order: number
  size: { cols: number; rows: number }
  terrain: TerrainType[][]
  objects: ContentObject[]
  enemySpawnZone: string[]
  playerSpawnZone: string[]
}

export type WaveStartTrigger =
  | { trigger: 'immediate' }
  | { trigger: 'after-prev-cleared' }
  | { trigger: 'after-turns'; turns: number }

export interface Wave {
  index: number
  start: WaveStartTrigger
  enemies: Array<{ archetype: string; count: number }>
}

export interface Condition {
  type: string
  [key: string]: unknown
}

export interface ContentEncounter {
  id: string
  mapId: string
  name: string
  order: number
  waves: Wave[]
  win: Condition[]
  lose: Condition[]
  achievements: Condition[]
}

export interface ContentTree {
  region: ContentRegion
  map: ContentMap
  encounter: ContentEncounter
}
