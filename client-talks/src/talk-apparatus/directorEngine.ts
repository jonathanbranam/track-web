import { BeatAction, applyBeatAction, computeStopIndices } from './actions'
import { ApparatusState, createInitialState } from './state'

export type ApparatusDirectorStatus = 'RESTING' | 'PLAYING'

export interface ApparatusDirectorSnapshot {
  /** Always 'RESTING' — state application is synchronous, so there is no in-flight segment to be 'PLAYING' through. Kept for presenter-control-surface parity with talk-rpg's DirectorEngine. */
  status: ApparatusDirectorStatus
  /** -1 before the first `stop` is reached; otherwise an index into the checkpoints array. */
  checkpointIndex: number
  checkpointCount: number
  resting: ApparatusState
  paused: boolean
  /** Presenter-only readout: the next non-stop action `next()` will apply, or null if none remain. */
  nextAction: BeatAction | null
}

type Listener = (snapshot: ApparatusDirectorSnapshot) => void

/**
 * Framework-agnostic playback engine for the apparatus talk: owns the
 * authored beat list, the precomputed checkpoint array, and the presenter
 * controls that operate on it. Unlike talk-rpg's DirectorEngine, `next()`
 * applies its segment's actions synchronously in one call — there is no
 * real-time executor to await — so `pause()`/`resume()` are no-ops kept only
 * for control-surface parity (design.md's "Beat action vocabulary" decision).
 */
export class ApparatusDirectorEngine {
  private readonly stopIndices: number[]
  private readonly initialState: ApparatusState

  private state: ApparatusState
  private actionCursor = 0
  private checkpointIndex = -1
  private paused = false
  private readonly listeners = new Set<Listener>()
  private snapshot: ApparatusDirectorSnapshot

  constructor(
    private readonly actions: BeatAction[],
    private readonly checkpoints: ApparatusState[],
  ) {
    this.stopIndices = computeStopIndices(actions)
    this.initialState = createInitialState()
    this.state = this.initialState
    this.snapshot = this.buildSnapshot()
  }

  private nextActionFrom(cursor: number): BeatAction | null {
    for (let i = cursor; i < this.actions.length; i++) {
      if (this.actions[i].type !== 'stop') return this.actions[i]
    }
    return null
  }

  private buildSnapshot(): ApparatusDirectorSnapshot {
    return {
      status: 'RESTING',
      checkpointIndex: this.checkpointIndex,
      checkpointCount: this.checkpoints.length,
      resting: this.state,
      paused: this.paused,
      nextAction: this.nextActionFrom(this.actionCursor),
    }
  }

  /** Returns a cached snapshot object — a stable reference is required by `useSyncExternalStore`. */
  getSnapshot(): ApparatusDirectorSnapshot {
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

  /** Applies a checkpoint's state explicitly and in full — nothing inherited from before. */
  snapTo(i: number) {
    const clamped = Math.max(-1, Math.min(i, this.checkpoints.length - 1))
    this.checkpointIndex = clamped
    this.actionCursor = clamped === -1 ? 0 : this.stopIndices[clamped] + 1
    this.state = clamped === -1 ? this.initialState : this.checkpoints[clamped]
    this.paused = false
    this.emit()
  }

  /** Instantly re-applies the previous checkpoint, no replay. */
  back() {
    this.snapTo(this.checkpointIndex - 1)
  }

  /** Returns to the state before the first checkpoint. */
  restart() {
    this.snapTo(-1)
  }

  /** Jumps directly to checkpoint `i`, forward or backward, any distance. */
  skipTo(i: number) {
    this.snapTo(i)
  }

  /** Advances one checkpoint instantly. Since playback is synchronous there is never an in-flight segment to cancel — this is equivalent to snapping to the next checkpoint. No-op past the last checkpoint. */
  skipForward() {
    const target = this.checkpointIndex + 1
    if (target > this.checkpoints.length - 1) return
    this.snapTo(target)
  }

  /** Applies every action from the current checkpoint up to (and including) the next `stop`, synchronously. */
  next() {
    if (this.actionCursor >= this.actions.length) return
    let state = this.state
    let cursor = this.actionCursor
    while (cursor < this.actions.length) {
      const action = this.actions[cursor]
      cursor++
      if (action.type === 'stop') break
      state = applyBeatAction(state, action)
    }
    this.checkpointIndex++
    this.state = { ...state, sectionIndex: this.checkpointIndex }
    this.actionCursor = cursor
    this.paused = false
    this.emit()
  }

  /** No-op: kept for presenter-control-surface parity with talk-rpg; there is no in-flight animation to halt. */
  pause() {
    if (this.paused) return
    this.paused = true
    this.emit()
  }

  /** No-op counterpart to `pause()`. */
  resume() {
    if (!this.paused) return
    this.paused = false
    this.emit()
  }
}
