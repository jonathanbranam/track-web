import { describe, expect, it } from 'vitest'
import { runPrecompute } from './precompute'
import { Action, GameMap } from './script'

const TOWN: GameMap = {
  sceneId: 'test-town',
  width: 5,
  height: 5,
  tiles: new Array(25).fill(0),
  walkableGrid: new Array(25).fill(true),
  namedLocations: { plaza: { x: 4, y: 0 } },
  entities: [{ id: 'pc', x: 0, y: 0 }],
}

const CAVE: GameMap = {
  sceneId: 'test-cave',
  width: 3,
  height: 3,
  tiles: new Array(9).fill(0),
  walkableGrid: new Array(9).fill(true),
  namedLocations: { torch: { x: 2, y: 2 } },
  entities: [
    { id: 'pc', x: 0, y: 0 },
    { id: 'bat', x: 1, y: 1 },
  ],
}

const MAPS: Record<string, GameMap> = { [TOWN.sceneId]: TOWN, [CAVE.sceneId]: CAVE }

const ACTIONS: Action[] = [
  { type: 'walk', entity: 'pc', path: [{ direction: 'right', steps: 2 }] },
  { type: 'pause', seconds: 3 },
  { type: 'stop' },

  { type: 'startDialogue' },
  { type: 'say', text: 'hi' },
  { type: 'endDialogue' },
  { type: 'stop' },

  { type: 'walk', entity: 'pc', path: [{ direction: 'down', steps: 1 }] },
  { type: 'stop' },
]

describe('runPrecompute', () => {
  it('produces one checkpoint per stop, in script order', () => {
    const checkpoints = runPrecompute(ACTIONS, MAPS, TOWN.sceneId)
    expect(checkpoints).toHaveLength(3)
    expect(checkpoints[0].entities.pc).toMatchObject({ x: 2, y: 0, facing: 'right' })
    expect(checkpoints[0].camera).toEqual({ x: 2, y: 0, zoom: 1 })
    expect(checkpoints[1].dialogue).toEqual({ open: false, text: '' })
    expect(checkpoints[2].entities.pc).toMatchObject({ x: 2, y: 1, facing: 'down' })
  })

  it('is deterministic across runs and never waits on real time', () => {
    const start = Date.now()
    const a = runPrecompute(ACTIONS, MAPS, TOWN.sceneId)
    const b = runPrecompute(ACTIONS, MAPS, TOWN.sceneId)
    const elapsed = Date.now() - start

    expect(a).toEqual(b)
    expect(elapsed).toBeLessThan(50)
  })

  it('resolves walkTo to a named location, pathfinding around the grid', () => {
    const actions: Action[] = [
      { type: 'walkTo', entity: 'pc', target: 'plaza' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.entities.pc).toMatchObject({ x: 4, y: 0, facing: 'right' })
  })

  it('walkTo is a no-op when the target is unreachable', () => {
    const blocked: GameMap = {
      ...TOWN,
      sceneId: 'test-blocked',
      walkableGrid: TOWN.walkableGrid.map((_, i) => i !== 4), // wall off the plaza tile itself
    }
    const maps = { [blocked.sceneId]: blocked }
    const actions: Action[] = [
      { type: 'walkTo', entity: 'pc', target: 'plaza' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, maps, blocked.sceneId)
    expect(checkpoint.entities.pc).toMatchObject({ x: 0, y: 0, facing: 'down' })
  })

  it('walkTo resolves another entity\'s current position as the target', () => {
    const actions: Action[] = [
      { type: 'walkTo', entity: 'pc', target: 'bat' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, CAVE.sceneId)
    expect(checkpoint.entities.pc).toMatchObject({ x: 1, y: 1 })
  })

  it('enterScene switches the active scene, resets NPCs, and repositions pc at a named location', () => {
    const actions: Action[] = [
      { type: 'enterScene', scene: 'test-cave', at: 'torch' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.sceneId).toBe('test-cave')
    expect(checkpoint.entities.pc).toMatchObject({ x: 2, y: 2 })
    expect(checkpoint.entities.bat).toMatchObject({ x: 1, y: 1 })
    expect(checkpoint.camera).toEqual({ x: 2, y: 2, zoom: 1 })
  })
})
