import { describe, it, expect, beforeAll } from 'vitest'
import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import { setupTestDb, createTestSession } from '../test-utils/db'
import { SqliteOrbitalConfigRepository } from '../repositories/sqlite/orbitalConfigs'
import { SqliteApiTokenRepository } from '../repositories/sqlite/apiToken.repository'
import { createAuthMiddleware } from '../middleware/auth'
import { createOrbitalConfigsRouter } from './orbitalConfigs'
import type { OrbitalConfig } from '../repositories/interfaces'

describe('orbital-dodger config routes', () => {
  const { db, userRepo, sessionRepo } = setupTestDb()
  let app: Hono
  let cookie: string

  beforeAll(async () => {
    const hash = await bcrypt.hash('password', 4)
    const user = userRepo.upsert('pilot@example.com', hash)
    cookie = `sid=${createTestSession(sessionRepo, user.id)}`
    app = new Hono()
    app.use('/*', createAuthMiddleware(new SqliteApiTokenRepository(db), sessionRepo))
    app.route('/', createOrbitalConfigsRouter(new SqliteOrbitalConfigRepository(db)))
  })

  const send = (method: string, path: string, body?: unknown) =>
    app.request(path, {
      method,
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

  const list = async () => ((await (await send('GET', '/configs')).json()) as { configs: OrbitalConfig[] }).configs
  const defaultId = async () => (await list()).find((c) => c.isDefault)!.id

  it('GET /configs without a session returns 401', async () => {
    expect((await app.request('/configs')).status).toBe(401)
  })

  it('GET /configs lists the seeded Default first', async () => {
    const configs = await list()
    expect(configs[0]).toMatchObject({ name: 'Default', isDefault: true, tuning: {} })
  })

  it('POST /configs creates a config (201) with trimmed name', async () => {
    const res = await send('POST', '/configs', { name: '  Floaty  ', tuning: { G: 300, edgeMode: 'wrap', orbitCapture: true } })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ name: 'Floaty', isDefault: false, tuning: { G: 300, edgeMode: 'wrap', orbitCapture: true } })
  })

  it('POST /configs returns 409 for a duplicate name regardless of case', async () => {
    const res = await send('POST', '/configs', { name: 'FLOATY', tuning: {} })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'That name is already taken' })
  })

  it('POST /configs returns 400 for a blank, overlong or malformed body', async () => {
    expect((await send('POST', '/configs', { name: '   ', tuning: {} })).status).toBe(400)
    expect((await send('POST', '/configs', { name: 'x'.repeat(41), tuning: {} })).status).toBe(400)
    expect((await send('POST', '/configs', { name: 'Bad', tuning: { G: { nested: 1 } } })).status).toBe(400)
    const huge = Object.fromEntries(Array.from({ length: 600 }, (_, i) => [`key${i}`, 'value-value']))
    expect((await send('POST', '/configs', { name: 'Huge', tuning: huge })).status).toBe(400)
  })

  it('PATCH /configs/:id renames and saves (200)', async () => {
    const id = (await list()).find((c) => c.name === 'Floaty')!.id
    const renamed = await send('PATCH', `/configs/${id}`, { name: 'Low Gravity' })
    expect(renamed.status).toBe(200)
    const saved = await send('PATCH', `/configs/${id}`, { tuning: { G: 250 } })
    expect(await saved.json()).toMatchObject({ name: 'Low Gravity', tuning: { G: 250 } })
  })

  it('PATCH /configs/:id returns 400 for an empty body, 404 for an unknown id, 409 for a taken name', async () => {
    const id = (await list()).find((c) => c.name === 'Low Gravity')!.id
    expect((await send('PATCH', `/configs/${id}`, {})).status).toBe(400)
    expect((await send('PATCH', '/configs/9999', { tuning: {} })).status).toBe(404)
    expect((await send('PATCH', '/configs/abc', { tuning: {} })).status).toBe(404)
    expect((await send('PATCH', `/configs/${id}`, { name: 'default' })).status).toBe(409)
  })

  it('the Default can be saved over but not renamed (403)', async () => {
    const id = await defaultId()
    expect((await send('PATCH', `/configs/${id}`, { tuning: { thrust: 200 } })).status).toBe(200)
    const res = await send('PATCH', `/configs/${id}`, { name: 'Mine' })
    expect(res.status).toBe(403)
    expect((await list())[0]).toMatchObject({ name: 'Default', tuning: { thrust: 200 } })
  })

  it('DELETE /configs/:id returns 403 for the Default, 204 otherwise, then 404', async () => {
    expect((await send('DELETE', `/configs/${await defaultId()}`)).status).toBe(403)
    const id = (await list()).find((c) => c.name === 'Low Gravity')!.id
    expect((await send('DELETE', `/configs/${id}`)).status).toBe(204)
    expect((await send('DELETE', `/configs/${id}`)).status).toBe(404)
    expect((await list()).map((c) => c.name)).toEqual(['Default'])
  })
})
