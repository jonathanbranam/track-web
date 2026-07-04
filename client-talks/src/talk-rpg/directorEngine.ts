import { Action, GameMap, StopAction } from './script'
import {
  RestingState,
  World,
  computeStopIndices,
  createInitialWorld,
  restingStateToWorld,
  snapshotRestingState,
} from './precompute'
import { Executor, createExecutor } from './executors'

export type DirectorStatus = 'RESTING' | 'PLAYING'

export interface DirectorSnapshot {
  status: DirectorStatus
  /** -1 before the first `stop` is reached; otherwise an index into the checkpoints array. */
  checkpointIndex: number
  checkpointCount: number
  resting: RestingState
  paused: boolean
}

type Listener = (snapshot: DirectorSnapshot) => void

/**
 * Framework-agnostic playback engine: owns the authored action list, the
 * precomputed checkpoint array, and the presenter controls that operate on
 * it (`snapTo`/`next`/`back`/`pause`/`resume`/`skipTo`). No React, no Phaser —
 * `Director.tsx` is a thin React binding over this.
 */
export class DirectorEngine {
  private readonly stopIndices: number[]
  private readonly initialResting: RestingState

  private world: World
  private actionCursor = 0
  private checkpointIndex = -1
  private status: DirectorStatus = 'RESTING'
  private paused = false
  private displayResting: RestingState
  private currentExecutor: Executor | null = null
  private readonly listeners = new Set<Listener>()
  private snapshot: DirectorSnapshot

  constructor(
    private readonly actions: Action[],
    private readonly map: GameMap,
    private readonly checkpoints: RestingState[],
  ) {
    this.stopIndices = computeStopIndices(actions)
    this.world = createInitialWorld(map)
    this.initialResting = snapshotRestingState(this.world, map.sceneId, -1)
    this.displayResting = this.initialResting
    this.snapshot = this.buildSnapshot()
  }

  private buildSnapshot(): DirectorSnapshot {
    return {
      status: this.status,
      checkpointIndex: this.checkpointIndex,
      checkpointCount: this.checkpoints.length,
      resting: this.displayResting,
      paused: this.paused,
    }
  }

  /** Returns a cached snapshot object — a stable reference is required by `useSyncExternalStore`. */
  getSnapshot(): DirectorSnapshot {
    return this.snapshot
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit() {
    this.snapshot = this.buildSnapshot()
    this.listeners.forEach((listener) => listener(this.snapshot))
  }

  private setWorld(world: World) {
    this.world = world
    this.displayResting = snapshotRestingState(world, this.map.sceneId, this.checkpointIndex)
    this.emit()
  }

  /** Applies a checkpoint's resting state explicitly and in full — nothing inherited from before. */
  snapTo(i: number) {
    const clamped = Math.max(-1, Math.min(i, this.checkpoints.length - 1))
    this.currentExecutor = null
    this.checkpointIndex = clamped
    this.actionCursor = clamped === -1 ? 0 : this.stopIndices[clamped] + 1
    this.world = clamped === -1 ? createInitialWorld(this.map) : restingStateToWorld(this.checkpoints[clamped])
    this.displayResting = clamped === -1 ? this.initialResting : this.checkpoints[clamped]
    this.status = 'RESTING'
    this.paused = false
    this.emit()
  }

  /** Instantly re-applies the previous checkpoint, no replay. */
  back() {
    if (this.status !== 'RESTING') return
    this.snapTo(this.checkpointIndex - 1)
  }

  /** Jumps directly to checkpoint `i`, forward or backward, any distance. */
  skipTo(i: number) {
    if (this.status !== 'RESTING') return
    this.snapTo(i)
  }

  /** Plays every action from the current checkpoint to the next `stop`, chaining on real completion. */
  next() {
    if (this.status !== 'RESTING') return
    if (this.actionCursor >= this.actions.length) return
    this.status = 'PLAYING'
    this.paused = false
    this.emit()
    this.advance()
  }

  private advance() {
    if (this.actionCursor >= this.actions.length) {
      this.completeSegment()
      return
    }
    const action = this.actions[this.actionCursor]
    if (action.type === 'stop') {
      this.actionCursor++
      this.completeSegment()
      return
    }
    const executable: Exclude<Action, StopAction> = action
    const executor = createExecutor(this.world, executable, this.map, (world) => this.setWorld(world))
    this.currentExecutor = executor
    executor.start(() => {
      this.currentExecutor = null
      this.actionCursor++
      this.advance()
    })
  }

  private completeSegment() {
    this.checkpointIndex++
    this.status = 'RESTING'
    this.paused = false
    this.currentExecutor = null
    this.displayResting = snapshotRestingState(this.world, this.map.sceneId, this.checkpointIndex)
    this.emit()
  }

  /** Halts whichever action is currently executing; no-op at rest. */
  pause() {
    if (this.status !== 'PLAYING' || this.paused) return
    this.paused = true
    this.currentExecutor?.pause()
    this.emit()
  }

  resume() {
    if (!this.paused) return
    this.paused = false
    this.currentExecutor?.resume()
    this.emit()
  }
}
