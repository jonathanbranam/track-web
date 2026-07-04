import { describe, expect, it } from 'vitest'
import { runPrecompute } from './precompute'
import { Action, GameMap } from './script'

const MAP: GameMap = {
  sceneId: 'test-map',
  entities: [{ id: 'pc', x: 0, y: 0 }],
}

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
    const checkpoints = runPrecompute(ACTIONS, MAP)
    expect(checkpoints).toHaveLength(3)
    expect(checkpoints[0].entities.pc).toMatchObject({ x: 2, y: 0, facing: 'right' })
    expect(checkpoints[1].dialogue).toEqual({ open: false, text: '' })
    expect(checkpoints[2].entities.pc).toMatchObject({ x: 2, y: 1, facing: 'down' })
  })

  it('is deterministic across runs and never waits on real time', () => {
    const start = Date.now()
    const a = runPrecompute(ACTIONS, MAP)
    const b = runPrecompute(ACTIONS, MAP)
    const elapsed = Date.now() - start

    expect(a).toEqual(b)
    expect(elapsed).toBeLessThan(50)
  })
})
