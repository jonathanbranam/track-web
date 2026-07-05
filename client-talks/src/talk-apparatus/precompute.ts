import { BeatAction, applyBeatAction } from './actions'
import { ApparatusState, createInitialState, snapshotState } from './state'

/**
 * Runs the entire beat list once, headlessly (no real timers, no animation
 * waiting), recording a state snapshot at every `stop`. Running the same
 * beat list through this twice always produces identical snapshots.
 */
export function runPrecompute(actions: BeatAction[]): ApparatusState[] {
  let state = createInitialState()
  const checkpoints: ApparatusState[] = []
  for (const action of actions) {
    if (action.type !== 'stop') {
      state = applyBeatAction(state, action)
    }
    if (action.type === 'stop') {
      checkpoints.push(snapshotState(state, checkpoints.length))
    }
  }
  return checkpoints
}
