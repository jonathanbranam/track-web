import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import { setupTestDb } from '../test-utils/db'
import { SqliteGameRoomRepository } from '../repositories/sqlite/gameRooms'
import { SqliteGameScenarioRepository } from '../repositories/sqlite/gameScenarios'
import { SqliteGameUnitDefRepository } from '../repositories/sqlite/gameUnitDefs'
import { SqliteGameContentRepository } from '../repositories/sqlite/gameContent'
import { BUNDLED_MAP } from '../games/dungeon-tactics/map'
import { DUNGEON_TACTICS_SLUG } from '../games/dungeon-tactics/unitDefs'
import { createGamesRouter } from './games'
import { createSessionMiddleware } from '../middleware/auth'
import { createSession } from '../utils/session'

const BASE = `/${DUNGEON_TACTICS_SLUG}/content`

describe('dungeon-tactics content routes', () => {
  const { db, userRepo } = setupTestDb()
  let app: Hono
  let cookie: string

  beforeAll(async () => {
    const hash = await bcrypt.hash('password', 4)
    const user = userRepo.upsert('designer@example.com', hash)
    cookie = `sid=${createSession(user.id, user.sessionNonce)}`

    const contentRepo = new SqliteGameContentRepository(db)
    contentRepo.seedDefaultIfEmpty(BUNDLED_MAP)

    const gameRoomRepo = new SqliteGameRoomRepository(db)
    const scenarioRepo = new SqliteGameScenarioRepository(db)
    const unitDefRepo = new SqliteGameUnitDefRepository(db)
    app = new Hono()
    app.use('/*', createSessionMiddleware(userRepo))
    app.route('/', createGamesRouter(gameRoomRepo, scenarioRepo, unitDefRepo, contentRepo))
  })

  const authed = (path: string) =>
    app.request(path, { headers: { Cookie: cookie } })

  it('GET content/default returns the seeded region/map/encounter', async () => {
    const res = await authed(`${BASE}/default`)
    expect(res.status).toBe(200)
    const body = await res.json() as { region: { id: string }; map: { id: string }; encounter: { id: string } }
    expect(body.region.id).toBe('default')
    expect(body.map.id).toBe('default')
    expect(body.encounter.id).toBe('default')
  })

  it('GET content/regions lists the seeded region', async () => {
    const res = await authed(`${BASE}/regions`)
    expect(res.status).toBe(200)
    const body = await res.json() as { regions: { id: string }[] }
    expect(body.regions).toHaveLength(1)
    expect(body.regions[0].id).toBe('default')
  })

  it('GET content/regions/:id returns the region and its maps', async () => {
    const res = await authed(`${BASE}/regions/default`)
    expect(res.status).toBe(200)
    const body = await res.json() as { region: { id: string }; maps: { id: string }[] }
    expect(body.region.id).toBe('default')
    expect(body.maps.map(m => m.id)).toEqual(['default'])
  })

  it('GET content/maps/:id returns the map and its encounters', async () => {
    const res = await authed(`${BASE}/maps/default`)
    expect(res.status).toBe(200)
    const body = await res.json() as { map: { id: string }; encounters: { id: string }[] }
    expect(body.map.id).toBe('default')
    expect(body.encounters.map(e => e.id)).toEqual(['default'])
  })

  it('GET an unknown region returns 404', async () => {
    const res = await authed(`${BASE}/regions/nope`)
    expect(res.status).toBe(404)
  })

  it('GET content/default without a session returns 401', async () => {
    const res = await app.request(`${BASE}/default`)
    expect(res.status).toBe(401)
  })

  it('GET content/regions without a session returns 401', async () => {
    const res = await app.request(`${BASE}/regions`)
    expect(res.status).toBe(401)
  })
})

// A schema-valid 4×4 map drawing terrain only from the seed region's enum
// (plains/forest/water/stone). `id`/`order` here are placeholders the create
// path overrides; update/round-trip tests assert the stored values.
function validMap(overrides: Record<string, unknown> = {}) {
  return {
    id: 'placeholder',
    regionId: 'default',
    name: 'Test Map',
    order: 0,
    size: { cols: 4, rows: 4 },
    terrain: [
      ['plains', 'forest', 'water', 'stone'],
      ['plains', 'forest', 'water', 'stone'],
      ['plains', 'forest', 'water', 'stone'],
      ['plains', 'forest', 'water', 'stone'],
    ],
    objects: [{ col: 1, row: 1, kind: 'tower', hp: 5 }],
    enemySpawnZone: ['0,0'],
    playerSpawnZone: ['0,3', '1,3', '2,3'],
    pcStartTiles: { melee: { col: 0, row: 3 } },
    ...overrides,
  }
}

