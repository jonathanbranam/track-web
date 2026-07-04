import {
  Action,
  Direction,
  EndDialogueAction,
  EnterSceneAction,
  GameMap,
  HideMenuAction,
  HideOverlayAction,
  RelativeStep,
  SayAction,
  SelectMenuOptionAction,
  ShowMenuAction,
  ShowOverlayAction,
  StartDialogueAction,
  StopAction,
  ThoughtAction,
} from './script'
import { World, applyAction } from './precompute'
import { findPath, pathToDirections, resolveTarget } from './pathfinding'

/**
 * Common interface every in-flight action executes behind. The Director only
 * ever calls `pause()`/`resume()` on "whatever's currently executing" — never
 * action-type-specific logic.
 */
export interface Executor {
  start(onComplete: () => void): void
  pause(): void
  resume(): void
}

type WorldChangeCallback = (world: World) => void

const WALK_STEP_DURATION_MS = 220
const MS_PER_SECOND = 1000

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

function expandPath(path: RelativeStep[]): Direction[] {
  const unitSteps: Direction[] = []
  for (const segment of path) {
    for (let i = 0; i < segment.steps; i++) unitSteps.push(segment.direction)
  }
  return unitSteps
}

/**
 * Stepwise position updates on a timer, arriving at the same final position
 * `applyAction` computes. Shared by `WalkExecutor` (a literal unit-step
 * expansion) and `WalkToExecutor` (a pathfound unit-step expansion) so both
 * animate identically once their steps are resolved.
 */
class StepWalkExecutor implements Executor {
  private cursor = 0
  private world: World
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private onComplete: (() => void) | null = null
  private paused = false

  constructor(
    world: World,
    private readonly entityId: string,
    private readonly unitSteps: Direction[],
    private readonly onWorldChange: WorldChangeCallback,
  ) {
    this.world = world
  }

  start(onComplete: () => void) {
    this.onComplete = onComplete
    this.scheduleNext()
  }

  private scheduleNext() {
    if (this.paused) return
    if (this.cursor >= this.unitSteps.length) {
      this.onComplete?.()
      return
    }
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null
      this.applyStep()
      this.cursor++
      this.scheduleNext()
    }, WALK_STEP_DURATION_MS)
  }

  private applyStep() {
    const direction = this.unitSteps[this.cursor]
    const entity = this.world.entities[this.entityId]
    if (!entity) return
    const { dx, dy } = stepDelta(direction)
    const updated = { ...entity, x: entity.x + dx, y: entity.y + dy, facing: direction }
    this.world = {
      ...this.world,
      entities: { ...this.world.entities, [this.entityId]: updated },
      camera: { x: updated.x, y: updated.y, zoom: this.world.camera.zoom },
    }
    this.onWorldChange(this.world)
  }

  pause() {
    if (this.paused) return
    this.paused = true
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  resume() {
    if (!this.paused) return
    this.paused = false
    this.scheduleNext()
  }
}

/** Literal relative-path walk: real tile-by-tile movement on the live scene. */
class WalkExecutor implements Executor {
  private readonly inner: StepWalkExecutor

  constructor(world: World, entityId: string, path: RelativeStep[], onWorldChange: WorldChangeCallback) {
    this.inner = new StepWalkExecutor(world, entityId, expandPath(path), onWorldChange)
  }

  start(onComplete: () => void) {
    this.inner.start(onComplete)
  }

  pause() {
    this.inner.pause()
  }

  resume() {
    this.inner.resume()
  }
}

/**
 * Resolves the path via `pathfinding.ts` at execution time (the same
 * function the headless precompute pass uses), then walks it step-by-step
 * identically to `WalkExecutor`. An unreachable/unresolvable target resolves
 * to zero steps, completing instantly with no movement — matching
 * `applyAction`'s no-op-on-unreachable behavior.
 */
class WalkToExecutor implements Executor {
  private readonly inner: StepWalkExecutor

