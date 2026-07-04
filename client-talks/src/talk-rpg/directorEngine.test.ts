import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DirectorEngine } from './directorEngine'
import { runPrecompute } from './precompute'
import { Action, GameMap } from './script'

const MAP: GameMap = {
  sceneId: 'test-map',
  entities: [{ id: 'pc', x: 0, y: 0 }],
}

const ACTIONS: Action[] = [
  { type: 'walk', entity: 'pc', path: [{ direction: 'right', steps: 3 }] },
  { type: 'stop' },

  { type: 'walk', entity: 'pc', path: [{ direction: 'down', steps: 2 }] },
  { type: 'stop' },

  { type: 'walk', entity: 'pc', path: [{ direction: 'left', steps: 1 }] },
  { type: 'stop' },
]

function createEngine() {
  const checkpoints = runPrecompute(ACTIONS, MAP)
  return { engine: new DirectorEngine(ACTIONS, MAP, checkpoints), checkpoints }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DirectorEngine.next', () => {
  it('plays a full segment and converges with the precomputed checkpoint', () => {
    const { engine, checkpoints } = createEngine()

    engine.next()
    vi.runAllTimers()

    const snapshot = engine.getSnapshot()
    expect(snapshot.status).toBe('RESTING')
    expect(snapshot.checkpointIndex).toBe(0)
    expect(snapshot.resting).toEqual(checkpoints[0])
  })

  it('is a no-op mid-playback', () => {
    const { engine } = createEngine()

    engine.next()
    vi.advanceTimersByTime(50)
    const mid = engine.getSnapshot()

    engine.next()
    expect(engine.getSnapshot()).toEqual(mid)
  })
})

describe('DirectorEngine.back / skipTo', () => {
  it('applies the correct resting state at arbitrary distance, forward and backward', () => {
    const { engine, checkpoints } = createEngine()

    engine.skipTo(2)
    expect(engine.getSnapshot().resting).toEqual(checkpoints[2])
    expect(engine.getSnapshot().checkpointIndex).toBe(2)

    engine.back()
    expect(engine.getSnapshot().resting).toEqual(checkpoints[1])

    engine.skipTo(0)
    expect(engine.getSnapshot().resting).toEqual(checkpoints[0])
  })
})

describe('DirectorEngine.pause / resume', () => {
  it('halts a mid-walk in place and resumes toward the same final destination', () => {
    const { engine, checkpoints } = createEngine()

    engine.next()
    vi.advanceTimersByTime(220) // exactly one step
    engine.pause()
    const paused = engine.getSnapshot().resting.entities.pc

    vi.advanceTimersByTime(1000) // must not move further while paused
    expect(engine.getSnapshot().resting.entities.pc).toEqual(paused)

    engine.resume()
    vi.runAllTimers()
    expect(engine.getSnapshot().resting).toEqual(checkpoints[0])
  })

  it('is a no-op when already at rest', () => {
    const { engine } = createEngine()
    const before = engine.getSnapshot()

    engine.pause()
    expect(engine.getSnapshot()).toEqual(before)
  })
})
