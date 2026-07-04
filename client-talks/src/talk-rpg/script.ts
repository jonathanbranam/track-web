import worldTownJson from '../../public/rpg/maps/world-town.json'
import worldOverworldJson from '../../public/rpg/maps/world-overworld.json'

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface RelativeStep {
  direction: Direction
  steps: number
}

export interface WalkAction {
  type: 'walk'
  entity: string
  path: RelativeStep[]
}

export interface WalkToAction {
  type: 'walkTo'
  entity: string
  target: string
}

export interface EnterSceneAction {
  type: 'enterScene'
  scene: string
  at?: string
}

export interface PauseAction {
  type: 'pause'
  seconds: number
}

export interface StopAction {
  type: 'stop'
}

export interface StartDialogueAction {
  type: 'startDialogue'
}

export interface SayAction {
  type: 'say'
  text: string
}

export interface EndDialogueAction {
  type: 'endDialogue'
}

export type Action =
  | WalkAction
  | WalkToAction
  | EnterSceneAction
  | PauseAction
  | StopAction
  | StartDialogueAction
  | SayAction
  | EndDialogueAction

export interface EntityDef {
  id: string
  x: number
  y: number
  facing?: Direction
}

export interface NamedLocation {
  x: number
  y: number
}

/** A fixed, pre-built placeholder map: walkable-tile grid + named locations + baked entities. */
export interface GameMap {
  sceneId: string
  width: number
  height: number
  /** Row-major tile GIDs, length === width * height. */
  tiles: number[]
  /** Parallel to `tiles`: true where an entity may stand/pathfind through. */
  walkableGrid: boolean[]
  namedLocations: Record<string, NamedLocation>
  entities: EntityDef[]
}

/** GID -> placeholder rendering color + walkability. The one seam Phase 8 swaps for a real tileset. */
export const TILE_TYPES: Record<number, { walkable: boolean; color: number }> = {
  0: { walkable: true, color: 0x2e7d32 }, // grass
  1: { walkable: false, color: 0x616161 }, // wall
  2: { walkable: false, color: 0x1565c0 }, // water
}

export function tileColor(gid: number): number {
  return TILE_TYPES[gid]?.color ?? 0x000000
}

interface TiledTileLayer {
  name: string
  type: 'tilelayer'
  data: number[]
}

interface TiledObject {
  name: string
  type: 'location' | 'entity'
  x: number
  y: number
  facing?: Direction
}

interface TiledObjectLayer {
  name: string
  type: 'objectgroup'
  objects: TiledObject[]
}

interface TiledMapJson {
  sceneId: string
  width: number
  height: number
  layers: (TiledTileLayer | TiledObjectLayer)[]
}

function loadMap(json: TiledMapJson): GameMap {
  const tileLayer = json.layers.find((layer): layer is TiledTileLayer => layer.type === 'tilelayer')
  const objectLayer = json.layers.find((layer): layer is TiledObjectLayer => layer.type === 'objectgroup')
  const tiles = tileLayer?.data ?? []
  const walkableGrid = tiles.map((gid) => TILE_TYPES[gid]?.walkable ?? false)

  const namedLocations: Record<string, NamedLocation> = {}
  const entities: EntityDef[] = []
  for (const object of objectLayer?.objects ?? []) {
    if (object.type === 'location') {
      namedLocations[object.name] = { x: object.x, y: object.y }
    } else {
      entities.push({ id: object.name, x: object.x, y: object.y, facing: object.facing })
    }
  }

  return { sceneId: json.sceneId, width: json.width, height: json.height, tiles, walkableGrid, namedLocations, entities }
}

export const TOWN_MAP: GameMap = loadMap(worldTownJson as TiledMapJson)
export const OVERWORLD_MAP: GameMap = loadMap(worldOverworldJson as TiledMapJson)

/** Every defined area, keyed by `sceneId`, so `enterScene` can look up its target by name. */
export const MAPS: Record<string, GameMap> = {
  [TOWN_MAP.sceneId]: TOWN_MAP,
  [OVERWORLD_MAP.sceneId]: OVERWORLD_MAP,
}

/** The map/scene playback starts in. */
export const MAP: GameMap = TOWN_MAP

/**
 * Phase 2 proving script: extends Phase 1's walk/pause/stop/dialogue actions
 * with a pathfound `walkTo` and an `enterScene` area switch.
 */
export const SCRIPT: Action[] = [
  { type: 'walk', entity: 'pc', path: [{ direction: 'right', steps: 3 }] },
  { type: 'pause', seconds: 1 },
  { type: 'stop' },

  { type: 'walk', entity: 'pc', path: [{ direction: 'down', steps: 2 }, { direction: 'right', steps: 2 }] },
  { type: 'startDialogue' },
  { type: 'say', text: 'Hello, traveler.' },
  { type: 'pause', seconds: 1.5 },
  { type: 'say', text: 'Welcome to the placeholder map.' },
  { type: 'pause', seconds: 1.5 },
  { type: 'endDialogue' },
  { type: 'stop' },

  { type: 'walk', entity: 'guide', path: [{ direction: 'left', steps: 2 }] },
  { type: 'pause', seconds: 0.5 },
  { type: 'walkTo', entity: 'pc', target: 'shrine' },
  { type: 'stop' },

  { type: 'enterScene', scene: 'world-overworld', at: 'town-gate' },
  { type: 'walkTo', entity: 'pc', target: 'cave-entrance' },
  { type: 'stop' },
]
