import { describe, expect, it } from 'vitest'
import { ApparatusDirectorEngine } from './directorEngine'
import { runPrecompute } from './precompute'
import { BeatAction } from './actions'

// A two-scene script mirroring coldOpen -> apparatus, with one checkpoint per scene.
const ACTIONS: BeatAction[] = [
  { type: 'sceneSwap', stageKind: 'coldOpen' },
  { type: 'flipStatus', key: 'tickerHeadline', value: 'headline' },
  { type: 'stop' }, // checkpoint 0: last coldOpen beat

  { type: 'sceneSwap', stageKind: 'apparatus' },
  { type: 'moveGaze', target: 'app' },
  { type: 'stop' }, // checkpoint 1: first apparatus beat
]

describe('scene-swap reversibility', () => {
  it('back() from the first apparatus beat lands on the prior scene\'s last beat', () => {
    const checkpoints = runPrecompute(ACTIONS)
    const engine = new ApparatusDirectorEngine(ACTIONS, checkpoints)

    engine.skipTo(1)
    expect(engine.getSnapshot().resting.stageKind).toBe('apparatus')

    engine.back()
    expect(engine.getSnapshot().resting.stageKind).toBe('coldOpen')
    expect(engine.getSnapshot().resting).toEqual(checkpoints[0])
  })

  it('next() across the boundary transitions stageKind from coldOpen to apparatus', () => {
    const checkpoints = runPrecompute(ACTIONS)
    const engine = new ApparatusDirectorEngine(ACTIONS, checkpoints)

    engine.next()
    expect(engine.getSnapshot().resting.stageKind).toBe('coldOpen')

    engine.next()
    expect(engine.getSnapshot().resting.stageKind).toBe('apparatus')
    expect(engine.getSnapshot().resting).toEqual(checkpoints[1])
  })
})
