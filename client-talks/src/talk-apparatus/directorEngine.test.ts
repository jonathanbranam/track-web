import { describe, expect, it } from 'vitest'
import { ApparatusDirectorEngine } from './directorEngine'
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

function createEngine() {
  const checkpoints = runPrecompute(ACTIONS)
  return { engine: new ApparatusDirectorEngine(ACTIONS, checkpoints), checkpoints }
}

describe('ApparatusDirectorEngine.next', () => {
  it('applies the next checkpoint synchronously and converges with the precomputed snapshot', () => {
    const { engine, checkpoints } = createEngine()

    engine.next()

    const snapshot = engine.getSnapshot()
    expect(snapshot.status).toBe('RESTING')
    expect(snapshot.checkpointIndex).toBe(0)
    expect(snapshot.resting).toEqual(checkpoints[0])
  })

  it('is a no-op once every action has been consumed', () => {
    const { engine } = createEngine()
    engine.next()
    engine.next()
    engine.next()
    const after = engine.getSnapshot()

    engine.next()
    expect(engine.getSnapshot()).toEqual(after)
  })

  it('reports the upcoming action via nextAction, and null once the script is exhausted', () => {
    const { engine } = createEngine()
    expect(engine.getSnapshot().nextAction).toEqual({ type: 'sceneSwap', stageKind: 'apparatus' })

    engine.next()
    engine.next()
    engine.next()
    expect(engine.getSnapshot().nextAction).toBeNull()
  })
})

describe('ApparatusDirectorEngine.back / skipTo', () => {
  it('applies the correct checkpoint at any distance, forward and backward', () => {
    const { engine, checkpoints } = createEngine()

    engine.skipTo(2)
    expect(engine.getSnapshot().resting).toEqual(checkpoints[2])

    engine.back()
    expect(engine.getSnapshot().resting).toEqual(checkpoints[1])

    engine.skipTo(0)
    expect(engine.getSnapshot().resting).toEqual(checkpoints[0])
  })
})

describe('ApparatusDirectorEngine.skipForward', () => {
  it('matches what next() would have produced, since state application is always synchronous', () => {
    const { engine: viaNext, checkpoints } = createEngine()
    viaNext.next()

    const { engine: viaSkip } = createEngine()
    viaSkip.skipForward()

    expect(viaSkip.getSnapshot().resting).toEqual(viaNext.getSnapshot().resting)
    expect(viaSkip.getSnapshot().resting).toEqual(checkpoints[0])
  })

  it('is a no-op past the last checkpoint', () => {
    const { engine, checkpoints } = createEngine()
    engine.skipTo(2)
    engine.skipForward()

    expect(engine.getSnapshot().resting).toEqual(checkpoints[2])
    expect(engine.getSnapshot().checkpointIndex).toBe(2)
  })
})

describe('ApparatusDirectorEngine.restart', () => {
  it('returns to the state before the first checkpoint', () => {
    const { engine } = createEngine()
    engine.skipTo(2)

    engine.restart()

    const snapshot = engine.getSnapshot()
    expect(snapshot.checkpointIndex).toBe(-1)
    expect(snapshot.resting.chatBlocks).toEqual([])
    expect(snapshot.resting.stageKind).toBe('coldOpen')
  })
})

describe('ApparatusDirectorEngine.pause / resume', () => {
  it('toggles the paused flag without touching resting state (no-op kept for control-surface parity)', () => {
    const { engine } = createEngine()
    engine.next()
    const before = engine.getSnapshot().resting

    engine.pause()
    expect(engine.getSnapshot().paused).toBe(true)
    expect(engine.getSnapshot().resting).toEqual(before)

    engine.resume()
    expect(engine.getSnapshot().paused).toBe(false)
    expect(engine.getSnapshot().resting).toEqual(before)
  })
})
