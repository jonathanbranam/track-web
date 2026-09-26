import { describe, it, expect } from 'vitest'
import { DEFAULT_TUNING, cloneTuning } from './physics'
import { DEFAULT_SETTINGS } from './aim'
import {
  LEVEL_KEY,
  SETTINGS_KEY,
  TUNING_KEY,
  clearTuning,
  loadLastLevel,
  loadSettings,
  loadTuning,
  saveLastLevel,
  saveSettings,
  saveTuning,
  type KV,
} from './storage'

function memory(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

const throwing: KV = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
  removeItem: () => {
    throw new Error('blocked')
  },
}

describe('settings', () => {
  it('defaults to prograde, timed release, pause on, slow motion on', () => {
    expect(loadSettings(memory())).toEqual(DEFAULT_SETTINGS)
  })

  it('round-trips', () => {
    const s = memory()
    const v = { shot: 'vector', release: 'planned', pause: false, slowMo: false, slowMoSpeed: 0.2 } as const
    saveSettings(v, s)
    expect(loadSettings(s)).toEqual(v)
  })

  it('fills in defaults for settings saved before shot and slow motion existed', () => {
    const s = memory()
    s.setItem(SETTINGS_KEY, '{"release":"planned","pause":false}')
    expect(loadSettings(s)).toEqual({ ...DEFAULT_SETTINGS, release: 'planned', pause: false })
  })

  it('clamps the slow-motion speed', () => {
    const s = memory()
    s.setItem(SETTINGS_KEY, '{"slowMoSpeed":0.01}')
    expect(loadSettings(s).slowMoSpeed).toBe(0.1)
  })

  it('ignores garbage', () => {
    const s = memory()
    s.setItem(SETTINGS_KEY, '{"release":"sideways","pause":"yes"}')
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS)
    s.setItem(SETTINGS_KEY, 'not json')
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS)
  })
})

describe('tuning', () => {
  it('stores only overrides and layers them over the defaults', () => {
    const s = memory()
    const t = cloneTuning()
    t.launchBoost = 999
    saveTuning(t, s)
    expect(JSON.parse(s.data.get(TUNING_KEY)!)).toEqual({ launchBoost: 999 })
    expect(loadTuning(s)).toEqual({ ...DEFAULT_TUNING, launchBoost: 999 })
  })

  it('ignores unknown keys and wrong types', () => {
    const s = memory()
    s.setItem(TUNING_KEY, JSON.stringify({ G: 'lots', nope: 3, influenceZones: false, maxSpeed: null }))
    expect(loadTuning(s)).toEqual({ ...DEFAULT_TUNING, influenceZones: false })
  })

  it('saving the defaults, or clearing, removes the entry', () => {
    const s = memory()
    s.setItem(TUNING_KEY, '{"G":1}')
    saveTuning(cloneTuning(), s)
    expect(s.data.has(TUNING_KEY)).toBe(false)
    s.setItem(TUNING_KEY, '{"G":1}')
    clearTuning(s)
    expect(s.data.has(TUNING_KEY)).toBe(false)
  })
})

describe('last level', () => {
  const ids = ['a', 'b', 'c']

  it('remembers the last level played', () => {
    const s = memory()
    saveLastLevel('c', s)
    expect(loadLastLevel(ids, s)).toEqual({ id: 'c', stale: false })
  })

  it('falls back to the first level, flagging a stale id', () => {
    const s = memory()
    expect(loadLastLevel(ids, s)).toEqual({ id: 'a', stale: false })
    s.setItem(LEVEL_KEY, 'gone')
    expect(loadLastLevel(ids, s)).toEqual({ id: 'a', stale: true })
  })
})

describe('storage that throws or is missing', () => {
  it('falls back to defaults and never throws', () => {
    for (const s of [throwing, null]) {
      expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS)
      expect(loadTuning(s)).toEqual(DEFAULT_TUNING)
      expect(loadLastLevel(['x'], s).id).toBe('x')
      expect(() => saveSettings({ ...DEFAULT_SETTINGS, release: 'planned' }, s)).not.toThrow()
      expect(() => saveTuning(cloneTuning(), s)).not.toThrow()
      expect(() => saveLastLevel('x', s)).not.toThrow()
    }
  })
})
