import worldTownJson from '../../public/rpg/maps/world-town.json'
import worldOverworldJson from '../../public/rpg/maps/world-overworld.json'
import worldCaveJson from '../../public/rpg/maps/world-cave.json'

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
  speaker?: string
}

export interface SayAction {
  type: 'say'
  text: string
  speaker?: string
}

export interface EndDialogueAction {
  type: 'endDialogue'
}

export interface ThoughtAction {
  type: 'thought'
  entity: string
  text: string
}

export interface ShowMenuAction {
  type: 'showMenu'
  menuKind: 'command'
  options: string[]
}

export interface SelectMenuOptionAction {
  type: 'selectMenuOption'
  index: number
}

export interface HideMenuAction {
  type: 'hideMenu'
}

export interface ShowOverlayAction {
  type: 'showOverlay'
  kind: 'act-card' | 'headline' | 'title'
  text: string
}

export interface HideOverlayAction {
  type: 'hideOverlay'
}

/** A single in-battle combatant's current/max HP — the only combat stat this phase tracks. */
export interface CombatantHp {
  id: string
  hp: number
  maxHp: number
}

export interface StartBattleAction {
  type: 'startBattle'
  allies: CombatantHp[]
  enemies: CombatantHp[]
  surprised?: 'party' | 'enemy'
}

export interface EndBattleAction {
  type: 'endBattle'
  outcome: 'victory' | 'defeat' | 'flee' | 'stalemate'
}

export interface BattleActionAction {
  type: 'battleAction'
  actor: string
  target: string
  kind: 'attack' | 'spell' | 'item' | 'wrong-action'
  /** Signed HP delta subtracted from the target's HP; negative heals. */
  damage: number
  text: string
}

export interface DefeatSequenceAction {
  type: 'defeatSequence'
  text: string
}

/** Sets a named ally's multi-combatant choreography tag; a no-op if no battle is active or the entity isn't an ally. */
export interface TagCombatantAction {
  type: 'tagCombatant'
  entity: string
  action: 'in' | 'out' | 'needs-attention'
}

/** Adds a new entity to the current scene (a new recruit), without placing it into any active battle. */
export interface PartyJoinAction {
  type: 'partyJoin'
  entity: string
  /** Named location; defaults to the protagonist's current position when omitted. */
  at?: string
  fx?: string
}

/** Fully defines or replaces a meter's descriptor + value (design.md's "meters carry their own descriptor inline" Decision). */
export interface SetMeterAction {
  type: 'setMeter'
  meterId: string
  label: string
  style: 'bar' | 'counter'
  value: number
  /** Required for `style: 'bar'`, ignored for `'counter'`. */
  max?: number
  /** World-anchored (tracks this entity) vs. a fixed on-screen HUD position when omitted. */
  anchorEntity?: string
}

/** Ticks an existing meter's value by a signed delta; a no-op if `meterId` hasn't been `setMeter`'d yet. */
export interface AddMeterAction {
  type: 'addMeter'
  meterId: string
  delta: number
}

/** Sets the light-radius/fog value around an anchor entity, animated over `overSeconds` during live playback. */
export interface SetLightRadiusAction {
  type: 'setLightRadius'
  anchorEntity: string
  radius: number
  overSeconds?: number
}

/** Display-oriented entity stats authored inline on a `showStatus` action — not a persistent record (design.md's Decision). */
export interface EntityStats {
  level: number
  role?: string
  hp: number
  maxHp: number
}

/** Opens the status screen with a named entity's real, authored stats — replaces `showMenu`'s old `'status'` variant. */
export interface ShowStatusAction {
  type: 'showStatus'
  entity: string
  stats: EntityStats
  /** Optional footer command list, e.g. ["Close"]. */
  options?: string[]
}

/** A fanfare narration beat for a stat/ability increase, reusing the dialogue-box mechanism. */
export interface LevelUpAction {
  type: 'levelUp'
  entity: string
  text: string
}

/** Shows the "completed, high-level prior playthrough" cold-open framing screen via the existing `overlay` slot. */
export interface ShowSaveFileAction {
  type: 'showSaveFile'
  summary: string
}

/** Pops an achievement toast, independent of `ui`/`overlay` so it can display alongside either. */
export interface ShowAchievementAction {
  type: 'showAchievement'
  text: string
}

/** Unconditionally clears the achievement toast. */
export interface HideAchievementAction {
  type: 'hideAchievement'
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
  | ThoughtAction
  | ShowMenuAction
  | SelectMenuOptionAction
  | HideMenuAction
  | ShowOverlayAction
  | HideOverlayAction
  | StartBattleAction
  | EndBattleAction
  | BattleActionAction
  | DefeatSequenceAction
  | TagCombatantAction
  | PartyJoinAction
  | SetMeterAction
  | AddMeterAction
  | SetLightRadiusAction
  | ShowStatusAction
  | LevelUpAction
  | ShowSaveFileAction
  | ShowAchievementAction
  | HideAchievementAction

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
/** Placeholder cave scene (Phase 5), sized so a 3×3/7×7-style light radius arc is clearly visible against its walls. */
export const CAVE_MAP: GameMap = loadMap(worldCaveJson as TiledMapJson)

/** The single reusable battle arena scene (design.md's "sceneId switch to one well-known map" decision). */
export const BATTLE_SCENE_ID = 'battle'
const BATTLE_MAP_WIDTH = 12
const BATTLE_MAP_HEIGHT = 7

/** Placeholder solid-color arena backdrop, drawn as one rectangle instead of a tile grid (see `TalkRpgScene.loadArea`). */
export const BATTLE_BACKDROP_COLOR = 0x241933

/**
 * Hand-authored, not loaded from Tiled: a fixed backdrop plus named ally/enemy
 * slots and no baked entities — `startBattle` populates `entities` at these
 * slots at runtime (design.md's "battle map is a hand-authored TS constant").
 */
export const BATTLE_MAP: GameMap = {
  sceneId: BATTLE_SCENE_ID,
  width: BATTLE_MAP_WIDTH,
  height: BATTLE_MAP_HEIGHT,
  tiles: new Array(BATTLE_MAP_WIDTH * BATTLE_MAP_HEIGHT).fill(0),
  walkableGrid: new Array(BATTLE_MAP_WIDTH * BATTLE_MAP_HEIGHT).fill(false),
  namedLocations: {
    allySlot0: { x: 9, y: 3 },
    allySlot1: { x: 9, y: 1 },
    allySlot2: { x: 9, y: 5 },
    allySlot3: { x: 10, y: 3 },
    enemySlot0: { x: 2, y: 3 },
    enemySlot1: { x: 2, y: 1 },
    enemySlot2: { x: 2, y: 5 },
  },
  entities: [],
}

/** Every defined area, keyed by `sceneId`, so `enterScene` can look up its target by name. */
export const MAPS: Record<string, GameMap> = {
  [TOWN_MAP.sceneId]: TOWN_MAP,
  [OVERWORLD_MAP.sceneId]: OVERWORLD_MAP,
  [CAVE_MAP.sceneId]: CAVE_MAP,
  [BATTLE_MAP.sceneId]: BATTLE_MAP,
}

/** The map/scene playback starts in. */
export const MAP: GameMap = TOWN_MAP
