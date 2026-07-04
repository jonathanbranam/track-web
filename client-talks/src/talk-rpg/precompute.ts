import { Action, Direction, GameMap } from './script'

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

/** The live, mutable-in-spirit world model actions are applied against. */
export interface World {
  entities: Record<string, EntityState>
  dialogue: DialogueState
}

/**
 * A full snapshot of everything on screen at a `stop` checkpoint (or the
 * pre-script initial state). Structured as a strict subset of the eventual
 * full schema (requirements.md §5) so later phases can add fields (camera,
 * meters, battle state, ...) without reshaping what's already here.
 */
export interface RestingState {
  sceneId: string
  entities: Record<string, EntityState>
  dialogue: DialogueState
  sectionIndex: number
}

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

export function createInitialWorld(map: GameMap): World {
  const entities: Record<string, EntityState> = {}
  for (const entity of map.entities) {
    entities[entity.id] = { id: entity.id, x: entity.x, y: entity.y, facing: 'down' }
  }
  return { entities, dialogue: { open: false, text: '' } }
}

export function cloneWorld(world: World): World {
  return {
    entities: Object.fromEntries(Object.entries(world.entities).map(([id, e]) => [id, { ...e }])),
    dialogue: { ...world.dialogue },
  }
}

export function restingStateToWorld(resting: RestingState): World {
  return {
    entities: Object.fromEntries(Object.entries(resting.entities).map(([id, e]) => [id, { ...e }])),
    dialogue: { ...resting.dialogue },
  }
}

/**
 * Computes an action's final effect on the world model. The single source of
 * truth both the headless precompute pass and live playback call into, so
 * forward play and `snapTo` can never diverge.
 */
export function applyAction(world: World, action: Action, _map: GameMap): World {
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
      return {
        ...world,
        entities: { ...world.entities, [entity.id]: { ...entity, x, y, facing } },
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

export function snapshotRestingState(world: World, sceneId: string, sectionIndex: number): RestingState {
  return {
    sceneId,
    entities: Object.fromEntries(Object.entries(world.entities).map(([id, e]) => [id, { ...e }])),
    dialogue: { ...world.dialogue },
    sectionIndex,
  }
}

/**
 * Runs the entire action list once, headlessly (no real timers, no
 * animation-frame waiting), recording a resting-state snapshot at every
 * `stop`. Running the same action list through this twice always produces
 * byte-for-byte identical snapshots.
 */
export function runPrecompute(actions: Action[], map: GameMap): RestingState[] {
  let world = createInitialWorld(map)
  const checkpoints: RestingState[] = []
  for (const action of actions) {
    world = applyAction(world, action, map)
    if (action.type === 'stop') {
      checkpoints.push(snapshotRestingState(world, map.sceneId, checkpoints.length))
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
