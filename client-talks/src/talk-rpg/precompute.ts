import { Action, Direction, GameMap } from './script'
import { findPath, pathToDirections, resolveTarget } from './pathfinding'

export interface EntityState {
  id: string
  x: number
  y: number
  facing: Direction
}

export interface DialogueState {
  open: boolean
  text: string
}

export interface CameraState {
  x: number
  y: number
  zoom: number
}

/** The live, mutable-in-spirit world model actions are applied against. */
export interface World {
  sceneId: string
  entities: Record<string, EntityState>
  dialogue: DialogueState
  camera: CameraState
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
  dialogue: DialogueState
  sectionIndex: number
  camera: CameraState
}

const DEFAULT_ZOOM = 1

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
    dialogue: { open: false, text: '' },
    camera: cameraOn(entities['pc'] ?? Object.values(entities)[0]),
  }
}

export function cloneWorld(world: World): World {
  return {
    sceneId: world.sceneId,
    entities: Object.fromEntries(Object.entries(world.entities).map(([id, e]) => [id, { ...e }])),
    dialogue: { ...world.dialogue },
    camera: { ...world.camera },
  }
}

export function restingStateToWorld(resting: RestingState): World {
  return {
    sceneId: resting.sceneId,
    entities: Object.fromEntries(Object.entries(resting.entities).map(([id, e]) => [id, { ...e }])),
    dialogue: { ...resting.dialogue },
    camera: { ...resting.camera },
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
      return { ...world, dialogue: { open: true, text: '' } }
    case 'say':
      return { ...world, dialogue: { open: true, text: action.text } }
    case 'endDialogue':
      return { ...world, dialogue: { open: false, text: '' } }
  }
}

export function snapshotRestingState(world: World, sectionIndex: number): RestingState {
  return {
    sceneId: world.sceneId,
    entities: Object.fromEntries(Object.entries(world.entities).map(([id, e]) => [id, { ...e }])),
    dialogue: { ...world.dialogue },
    sectionIndex,
    camera: { ...world.camera },
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
