import { Action, BATTLE_SCENE_ID, CombatantHp, Direction, EntityStats, GameMap } from './script'
import { findPath, pathToDirections, resolveTarget } from './pathfinding'

export interface EntityState {
  id: string
  x: number
  y: number
  facing: Direction
}

/**
 * The single active dialogue/menu slot (requirements.md §5's "Active UI").
 * `startDialogue`/`say`/`endDialogue`/`thought` and `showMenu`/
 * `selectMenuOption`/`hideMenu` all set or clear this one union — a dialogue
 * and a menu are never both active at once.
 *
 * For a `'thought'` dialogue, `speaker` holds the thinking entity's id (not a
 * display name) so `DialogueBox` can pass it straight to `useWorldAnchor` to
 * anchor the bubble; for `'say'` it's an optional display name.
 */
export type ActiveUI =
  | { kind: 'none' }
  | { kind: 'dialogue'; speaker?: string; text: string; variant: 'say' | 'thought' }
  | { kind: 'menu'; menuKind: 'command'; options: string[]; selectedIndex: number }
  | { kind: 'menu'; menuKind: 'status'; entity: string; stats: EntityStats; options: string[]; selectedIndex: number }

/** A full-screen/overlaid text card (requirements.md §5's "Overlays"), independent of `ui`. */
export interface OverlayCard {
  kind: 'act-card' | 'headline' | 'title' | 'defeat' | 'save-file'
  text: string
}

export interface CameraState {
  x: number
  y: number
  zoom: number
}

/** An ally's battle HP plus its multi-combatant choreography tag (design.md's `battle.allies` Decision). */
export interface PartyMemberState extends CombatantHp {
  tag: 'in' | 'out' | 'needs-attention'
}

/**
 * HP-only battle state (design.md's "carries only combatant HP" Decision) —
 * position/facing/animation for combatants continue to live in `entities`.
 * `null` means "not in battle"; there is no separate active flag.
 */
export interface BattleState {
  allies: PartyMemberState[]
  enemies: CombatantHp[]
}

/** A single scriptable gauge/counter (requirements.md §4F's "attachable scriptable meters"). */
export interface MeterState {
  label: string
  style: 'bar' | 'counter'
  value: number
  max?: number
  anchorEntity?: string
}

/** The scriptable light-radius/fog value (requirements.md §4G); `null` means full visibility. */
export interface LightRadiusState {
  anchorEntity: string
  radius: number
}

/** The active achievement toast (requirements.md §4H); `null` means no toast is showing. */
export interface AchievementState {
  text: string
}

/** The live, mutable-in-spirit world model actions are applied against. */
export interface World {
  sceneId: string
  entities: Record<string, EntityState>
  ui: ActiveUI
  overlay: OverlayCard | null
  camera: CameraState
  battle: BattleState | null
  meters: Record<string, MeterState>
  lightRadius: LightRadiusState | null
  achievement: AchievementState | null
}

/**
 * A full snapshot of everything on screen at a `stop` checkpoint (or the
 * pre-script initial state). Structured as a strict subset of the eventual
 * full schema (requirements.md §5) so later phases can add fields (meters,
 * battle state, ...) without reshaping what's already here.
 */
export interface RestingState {
  sceneId: string
  entities: Record<string, EntityState>
  ui: ActiveUI
  overlay: OverlayCard | null
  sectionIndex: number
  camera: CameraState
  battle: BattleState | null
  meters: Record<string, MeterState>
  lightRadius: LightRadiusState | null
  achievement: AchievementState | null
}

function cloneUI(ui: ActiveUI): ActiveUI {
  return ui.kind === 'menu' ? { ...ui, options: [...ui.options] } : { ...ui }
}

function cloneBattle(battle: BattleState | null): BattleState | null {
  return battle
    ? { allies: battle.allies.map((ally) => ({ ...ally })), enemies: battle.enemies.map((enemy) => ({ ...enemy })) }
    : null
}

