import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getMaxHp, getAllDefs, unitDefs } from '@repo/dungeon-engine'
import type { UnitDef } from '@repo/dungeon-engine'
import { loadFromServer, loadScenario, loadedScenario, reset } from './defStoreLoader'

// The host half of the def store: fetching, falling back to the bundled table,
// and remembering the active scenario per browser. The engine package holds the
// in-memory table and is covered by its own `defStore.test.ts`.

const ACTIVE_KEY = 'dungeon-tactics:active-scenario'

function stubLocalStorage(seed: Record<string, string> = {}) {
  const store = new Map(Object.entries(seed))
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
  })
  return store
}

// Serve a def map per scenario id; a missing id 404s the way the server would.
function stubFetch(scenarios: Record<string, Partial<Record<string, UnitDef>>>, defaultId: string | null) {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    calls.push(path)
    const scenarioMatch = path.match(/\/scenarios\/([^/]+)\/unit-defs$/)
    if (scenarioMatch) {
      const defs = scenarios[decodeURIComponent(scenarioMatch[1])]
      if (!defs) return { ok: false, status: 404 } as Response
      return { ok: true, json: async () => ({ scenarioId: scenarioMatch[1], unitDefs: defs }) } as Response
    }
    if (path.endsWith('/unit-defs')) {
      if (!defaultId) return { ok: false, status: 500 } as Response
      return { ok: true, json: async () => ({ scenarioId: defaultId, unitDefs: scenarios[defaultId] }) } as Response
    }
    return { ok: false, status: 404 } as Response
  }))
  return calls
}

const meleeHp = (hp: number): Record<string, UnitDef> => ({ melee: { ...unitDefs.melee, maxHp: hp } })

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  reset()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('loadFromServer', () => {
  it("loads the server's default scenario when nothing is remembered", async () => {
    stubLocalStorage()
    stubFetch({ 'sc-default': meleeHp(11) }, 'sc-default')
    const res = await loadFromServer()
    expect(res).toEqual({ ok: true, scenarioId: 'sc-default' })
    expect(getMaxHp('melee')).toBe(11)
    expect(loadedScenario()).toBe('sc-default')
  })

  it('prefers the remembered per-browser selection over the default', async () => {
    stubLocalStorage({ [ACTIVE_KEY]: 'sc-picked' })
    stubFetch({ 'sc-default': meleeHp(11), 'sc-picked': meleeHp(14) }, 'sc-default')
    const res = await loadFromServer()
    expect(res).toEqual({ ok: true, scenarioId: 'sc-picked' })
    expect(getMaxHp('melee')).toBe(14)
  })

  it('forgets a stale selection and falls back to the default', async () => {
    const stored = stubLocalStorage({ [ACTIVE_KEY]: 'sc-deleted' })
    stubFetch({ 'sc-default': meleeHp(11) }, 'sc-default')
    const res = await loadFromServer()
    expect(res).toEqual({ ok: true, scenarioId: 'sc-default' })
    expect(stored.has(ACTIVE_KEY)).toBe(false)
  })

  it('keeps the bundled defaults playable when every fetch fails', async () => {
    stubLocalStorage()
    stubFetch({}, null)
    const res = await loadFromServer()
    expect(res).toEqual({ ok: false, scenarioId: null })
    expect(getAllDefs()).toEqual(unitDefs)
    expect(loadedScenario()).toBe(null)
  })
})

describe('loadScenario', () => {
  it('swaps the store and remembers the selection for next time', async () => {
    const stored = stubLocalStorage()
    stubFetch({ 'sc-b': meleeHp(16) }, 'sc-a')
    expect(await loadScenario('sc-b')).toEqual({ ok: true })
    expect(getMaxHp('melee')).toBe(16)
    expect(loadedScenario()).toBe('sc-b')
    expect(stored.get(ACTIVE_KEY)).toBe('sc-b')
  })

  it('leaves the store and the remembered selection alone when the fetch fails', async () => {
    const stored = stubLocalStorage()
    stubFetch({ 'sc-b': meleeHp(16) }, 'sc-a')
    await loadScenario('sc-b')
    expect(await loadScenario('sc-missing')).toEqual({ ok: false })
    expect(getMaxHp('melee')).toBe(16)
    expect(stored.get(ACTIVE_KEY)).toBe('sc-b')
  })
})