describe('dungeon-tactics content write routes', () => {
  const { db, userRepo } = setupTestDb()
  const contentRepo = new SqliteGameContentRepository(db)
  let app: Hono
  let cookie: string

  beforeAll(async () => {
    const hash = await bcrypt.hash('password', 4)
    const user = userRepo.upsert('writer@example.com', hash)
    cookie = `sid=${createSession(user.id, user.sessionNonce)}`

    const gameRoomRepo = new SqliteGameRoomRepository(db)
    const scenarioRepo = new SqliteGameScenarioRepository(db)
    const unitDefRepo = new SqliteGameUnitDefRepository(db)
    app = new Hono()
    app.use('/*', createSessionMiddleware(userRepo))
    app.route('/', createGamesRouter(gameRoomRepo, scenarioRepo, unitDefRepo, contentRepo))
  })

  // Each test starts from a single seeded region/map/encounter.
  beforeEach(() => {
    db.exec('DELETE FROM game_dt_encounters; DELETE FROM game_dt_maps; DELETE FROM game_dt_regions;')
    contentRepo.seedDefaultIfEmpty(BUNDLED_MAP)
  })

  const post = (path: string, body: unknown) =>
    app.request(path, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  const put = (path: string, body: unknown) =>
    app.request(path, {
      method: 'PUT',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  const del = (path: string) =>
    app.request(path, { method: 'DELETE', headers: { Cookie: cookie } })
  const mapCount = () =>
    (db.prepare('SELECT COUNT(*) AS n FROM game_dt_maps').get() as { n: number }).n

  it('3.1 create → GET round-trip: stored at the next order with a derived id', async () => {
    const res = await post(`${BASE}/regions/default/maps`, validMap())
    expect(res.status).toBe(201)
    const created = await res.json() as { id: string; regionId: string; order: number; size: { cols: number } }
    expect(created.id).toBe('test-map')      // slug of the name, not the placeholder
    expect(created.regionId).toBe('default')
    expect(created.order).toBe(1)            // after the seed map at order 0

    const read = await app.request(`${BASE}/maps/test-map`, { headers: { Cookie: cookie } })
    expect(read.status).toBe(200)
    const body = await read.json() as { map: { id: string; size: { cols: number; rows: number } } }
    expect(body.map.id).toBe('test-map')
    expect(body.map.size).toEqual({ cols: 4, rows: 4 })
  })

  it('3.1 create de-duplicates the derived id on collision', async () => {
    const first = await post(`${BASE}/regions/default/maps`, validMap())
    expect((await first.json() as { id: string }).id).toBe('test-map')
    const second = await post(`${BASE}/regions/default/maps`, validMap())
    expect((await second.json() as { id: string }).id).toBe('test-map-2')
  })

  it('3.1 create into an unknown region returns 404, nothing persisted', async () => {
    const before = mapCount()
    const res = await post(`${BASE}/regions/nope/maps`, validMap())
    expect(res.status).toBe(404)
    expect(mapCount()).toBe(before)
  })

  describe('3.2 malformed bodies are rejected and persist nothing', () => {
    const cases: Array<[string, Record<string, unknown>, number]> = [
      ['terrain grid not matching size', { terrain: [['plains', 'forest', 'water', 'stone']] }, 400],
      ['object out of bounds', { objects: [{ col: 9, row: 9, kind: 'tower', hp: 5 }] }, 400],
      ['terrain value outside the region enum', {
        terrain: [
          ['plains', 'forest', 'water', 'lava'],
          ['plains', 'forest', 'water', 'stone'],
          ['plains', 'forest', 'water', 'stone'],
          ['plains', 'forest', 'water', 'stone'],
        ],
      }, 400],
    ]
    for (const [label, override, status] of cases) {
      it(label, async () => {
        const before = mapCount()
        const res = await post(`${BASE}/regions/default/maps`, validMap(override))
        expect(res.status).toBe(status)
        expect(mapCount()).toBe(before)
      })
    }
  })

  it('3.3 unauthenticated create/update/delete return 401, nothing persisted', async () => {
    const before = mapCount()
    const noAuth = { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validMap()) }
    const create = await app.request(`${BASE}/regions/default/maps`, { method: 'POST', ...noAuth })
    const update = await app.request(`${BASE}/maps/default`, { method: 'PUT', ...noAuth })
    const remove = await app.request(`${BASE}/maps/default`, { method: 'DELETE' })
    expect(create.status).toBe(401)
    expect(update.status).toBe(401)
    expect(remove.status).toBe(401)
    expect(mapCount()).toBe(before)
  })

  it('3.4 deleting the last map is rejected; getDefault still resolves a map', async () => {
    const res = await del(`${BASE}/maps/default`)
    expect(res.status).toBe(409)
    expect(mapCount()).toBe(1)
    expect(contentRepo.getDefault()).not.toBeNull()
  })

  it('3.4 deleting a non-last map succeeds and cascades encounters', async () => {
    await post(`${BASE}/regions/default/maps`, validMap())  // now two maps in the region
    const res = await del(`${BASE}/maps/test-map`)
    expect(res.status).toBe(204)
    expect(mapCount()).toBe(1)
    const read = await app.request(`${BASE}/maps/test-map`, { headers: { Cookie: cookie } })
    expect(read.status).toBe(404)
  })

  it('3.5 update replaces content wholesale; read-back reflects it', async () => {
    const res = await put(`${BASE}/maps/default`, validMap({ name: 'Renamed Board' }))
    expect(res.status).toBe(200)
    const updated = await res.json() as { id: string; name: string; size: { cols: number } }
    expect(updated.id).toBe('default')        // id is pinned, not re-derived from the new name
    expect(updated.name).toBe('Renamed Board')
    expect(updated.size.cols).toBe(4)

    const read = await app.request(`${BASE}/maps/default`, { headers: { Cookie: cookie } })
    const body = await read.json() as { map: { name: string; size: { cols: number; rows: number } } }
    expect(body.map.name).toBe('Renamed Board')
    expect(body.map.size).toEqual({ cols: 4, rows: 4 })  // replaced the 16×8 seed wholesale
  })

  it('3.5 update of an unknown map returns 404', async () => {
    const res = await put(`${BASE}/maps/nope`, validMap())
    expect(res.status).toBe(404)
  })
})
