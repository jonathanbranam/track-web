import { describe, expect, it } from 'vitest'
import { runPrecompute } from '../precompute'
import { MAPS } from '../script'
import { SCRIPTS } from './index'

describe('SCRIPTS registry', () => {
  it('has unique ids', () => {
    const ids = SCRIPTS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every entry has a non-empty actions array', () => {
    for (const script of SCRIPTS) {
      expect(script.actions.length).toBeGreaterThan(0)
    }
  })

  it('every entry\'s initialSceneId exists in MAPS', () => {
    for (const script of SCRIPTS) {
      expect(MAPS[script.initialSceneId]).toBeDefined()
    }
  })

  it('every entry precomputes without throwing', () => {
    for (const script of SCRIPTS) {
      expect(() => runPrecompute(script.actions, MAPS, script.initialSceneId)).not.toThrow()
    }
  })
})
