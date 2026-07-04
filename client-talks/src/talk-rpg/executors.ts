import { Action, Direction, GameMap, RelativeStep, StopAction } from './script'
import { World, applyAction } from './precompute'

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

/** Stepwise position updates on a timer, arriving at the same final position `applyAction` computes. */
class WalkExecutor implements Executor {
  private readonly unitSteps: Direction[]
  private cursor = 0
  private world: World
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private onComplete: (() => void) | null = null
  private paused = false

  constructor(
    world: World,
    private readonly entityId: string,
    path: RelativeStep[],
    private readonly onWorldChange: WorldChangeCallback,
  ) {
    this.world = world
    this.unitSteps = expandPath(path)
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
    this.world = { ...this.world, entities: { ...this.world.entities, [this.entityId]: updated } }
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

/** Dialogue actions complete instantly this phase — no reveal animation until Phase 3. */
class InstantExecutor implements Executor {
  constructor(
    private world: World,
    private readonly action: Exclude<Action, StopAction>,
    private readonly map: GameMap,
    private readonly onWorldChange: WorldChangeCallback,
  ) {}

  start(onComplete: () => void) {
    this.world = applyAction(this.world, this.action, this.map)
    this.onWorldChange(this.world)
    onComplete()
  }

  pause() {}
  resume() {}
}

export function createExecutor(
  world: World,
  action: Exclude<Action, StopAction>,
  map: GameMap,
  onWorldChange: WorldChangeCallback,
): Executor {
  switch (action.type) {
    case 'walk':
      return new WalkExecutor(world, action.entity, action.path, onWorldChange)
    case 'pause':
      return new PauseExecutor(action.seconds)
    case 'startDialogue':
    case 'say':
    case 'endDialogue':
      return new InstantExecutor(world, action, map, onWorldChange)
  }
}
