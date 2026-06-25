import { describe, it, expect, beforeAll } from 'vitest'
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
