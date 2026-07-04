import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DirectorEngine } from './directorEngine'
import { runPrecompute } from './precompute'
import { Action, BATTLE_SCENE_ID, GameMap } from './script'

const MAP: GameMap = {
  sceneId: 'test-map',
  width: 5,
  height: 5,
  tiles: new Array(25).fill(0),
  walkableGrid: new Array(25).fill(true),
  namedLocations: {},
  entities: [{ id: 'pc', x: 0, y: 0 }],
}
const MAPS: Record<string, GameMap> = { [MAP.sceneId]: MAP }

const ACTIONS: Action[] = [
  { type: 'walk', entity: 'pc', path: [{ direction: 'right', steps: 3 }] },
  { type: 'stop' },

  { type: 'walk', entity: 'pc', path: [{ direction: 'down', steps: 2 }] },
  { type: 'stop' },

  { type: 'walk', entity: 'pc', path: [{ direction: 'left', steps: 1 }] },
  { type: 'stop' },
]

function createEngine() {
  const checkpoints = runPrecompute(ACTIONS, MAPS, MAP.sceneId)
  return { engine: new DirectorEngine(ACTIONS, MAPS, MAP.sceneId, checkpoints), checkpoints }
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

describe('DirectorEngine.skipForward', () => {
  it('completes an in-flight animation instantly, landing on the precomputed checkpoint', () => {
    const { engine, checkpoints } = createEngine()

    engine.next()
    vi.advanceTimersByTime(220) // one step into a 3-step walk
    engine.skipForward()

    const snapshot = engine.getSnapshot()
    expect(snapshot.status).toBe('RESTING')
    expect(snapshot.checkpointIndex).toBe(0)
    expect(snapshot.resting).toEqual(checkpoints[0])
  })

  it('does not let the cancelled animation resume after the fact', () => {
    const { engine, checkpoints } = createEngine()

    engine.next()
    vi.advanceTimersByTime(220) // one step into a 3-step walk toward checkpoint 0
    engine.skipForward() // jump straight to checkpoint 0

    // If the walk executor's pending timer weren't cancelled, it would still
    // fire here and silently drag the engine into segment 2's actions even
    // though the engine believes it's at rest on checkpoint 0.
    vi.runAllTimers()

    const snapshot = engine.getSnapshot()
    expect(snapshot.status).toBe('RESTING')
    expect(snapshot.checkpointIndex).toBe(0)
    expect(snapshot.resting).toEqual(checkpoints[0])
  })

  it('advances one checkpoint instantly when already at rest', () => {
    const { engine, checkpoints } = createEngine()

    engine.skipForward()
    expect(engine.getSnapshot().resting).toEqual(checkpoints[0])
    expect(engine.getSnapshot().status).toBe('RESTING')

    engine.skipForward()
    expect(engine.getSnapshot().resting).toEqual(checkpoints[1])
  })

  it('is a no-op past the last checkpoint', () => {
    const { engine, checkpoints } = createEngine()

    engine.skipTo(2)
    engine.skipForward()

    expect(engine.getSnapshot().resting).toEqual(checkpoints[2])
    expect(engine.getSnapshot().checkpointIndex).toBe(2)
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

describe('DirectorEngine battle skipTo', () => {
  const BATTLE: GameMap = {
    sceneId: BATTLE_SCENE_ID,
    width: 10,
    height: 6,
    tiles: new Array(60).fill(0),
    walkableGrid: new Array(60).fill(false),
    namedLocations: { allySlot: { x: 8, y: 3 }, enemySlot0: { x: 1, y: 2 } },
    entities: [],
  }
  const BATTLE_MAPS: Record<string, GameMap> = { ...MAPS, [BATTLE.sceneId]: BATTLE }

  const BATTLE_ACTIONS: Action[] = [
    { type: 'startBattle', ally: { id: 'pc', hp: 20, maxHp: 20 }, enemies: [{ id: 'slime', hp: 12, maxHp: 12 }] },
    { type: 'stop' },

    { type: 'battleAction', actor: 'pc', target: 'slime', kind: 'attack', damage: 7, text: 'Hit!' },
    { type: 'stop' },

    { type: 'battleAction', actor: 'pc', target: 'slime', kind: 'wrong-action', damage: -5, text: 'Oops!' },
    { type: 'stop' },
  ]

  it('reproduces the same combatant HP via skipTo as via live playback', () => {
    const checkpoints = runPrecompute(BATTLE_ACTIONS, BATTLE_MAPS, MAP.sceneId)

    const livePlayed = new DirectorEngine(BATTLE_ACTIONS, BATTLE_MAPS, MAP.sceneId, checkpoints)
    livePlayed.next()
    vi.runAllTimers()
    livePlayed.next()
    vi.runAllTimers()
    livePlayed.next()
    vi.runAllTimers()

    const skipped = new DirectorEngine(BATTLE_ACTIONS, BATTLE_MAPS, MAP.sceneId, checkpoints)
    skipped.skipTo(2)

    expect(skipped.getSnapshot().resting.battle).toEqual(livePlayed.getSnapshot().resting.battle)
    expect(skipped.getSnapshot().resting.battle).toEqual(checkpoints[2].battle)
  })
})