  constructor(
    world: World,
    entityId: string,
    target: string,
    maps: Record<string, GameMap>,
    onWorldChange: WorldChangeCallback,
  ) {
    const entity = world.entities[entityId]
    const map = maps[world.sceneId]
    let unitSteps: Direction[] = []
    if (entity && map) {
      const targetPoint = resolveTarget(map, world.entities, target)
      const path = targetPoint ? findPath(map, { x: entity.x, y: entity.y }, targetPoint) : null
      if (path) unitSteps = pathToDirections({ x: entity.x, y: entity.y }, path)
    }
    this.inner = new StepWalkExecutor(world, entityId, unitSteps, onWorldChange)
  }

  start(onComplete: () => void) {
    this.inner.start(onComplete)
  }

  pause() {
    this.inner.pause()
  }

  resume() {
    this.inner.resume()
  }
}

/** Countdown timer; pausing preserves remaining duration. */
class PauseExecutor implements Executor {
  private remainingMs: number
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private startedAt = 0
  private onComplete: (() => void) | null = null
  private paused = false

  constructor(seconds: number) {
    this.remainingMs = seconds * MS_PER_SECOND
  }

  start(onComplete: () => void) {
    this.onComplete = onComplete
    this.scheduleTimeout()
  }

  private scheduleTimeout() {
    this.startedAt = Date.now()
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null
      this.onComplete?.()
    }, this.remainingMs)
  }

  pause() {
    if (this.paused) return
    this.paused = true
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    this.remainingMs = Math.max(0, this.remainingMs - (Date.now() - this.startedAt))
  }

  resume() {
    if (!this.paused) return
    this.paused = false
    this.scheduleTimeout()
  }
}

type InstantAction =
  | StartDialogueAction
  | SayAction
  | EndDialogueAction
  | ThoughtAction
  | ShowMenuAction
  | SelectMenuOptionAction
  | HideMenuAction
  | ShowOverlayAction
  | HideOverlayAction

/** Dialogue/menu/overlay actions complete instantly — no reveal animation, matching Phase 2's pattern for non-animated state changes. */
class InstantExecutor implements Executor {
  constructor(
    private world: World,
    private readonly action: InstantAction,
    private readonly maps: Record<string, GameMap>,
    private readonly onWorldChange: WorldChangeCallback,
  ) {}

  start(onComplete: () => void) {
    this.world = applyAction(this.world, this.action, this.maps)
    this.onWorldChange(this.world)
    onComplete()
  }

  pause() {}
  resume() {}
}

/** Switches the active area's tile/entity/camera data in place — instant, no Phaser scene-manager transition. */
class EnterSceneExecutor implements Executor {
  constructor(
    private world: World,
    private readonly action: EnterSceneAction,
    private readonly maps: Record<string, GameMap>,
    private readonly onWorldChange: WorldChangeCallback,
  ) {}

  start(onComplete: () => void) {
    this.world = applyAction(this.world, this.action, this.maps)
    this.onWorldChange(this.world)
    onComplete()
  }

  pause() {}
  resume() {}
}

export function createExecutor(
  world: World,
  action: Exclude<Action, StopAction>,
  maps: Record<string, GameMap>,
  onWorldChange: WorldChangeCallback,
): Executor {
  switch (action.type) {
    case 'walk':
      return new WalkExecutor(world, action.entity, action.path, onWorldChange)
    case 'walkTo':
      return new WalkToExecutor(world, action.entity, action.target, maps, onWorldChange)
    case 'enterScene':
      return new EnterSceneExecutor(world, action, maps, onWorldChange)
    case 'pause':
      return new PauseExecutor(action.seconds)
    case 'startDialogue':
    case 'say':
    case 'endDialogue':
    case 'thought':
    case 'showMenu':
    case 'selectMenuOption':
    case 'hideMenu':
    case 'showOverlay':
    case 'hideOverlay':
      return new InstantExecutor(world, action, maps, onWorldChange)
  }
}
