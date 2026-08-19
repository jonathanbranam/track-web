import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { gridCols, gridRows, playerSpawnZone, enemySpawners } from '@repo/dungeon-engine'
import type { ContentMap } from '@repo/dungeon-engine'
import { loadFromServer, loadMapById, loadedMap, reset } from './contentStoreLoader'

// The host half of the content store: fetching a Map and falling back to the
// bundled board. Deserialization and the board getters live in the engine
// package and are covered by its own `contentStore.test.ts`.

// A 3×2 board, deliberately unlike the 16×8 bundled map so a successful load is
// unmistakable.
const TINY_MAP: ContentMap = {
  id: 'map-tiny',
  regionId: 'region-1',
  name: 'Tiny',
  order: 0,
  size: { cols: 3, rows: 2 },
  terrain: [
    ['plains', 'plains', 'plains'],
    ['plains', 'plains', 'plains'],
  ],
  objects: [],
  enemySpawnZone: ['0,0'],
  playerSpawnZone: ['2,1'],
}

function stubFetch(maps: Record<string, ContentMap>, defaultId: string | null) {
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    const byId = path.match(/\/content\/maps\/([^/]+)$/)
    if (byId) {
      const map = maps[decodeURIComponent(byId[1])]
      if (!map) return { ok: false, status: 404 } as Response
      return { ok: true, json: async () => ({ map, encounters: [] }) } as Response
    }
    if (path.endsWith('/content/default')) {
      if (!defaultId) return { ok: false, status: 500 } as Response
      const map = maps[defaultId]
      return { ok: true, json: async () => ({ region: {}, map, encounter: {} }) } as Response
    }
    return { ok: false, status: 404 } as Response
  }))
}

function expectBundledBoard() {
  expect(gridCols()).toBe(16)
  expect(gridRows()).toBe(8)
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  reset()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('loadFromServer', () => {
  it("applies the server's default map to the engine store", async () => {
    stubFetch({ 'map-tiny': TINY_MAP }, 'map-tiny')
    expect(await loadFromServer()).toEqual({ ok: true, mapId: 'map-tiny' })
    expect(gridCols()).toBe(3)
    expect(gridRows()).toBe(2)
    expect(playerSpawnZone()).toEqual(new Set(['2,1']))
    expect(enemySpawners()).toEqual([{ col: 0, row: 0 }])
    expect(loadedMap()).toBe('map-tiny')
  })

  it('keeps the bundled map playable when the fetch fails', async () => {
    stubFetch({}, null)
    expect(await loadFromServer()).toEqual({ ok: false, mapId: null })
    expectBundledBoard()
    expect(loadedMap()).toBe(null)
  })
})

describe('loadMapById', () => {
  it('applies the requested map to the engine store', async () => {
    stubFetch({ 'map-tiny': TINY_MAP }, null)
    expect(await loadMapById('map-tiny')).toEqual({ ok: true, mapId: 'map-tiny' })
    expect(gridCols()).toBe(3)
    expect(loadedMap()).toBe('map-tiny')
  })

  it('leaves the current board alone when the map is missing', async () => {
    stubFetch({ 'map-tiny': TINY_MAP }, null)
    expect(await loadMapById('map-gone')).toEqual({ ok: false, mapId: null })
    expectBundledBoard()
    expect(loadedMap()).toBe(null)
  })
})
