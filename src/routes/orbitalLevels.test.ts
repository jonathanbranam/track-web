import { describe, it, expect, beforeAll } from 'vitest'
import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import { setupTestDb, createTestSession } from '../test-utils/db'
import { SqliteOrbitalLevelRepository } from '../repositories/sqlite/orbitalLevels'
import { SqliteApiTokenRepository } from '../repositories/sqlite/apiToken.repository'
import { createAuthMiddleware } from '../middleware/auth'
import { createOrbitalLevelsRouter, LEVEL_LIMITS } from './orbitalLevels'
import type { OrbitalLevel, OrbitalLevelLayout } from '../repositories/interfaces'

const layout = (over: Partial<OrbitalLevelLayout> = {}): OrbitalLevelLayout => ({
  v: 1,
  start: { kind: 'orbit', planet: 0, angleDeg: 90, dir: -1 },
  planets: [{ x: 120, y: 200, r: 30, color: 1, ringHeight: 40 }, { x: 300, y: 560, r: 50, color: 3 }],
  stars: [{ x: 200, y: 360 }, { x: 50, y: 700 }],
  ...over,
})

describe('orbital-dodger level routes', () => {
  const { db, userRepo, sessionRepo } = setupTestDb()
  let app: Hono
  let cookie: string

  beforeAll(async () => {
    const hash = await bcrypt.hash('password', 4)
    const user = userRepo.upsert('pilot@example.com', hash)
    cookie = `sid=${createTestSession(sessionRepo, user.id)}`
    app = new Hono()
    app.use('/*', createAuthMiddleware(new SqliteApiTokenRepository(db), sessionRepo))
    app.route('/', createOrbitalLevelsRouter(new SqliteOrbitalLevelRepository(db)))
  })

  const send = (method: string, path: string, body?: unknown) =>
    app.request(path, {
      method,
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

  const list = async () => ((await (await send('GET', '/levels')).json()) as { levels: OrbitalLevel[] }).levels
  const idOf = async (name: string) => (await list()).find((l) => l.name === name)!.id

  it('pins the limits mirrored by the client', () => {
    expect(LEVEL_LIMITS).toEqual({
      width: 400, height: 720, minRadius: 12, maxRadius: 90, minRingHeight: 20, maxRingHeight: 200,
      minStars: 1, maxStars: 30, maxPlanets: 12, maxBytes: 16384,
    })
  })

  it('rejects requests without a session (401)', async () => {
    expect((await app.request('/levels')).status).toBe(401)
    expect((await app.request('/levels', { method: 'POST', body: '{}' })).status).toBe(401)
  })

  it('GET /levels is empty on a fresh database', async () => {
    expect(await list()).toEqual([])
  })

  it('POST /levels creates a level (201) with a trimmed name and the layout intact', async () => {
    const res = await send('POST', '/levels', { name: '  Twin Wells ', layout: layout() })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ name: 'Twin Wells', layout: layout() })
    expect((await list()).map((l) => l.name)).toEqual(['Twin Wells'])
  })

  it('refuses a level with no stars with a readable message', async () => {
    const res = await send('POST', '/levels', { name: 'Empty', layout: layout({ stars: [] }) })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'A level needs at least one star' })
  })

  it('refuses malformed geometry', async () => {
    const outside = layout({ planets: [{ x: 500, y: 200, r: 30, color: 0 }], start: { kind: 'point', x: 1, y: 1 } })
    const res = await send('POST', '/levels', { name: 'Out', layout: outside })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Planets must be inside the play area' })

    const badOrbit = await send('POST', '/levels', { name: 'Orbit', layout: layout({ start: { kind: 'orbit', planet: 2, angleDeg: 0, dir: 1 } }) })
    expect(badOrbit.status).toBe(400)
    expect(await badOrbit.json()).toEqual({ error: 'The orbit start names a planet the level does not have' })

    const bad = [
      layout({ planets: [{ x: 100, y: 100, r: 5, color: 0 }] }),
      layout({ planets: [{ x: 100, y: 100, r: 30, color: 0, ringHeight: 10 }] }),
      layout({ planets: [{ x: 100, y: 100, r: 30, color: 7 }] }),
      layout({ stars: Array.from({ length: 31 }, () => ({ x: 10, y: 10 })) }),
      layout({ planets: Array.from({ length: 13 }, () => ({ x: 10, y: 10, r: 20, color: 0 })), start: { kind: 'point', x: 1, y: 1 } }),
      { ...layout(), v: 2 },
      { ...layout(), start: { kind: 'orbit', planet: 0, angleDeg: 0, dir: 0 } },
      { ...layout(), stars: [{ x: 'a', y: 1 }] },
    ]
    for (const l of bad) expect((await send('POST', '/levels', { name: 'Bad', layout: l })).status).toBe(400)
    expect((await list()).map((l) => l.name)).toEqual(['Twin Wells'])
  })

  it('refuses a duplicate name regardless of case (409)', async () => {
    const res = await send('POST', '/levels', { name: 'twin wells', layout: layout() })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'That name is already taken' })
  })

  it('PATCH /levels/:id renames and saves over (200)', async () => {
    const id = await idOf('Twin Wells')
    expect((await send('PATCH', `/levels/${id}`, { name: 'Gate' })).status).toBe(200)
    const moved = layout({ start: { kind: 'point', x: 200, y: 100 } })
    const saved = await send('PATCH', `/levels/${id}`, { layout: moved })
    expect(await saved.json()).toMatchObject({ name: 'Gate', layout: moved })
  })

  it('PATCH refuses an empty body (400), a bad layout (400), unknown ids (404) and taken names (409)', async () => {
    const id = await idOf('Gate')
    await send('POST', '/levels', { name: 'Other', layout: layout() })
    expect((await send('PATCH', `/levels/${id}`, {})).status).toBe(400)
    expect((await send('PATCH', `/levels/${id}`, { layout: layout({ stars: [] }) })).status).toBe(400)
    expect((await send('PATCH', '/levels/9999', { name: 'X' })).status).toBe(404)
    expect((await send('PATCH', '/levels/abc', { name: 'X' })).status).toBe(404)
    expect((await send('PATCH', `/levels/${id}`, { name: 'OTHER' })).status).toBe(409)
  })

  it('DELETE /levels/:id returns 204, then 404', async () => {
    const id = await idOf('Gate')
    expect((await send('DELETE', `/levels/${id}`)).status).toBe(204)
    expect((await send('DELETE', `/levels/${id}`)).status).toBe(404)
    expect((await list()).map((l) => l.name)).toEqual(['Other'])
  })
})