function cloneMeters(meters: Record<string, MeterState>): Record<string, MeterState> {
  return Object.fromEntries(Object.entries(meters).map(([id, meter]) => [id, { ...meter }]))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

const DEFAULT_ZOOM = 1
const BATTLE_ZOOM = 0.85

function stepDelta(direction: Direction): { dx: number; dy: number } {
  switch (direction) {
    case 'up':
      return { dx: 0, dy: -1 }
    case 'down':
      return { dx: 0, dy: 1 }
    case 'left':
      return { dx: -1, dy: 0 }
    case 'right':
      return { dx: 1, dy: 0 }
  }
}

function cameraOn(entity: EntityState | undefined): CameraState {
  return { x: entity?.x ?? 0, y: entity?.y ?? 0, zoom: DEFAULT_ZOOM }
}

export function createInitialWorld(map: GameMap): World {
  const entities: Record<string, EntityState> = {}
  for (const entity of map.entities) {
    entities[entity.id] = { id: entity.id, x: entity.x, y: entity.y, facing: entity.facing ?? 'down' }
  }
  return {
    sceneId: map.sceneId,
    entities,
    ui: { kind: 'none' },
    overlay: null,
    camera: cameraOn(entities['pc'] ?? Object.values(entities)[0]),
    battle: null,
    meters: {},
    lightRadius: null,
    achievement: null,
  }
}

export function cloneWorld(world: World): World {
  return {
    sceneId: world.sceneId,
    entities: Object.fromEntries(Object.entries(world.entities).map(([id, e]) => [id, { ...e }])),
    ui: cloneUI(world.ui),
    overlay: world.overlay ? { ...world.overlay } : null,
    camera: { ...world.camera },
    battle: cloneBattle(world.battle),
    meters: cloneMeters(world.meters),
    lightRadius: world.lightRadius ? { ...world.lightRadius } : null,
    achievement: world.achievement ? { ...world.achievement } : null,
  }
}

export function restingStateToWorld(resting: RestingState): World {
  return {
    sceneId: resting.sceneId,
    entities: Object.fromEntries(Object.entries(resting.entities).map(([id, e]) => [id, { ...e }])),
    ui: cloneUI(resting.ui),
    overlay: resting.overlay ? { ...resting.overlay } : null,
    camera: { ...resting.camera },
    battle: cloneBattle(resting.battle),
    meters: cloneMeters(resting.meters),
    lightRadius: resting.lightRadius ? { ...resting.lightRadius } : null,
    achievement: resting.achievement ? { ...resting.achievement } : null,
  }
}

/**
 * Computes an action's final effect on the world model. The single source of
 * truth both the headless precompute pass and live playback call into, so
 * forward play and `snapTo` can never diverge. `maps` is the full registry
 * (not just the currently active one) so `enterScene`/`walkTo` can resolve
 * any named area.
 */
export function applyAction(world: World, action: Action, maps: Record<string, GameMap>): World {
  switch (action.type) {
    case 'walk': {
      const entity = world.entities[action.entity]
      if (!entity) return world
      let { x, y } = entity
      let facing = entity.facing
      for (const step of action.path) {
        const { dx, dy } = stepDelta(step.direction)
        x += dx * step.steps
        y += dy * step.steps
        if (step.steps > 0) facing = step.direction
      }
      const updated = { ...entity, x, y, facing }
      return {
        ...world,
        entities: { ...world.entities, [entity.id]: updated },
        camera: cameraOn(updated),
      }
    }
    case 'walkTo': {
      const entity = world.entities[action.entity]
      const map = maps[world.sceneId]
      if (!entity || !map) return world
      const target = resolveTarget(map, world.entities, action.target)
      if (!target) return world
      const path = findPath(map, { x: entity.x, y: entity.y }, target)
      if (!path) return world
      let { x, y } = entity
      let facing = entity.facing
      for (const direction of pathToDirections({ x: entity.x, y: entity.y }, path)) {
        const { dx, dy } = stepDelta(direction)
        x += dx
        y += dy
        facing = direction
      }
      const updated = { ...entity, x, y, facing }
      return {
        ...world,
        entities: { ...world.entities, [entity.id]: updated },
        camera: cameraOn(updated),
      }
    }
    case 'enterScene': {
      const targetMap = maps[action.scene]
      if (!targetMap) return world
      const entities: Record<string, EntityState> = {}
      for (const def of targetMap.entities) {
        entities[def.id] = { id: def.id, x: def.x, y: def.y, facing: def.facing ?? 'down' }
      }
      const protagonist = world.entities['pc']
      if (protagonist) {
        const location = action.at ? targetMap.namedLocations[action.at] : undefined
        entities['pc'] = {
          id: 'pc',
          x: location ? location.x : protagonist.x,
          y: location ? location.y : protagonist.y,
          facing: protagonist.facing,
        }
      }
      return {
        ...world,
        sceneId: action.scene,
        entities,
        camera: cameraOn(entities['pc'] ?? Object.values(entities)[0]),
      }
    }
    case 'pause':
    case 'stop':
      return world
    case 'startDialogue':
      return { ...world, ui: { kind: 'dialogue', speaker: action.speaker, text: '', variant: 'say' } }
    case 'say': {
      const priorSpeaker = world.ui.kind === 'dialogue' ? world.ui.speaker : undefined
      return { ...world, ui: { kind: 'dialogue', speaker: action.speaker ?? priorSpeaker, text: action.text, variant: 'say' } }
    }
    case 'endDialogue':
      return { ...world, ui: { kind: 'none' } }
    case 'thought':
      return { ...world, ui: { kind: 'dialogue', speaker: action.entity, text: action.text, variant: 'thought' } }
    case 'showMenu':
      return { ...world, ui: { kind: 'menu', menuKind: action.menuKind, options: action.options, selectedIndex: 0 } }
    case 'selectMenuOption':
      return world.ui.kind === 'menu' ? { ...world, ui: { ...world.ui, selectedIndex: action.index } } : world
    case 'hideMenu':
      return { ...world, ui: { kind: 'none' } }
    case 'showOverlay':
      return { ...world, overlay: { kind: action.kind, text: action.text } }
    case 'hideOverlay':
      return { ...world, overlay: null }
    case 'startBattle': {
      const battleMap = maps[BATTLE_SCENE_ID]
      if (!battleMap) return world
      const entities: Record<string, EntityState> = {}
      for (const [i, ally] of action.allies.entries()) {
        const slot = battleMap.namedLocations[`allySlot${i}`]
        if (!slot) continue
        entities[ally.id] = { id: ally.id, x: slot.x, y: slot.y, facing: 'left' }
      }
      for (const [i, enemy] of action.enemies.entries()) {
        const slot = battleMap.namedLocations[`enemySlot${i}`]
        if (!slot) continue
        entities[enemy.id] = { id: enemy.id, x: slot.x, y: slot.y, facing: 'right' }
      }
      return {
        ...world,
        sceneId: BATTLE_SCENE_ID,
        entities,
        battle: {
          allies: action.allies.map((ally) => ({ ...ally, tag: 'in' })),
          enemies: action.enemies.map((enemy) => ({ ...enemy })),
        },
        camera: { x: battleMap.width / 2, y: battleMap.height / 2, zoom: BATTLE_ZOOM },
      }
    }
    case 'endBattle':
      return { ...world, battle: null }
    case 'battleAction': {
      if (!world.battle) return world
      const applyDamage = <T extends CombatantHp>(combatant: T): T =>
        combatant.id === action.target
          ? { ...combatant, hp: clamp(combatant.hp - action.damage, 0, combatant.maxHp) }
          : combatant
      return {
        ...world,
        battle: {
          allies: world.battle.allies.map(applyDamage),
          enemies: world.battle.enemies.map(applyDamage),
        },
        ui: { kind: 'dialogue', text: action.text, variant: 'say' },
      }
    }
    case 'tagCombatant': {
      if (!world.battle) return world
      const idx = world.battle.allies.findIndex((ally) => ally.id === action.entity)
      if (idx === -1) return world
      const allies = [...world.battle.allies]
      allies[idx] = { ...allies[idx], tag: action.action }
      return { ...world, battle: { ...world.battle, allies } }
    }
    case 'partyJoin': {
      const map = maps[world.sceneId]
      const location = action.at ? map?.namedLocations[action.at] : undefined
      const protagonist = world.entities['pc']
      const x = location ? location.x : (protagonist?.x ?? 0)
      const y = location ? location.y : (protagonist?.y ?? 0)
      return {
        ...world,
        entities: { ...world.entities, [action.entity]: { id: action.entity, x, y, facing: 'down' } },
      }
    }
    case 'defeatSequence':
      return { ...world, overlay: { kind: 'defeat', text: action.text } }
    case 'setMeter':
      return {
        ...world,
        meters: {
          ...world.meters,
          [action.meterId]: {
            label: action.label,
            style: action.style,
            value: action.value,
            max: action.max,
            anchorEntity: action.anchorEntity,
          },
        },
      }
    case 'addMeter': {
      const meter = world.meters[action.meterId]
      if (!meter) return world
      const value = meter.style === 'bar' ? clamp(meter.value + action.delta, 0, meter.max ?? 0) : meter.value + action.delta
      return { ...world, meters: { ...world.meters, [action.meterId]: { ...meter, value } } }
    }
    case 'setLightRadius':
      return { ...world, lightRadius: { anchorEntity: action.anchorEntity, radius: action.radius } }
    case 'showStatus':
      return {
        ...world,
        ui: {
          kind: 'menu',
          menuKind: 'status',
          entity: action.entity,
          stats: { ...action.stats },
          options: action.options ?? [],
          selectedIndex: 0,
        },
      }
    case 'levelUp':
      return { ...world, ui: { kind: 'dialogue', text: action.text, variant: 'say' } }
    case 'showSaveFile':
      return { ...world, overlay: { kind: 'save-file', text: action.summary } }
    case 'showAchievement':
      return { ...world, achievement: { text: action.text } }
    case 'hideAchievement':
      return { ...world, achievement: null }
  }
}

export function snapshotRestingState(world: World, sectionIndex: number): RestingState {
  return {
    sceneId: world.sceneId,
    entities: Object.fromEntries(Object.entries(world.entities).map(([id, e]) => [id, { ...e }])),
    ui: cloneUI(world.ui),
    overlay: world.overlay ? { ...world.overlay } : null,
    sectionIndex,
    camera: { ...world.camera },
    battle: cloneBattle(world.battle),
    meters: cloneMeters(world.meters),
    lightRadius: world.lightRadius ? { ...world.lightRadius } : null,
    achievement: world.achievement ? { ...world.achievement } : null,
  }
}

/**
 * Runs the entire action list once, headlessly (no real timers, no
 * animation-frame waiting), recording a resting-state snapshot at every
 * `stop`. Running the same action list through this twice always produces
 * byte-for-byte identical snapshots.
 */
export function runPrecompute(actions: Action[], maps: Record<string, GameMap>, initialSceneId: string): RestingState[] {
  let world = createInitialWorld(maps[initialSceneId])
  const checkpoints: RestingState[] = []
  for (const action of actions) {
    world = applyAction(world, action, maps)
    if (action.type === 'stop') {
      checkpoints.push(snapshotRestingState(world, checkpoints.length))
    }
  }
  return checkpoints
}

export function computeStopIndices(actions: Action[]): number[] {
  const indices: number[] = []
  actions.forEach((action, i) => {
    if (action.type === 'stop') indices.push(i)
  })
  return indices
}
