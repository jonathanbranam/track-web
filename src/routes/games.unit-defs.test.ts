import { describe, it, expect, beforeAll } from 'vitest'
import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import { setupTestDb } from '../test-utils/db'
import { SqliteGameRoomRepository } from '../repositories/sqlite/gameRooms'
import { SqliteGameScenarioRepository } from '../repositories/sqlite/gameScenarios'
import { SqliteGameUnitDefRepository } from '../repositories/sqlite/gameUnitDefs'
import { BUNDLED_UNIT_DEFS, DUNGEON_TACTICS_SLUG } from '../games/dungeon-tactics/unitDefs'
import { createGamesRouter } from './games'
import { createSessionMiddleware } from '../middleware/auth'
import { createSession } from '../utils/session'

const BASE = `/${DUNGEON_TACTICS_SLUG}`

describe('dungeon-tactics unit-defs routes', () => {
  const { db, userRepo } = setupTestDb()
  let app: Hono
  let scenarioRepo: SqliteGameScenarioRepository
  let cookie: string

  beforeAll(async () => {
    const hash = await bcrypt.hash('password', 4)
    const user = userRepo.upsert('designer@example.com', hash)
    cookie = `sid=${createSession(user.id, user.sessionNonce)}`

    scenarioRepo = new SqliteGameScenarioRepository(db)
    const unitDefRepo = new SqliteGameUnitDefRepository(db)
    unitDefRepo.seedDefaultIfEmpty(DUNGEON_TACTICS_SLUG, BUNDLED_UNIT_DEFS)

    const gameRoomRepo = new SqliteGameRoomRepository(db)
    app = new Hono()
    app.use('/*', createSessionMiddleware(userRepo))
    app.route('/', createGamesRouter(gameRoomRepo, scenarioRepo, unitDefRepo))
  })

  const authed = (path: string, init?: RequestInit) =>
    app.request(path, { ...init, headers: { 'Content-Type': 'application/json', Cookie: cookie, ...init?.headers } })

  it('seeds a default scenario from the bundled defaults', () => {
    const list = scenarioRepo.list(DUNGEON_TACTICS_SLUG)
    expect(list.length).toBe(1)
    expect(list[0].id).toBe('default')
    expect(list[0].isDefault).toBe(true)
  })

  it('GET unit-defs returns the default scenario set', async () => {
    const res = await authed(`${BASE}/unit-defs`)
    expect(res.status).toBe(200)
    const body = await res.json() as { scenarioId: string; unitDefs: Record<string, { maxHp: number }> }
    expect(body.scenarioId).toBe('default')
    expect(body.unitDefs.melee.maxHp).toBe(3)
  })

  it('GET unit-defs without a session returns 401', async () => {
    const res = await app.request(`${BASE}/unit-defs`)
    expect(res.status).toBe(401)
  })

  it('PUT a valid single def upserts it', async () => {
    const edited = { ...BUNDLED_UNIT_DEFS.melee, maxHp: 5 }
    const res = await authed(`${BASE}/scenarios/default/unit-defs/melee`, {
      method: 'PUT',
      body: JSON.stringify(edited),
    })
    expect(res.status).toBe(200)
    const check = await authed(`${BASE}/scenarios/default/unit-defs`)
    const body = await check.json() as { unitDefs: Record<string, { maxHp: number }> }
    expect(body.unitDefs.melee.maxHp).toBe(5)
  })

  it('PUT an invalid def returns 400 and persists nothing', async () => {
    const res = await authed(`${BASE}/scenarios/default/unit-defs/rogue`, {
      method: 'PUT',
      body: JSON.stringify({ ...BUNDLED_UNIT_DEFS.rogue, maxHp: 0 }),
    })
    expect(res.status).toBe(400)
    const check = await authed(`${BASE}/scenarios/default/unit-defs`)
    const body = await check.json() as { unitDefs: Record<string, { maxHp: number }> }
    expect(body.unitDefs.rogue.maxHp).toBe(3)
  })

  it('PUT without a session returns 401', async () => {
    const res = await app.request(`${BASE}/scenarios/default/unit-defs/melee`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(BUNDLED_UNIT_DEFS.melee),
    })
    expect(res.status).toBe(401)
  })

  it('POST scenarios creates a named scenario copying the source defs', async () => {
    const res = await authed(`${BASE}/scenarios`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Slow Enemies' }),
    })
    expect(res.status).toBe(201)
    const created = await res.json() as { id: string; name: string; isDefault: boolean }
    expect(created.name).toBe('Slow Enemies')
    expect(created.isDefault).toBe(false)
    // Copied from the current default (which has melee maxHp 5 from the earlier edit).
    const defs = await authed(`${BASE}/scenarios/${created.id}/unit-defs`)
    const body = await defs.json() as { unitDefs: Record<string, { maxHp: number }> }
    expect(body.unitDefs.melee.maxHp).toBe(5)
  })

  it('PUT default maintains exactly one default', async () => {
    const created = await (await authed(`${BASE}/scenarios`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Glass Cannons' }),
    })).json() as { id: string }

    const res = await authed(`${BASE}/scenarios/${created.id}/default`, { method: 'PUT' })
    expect(res.status).toBe(200)

    const list = scenarioRepo.list(DUNGEON_TACTICS_SLUG)
    const defaults = list.filter(s => s.isDefault)
    expect(defaults.length).toBe(1)
    expect(defaults[0].id).toBe(created.id)
  })

  it('PUT default on a missing scenario returns 404', async () => {
    const res = await authed(`${BASE}/scenarios/nope/default`, { method: 'PUT' })
    expect(res.status).toBe(404)
  })
})
