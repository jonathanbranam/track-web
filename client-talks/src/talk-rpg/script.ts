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
  menuKind: 'command' | 'status'
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
  ally: CombatantHp
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
  | SetMeterAction
  | AddMeterAction
  | SetLightRadiusAction

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
    allySlot: { x: 9, y: 4 },
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

/**
 * Phase 3 proving script: extends Phase 2's walk/walkTo/enterScene actions
 * with a named speaker, a thought bubble, a command menu, a status screen,
 * and a full-screen text card, proving the DOM overlay layer end to end.
 */
export const SCRIPT: Action[] = [
  // Phase 5 proving script: a scripted gold counter (a fixed-HUD 'counter'
  // meter, per design.md's "gold is a meterId, not a separate action type"
  // Decision) ticking up on later beats.
  { type: 'setMeter', meterId: 'gold', label: 'Gold', style: 'counter', value: 0 },
  { type: 'walk', entity: 'pc', path: [{ direction: 'right', steps: 3 }] },
  { type: 'pause', seconds: 1 },
  { type: 'stop' },

  { type: 'walk', entity: 'pc', path: [{ direction: 'down', steps: 2 }, { direction: 'right', steps: 2 }] },
  { type: 'startDialogue', speaker: 'Guide' },
  { type: 'say', text: 'Hello, traveler.' },
  { type: 'pause', seconds: 1.5 },
  { type: 'say', text: 'Welcome to the placeholder map.' },
  { type: 'pause', seconds: 1.5 },
  { type: 'endDialogue' },
  { type: 'stop' },

  { type: 'thought', entity: 'pc', text: 'I wonder if a familiar could help here.' },
  { type: 'walk', entity: 'pc', path: [{ direction: 'down', steps: 1 }] },
  { type: 'pause', seconds: 1 },
  { type: 'stop' },

  { type: 'showMenu', menuKind: 'command', options: ['Fight', 'Spell', 'Item', 'Run'] },
  { type: 'pause', seconds: 0.5 },
  { type: 'selectMenuOption', index: 2 },
  { type: 'pause', seconds: 0.5 },
  { type: 'hideMenu' },
  { type: 'stop' },

  { type: 'showMenu', menuKind: 'status', options: ['pc'] },
  { type: 'pause', seconds: 1 },
  { type: 'hideMenu' },
  { type: 'stop' },

  { type: 'showOverlay', kind: 'headline', text: 'STAGE 1: VIBE CODING' },
  { type: 'pause', seconds: 1.5 },
  { type: 'hideOverlay' },
  { type: 'addMeter', meterId: 'gold', delta: 10 },
  { type: 'stop' },

  { type: 'walk', entity: 'guide', path: [{ direction: 'left', steps: 2 }] },
  { type: 'pause', seconds: 0.5 },
  { type: 'walkTo', entity: 'pc', target: 'shrine' },
  { type: 'addMeter', meterId: 'gold', delta: 15 },
  { type: 'stop' },

  { type: 'enterScene', scene: 'world-overworld', at: 'town-gate' },
  { type: 'walkTo', entity: 'pc', target: 'cave-entrance' },
  { type: 'stop' },

  // Phase 5 proving script: enter the placeholder cave and run setLightRadius
  // through a grow -> shrink -> extinguish arc, exercising overSeconds and
  // radius: 0 at least once each (design.md's discrete-step animation Decision).
  { type: 'enterScene', scene: 'world-cave', at: 'cave-mouth' },
  { type: 'setLightRadius', anchorEntity: 'pc', radius: 1 },
  { type: 'stop' },

  { type: 'setLightRadius', anchorEntity: 'pc', radius: 3, overSeconds: 2 },
  { type: 'pause', seconds: 2.2 },
  { type: 'stop' },

  { type: 'setLightRadius', anchorEntity: 'pc', radius: 1, overSeconds: 1.5 },
  { type: 'pause', seconds: 1.7 },
  { type: 'stop' },

  { type: 'setLightRadius', anchorEntity: 'pc', radius: 0, overSeconds: 1 },
  { type: 'pause', seconds: 1.2 },
  { type: 'addMeter', meterId: 'gold', delta: 25 },
  { type: 'stop' },

  // Phase 4 proving script: one complete scripted fight, exercising every
  // battle action at least once, including a scripted wrong-action mistake.
  { type: 'startBattle', ally: { id: 'pc', hp: 20, maxHp: 20 }, enemies: [{ id: 'slime', hp: 12, maxHp: 12 }] },
  { type: 'stop' },

  { type: 'showMenu', menuKind: 'command', options: ['Fight', 'Spell', 'Item', 'Run'] },
  { type: 'pause', seconds: 0.5 },
  { type: 'selectMenuOption', index: 0 },
  { type: 'pause', seconds: 0.5 },
  { type: 'hideMenu' },
  { type: 'battleAction', actor: 'pc', target: 'slime', kind: 'attack', damage: 7, text: 'You attack the slime for 7 damage!' },
  { type: 'pause', seconds: 1.5 },
  { type: 'stop' },

  { type: 'showMenu', menuKind: 'command', options: ['Fight', 'Spell', 'Item', 'Run'] },
  { type: 'pause', seconds: 0.5 },
  { type: 'selectMenuOption', index: 1 },
  { type: 'pause', seconds: 0.5 },
  { type: 'hideMenu' },
  {
    type: 'battleAction',
    actor: 'pc',
    target: 'slime',
    kind: 'wrong-action',
    damage: -5,
    text: 'You cast Fire — but the slime is fire-immune. It heals 5 HP!',
  },
  { type: 'pause', seconds: 1.5 },
  { type: 'stop' },

  { type: 'battleAction', actor: 'slime', target: 'pc', kind: 'attack', damage: 20, text: 'The slime overwhelms you!' },
  { type: 'pause', seconds: 1 },
  { type: 'endDialogue' },
  { type: 'endBattle', outcome: 'defeat' },
  { type: 'defeatSequence', text: 'THOU ART DEAD' },
  { type: 'pause', seconds: 2 },
  { type: 'hideOverlay' },
  { type: 'stop' },

  { type: 'enterScene', scene: 'world-town', at: 'town-square' },
  { type: 'stop' },
]
