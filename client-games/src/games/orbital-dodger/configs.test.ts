import { describe, it, expect, vi, afterEach } from 'vitest'
import { DEFAULT_TUNING, cloneTuning } from './physics'
import {
  resolveTuning,
  tuningEquals,
  pickConfig,
  loadSelectedId,
  saveSelectedId,
  clearSelectedId,
  SELECTED_KEY,
  type OrbitalConfig,
} from './configs'

const cfg = (id: number, name: string, isDefault = false): OrbitalConfig => ({
  id,
  name,
  isDefault,
  tuning: {},
  updatedAt: '2026-09-25T00:00:00.000Z',
})

describe('resolveTuning', () => {
  it('returns the shipped defaults for an empty or missing config', () => {
    expect(resolveTuning({})).toEqual(DEFAULT_TUNING)
    expect(resolveTuning(null)).toEqual(DEFAULT_TUNING)
  })

  it('takes stored values of the right type and keeps defaults for missing keys', () => {
    const t = resolveTuning({ G: 1200, influenceZones: false, edgeMode: 'bounded' })
    expect(t.G).toBe(1200)
    expect(t.influenceZones).toBe(false)
    expect(t.edgeMode).toBe('bounded')
    expect(t.thrust).toBe(DEFAULT_TUNING.thrust)
  })

  it('ignores wrong-type values, non-finite numbers and invalid enum options', () => {
    const t = resolveTuning({ G: '1200', thrust: null, maxSpeed: Infinity, orbitCapture: 1, controlMode: 'tilt' })
    expect(t.G).toBe(DEFAULT_TUNING.G)
    expect(t.thrust).toBe(DEFAULT_TUNING.thrust)
    expect(t.maxSpeed).toBe(DEFAULT_TUNING.maxSpeed)
    expect(t.orbitCapture).toBe(DEFAULT_TUNING.orbitCapture)
    expect(t.controlMode).toBe(DEFAULT_TUNING.controlMode)
  })

  it('drops unknown keys', () => {
    expect(resolveTuning({ retiredKnob: 5 })).not.toHaveProperty('retiredKnob')
  })

  it('never returns the shared DEFAULT_TUNING object', () => {
    expect(resolveTuning({})).not.toBe(DEFAULT_TUNING)
  })
})

describe('tuningEquals', () => {
  it('compares every key', () => {
    const a = cloneTuning()
    const b = cloneTuning()
    expect(tuningEquals(a, b)).toBe(true)
    b.edgeMode = b.edgeMode === 'wrap' ? 'bounded' : 'wrap'
    expect(tuningEquals(a, b)).toBe(false)
  })
})

describe('pickConfig', () => {
  const configs = [cfg(1, 'Default', true), cfg(2, 'Floaty')]

  it('uses the remembered config when it exists', () => {
    expect(pickConfig(configs, 2)).toEqual({ config: configs[1], stale: false })
  })

  it('falls back to the Default with no selection', () => {
    expect(pickConfig(configs, null)).toEqual({ config: configs[0], stale: false })
  })

  it('falls back to the Default and reports a stale id when the config is gone', () => {
    expect(pickConfig(configs, 7)).toEqual({ config: configs[0], stale: true })
  })

  it('returns no config for an empty list', () => {
    expect(pickConfig([], 2).config).toBeNull()
  })
})

describe('selected-id storage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('round-trips through localStorage', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
    expect(loadSelectedId()).toBeNull()
    saveSelectedId(4)
    expect(store.get(SELECTED_KEY)).toBe('4')
    expect(loadSelectedId()).toBe(4)
    store.set(SELECTED_KEY, 'garbage')
    expect(loadSelectedId()).toBeNull()
    clearSelectedId()
    expect(store.has(SELECTED_KEY)).toBe(false)
  })

  it('treats a throwing localStorage as no selection', () => {
    const boom = () => {
      throw new Error('blocked')
    }
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom, removeItem: boom })
    expect(loadSelectedId()).toBeNull()
    expect(() => saveSelectedId(3)).not.toThrow()
    expect(() => clearSelectedId()).not.toThrow()
  })
})
