import { describe, expect, it } from 'vitest'
import { runPrecompute } from './precompute'
import { BeatAction } from './actions'

const ACTIONS: BeatAction[] = [
  { type: 'sceneSwap', stageKind: 'apparatus' },
  { type: 'spawnBlock', id: 'a', label: 'first', color: 'muted' },
  { type: 'stop' },

  { type: 'promoteBlock', id: 'a' },
  { type: 'setGauge', percent: 40 },
  { type: 'stop' },

  { type: 'moveGaze', target: 'app' },
  { type: 'stop' },
]

describe('runPrecompute', () => {
  it('produces one checkpoint per stop, in script order', () => {
    const checkpoints = runPrecompute(ACTIONS)
    expect(checkpoints).toHaveLength(3)
    expect(checkpoints[0].chatBlocks).toEqual([{ id: 'a', label: 'first', color: 'muted', highlighted: false }])
    expect(checkpoints[1].windowBlocks).toEqual([{ id: 'a', label: 'first', color: 'muted', highlighted: false }])
    expect(checkpoints[1].chatBlocks).toEqual([])
    expect(checkpoints[1].gauge).toEqual({ percent: 40, overflowed: false })
    expect(checkpoints[2].gaze).toBe('app')
  })

  it('is deterministic across runs and never waits on real time', () => {
    const start = Date.now()
    const a = runPrecompute(ACTIONS)
    const b = runPrecompute(ACTIONS)
    const elapsed = Date.now() - start

    expect(a).toEqual(b)
    expect(elapsed).toBeLessThan(50)
  })

  it('sectionIndex advances with checkpoint order', () => {
    const checkpoints = runPrecompute(ACTIONS)
    expect(checkpoints.map((c) => c.sectionIndex)).toEqual([0, 1, 2])
  })
})
