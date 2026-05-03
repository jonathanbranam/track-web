import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { setupTestDb } from '../test-utils/db'
import { createEntriesRouter } from './entries'
import type { AppEnv } from '../types'
import type { IEntryRepository } from '../repositories/interfaces'

function buildApp(userId: number, entryRepo: IEntryRepository) {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('userId', userId)
    await next()
  })
  app.route('/', createEntriesRouter(entryRepo))
  return app
}

describe('entries routes', () => {
  const { db, userRepo, entryRepo } = setupTestDb()
  let userId: number
  let otherUserId: number

  beforeAll(() => {
    const user = userRepo.upsert('user@example.com', 'hash')
    userId = user.id
    const other = userRepo.upsert('other@example.com', 'hash2')
    otherUserId = other.id
  })

  beforeEach(() => {
    db.exec('DELETE FROM time_entries')
  })

  it('GET /running returns { entry: null } when nothing is running', async () => {
    const app = buildApp(userId, entryRepo)
    const res = await app.request('/running')
    expect(res.status).toBe(200)
    const body = await res.json() as { entry: unknown }
    expect(body.entry).toBeNull()
  })

  it('POST / creates a running entry (201) and GET /running returns it', async () => {
    const app = buildApp(userId, entryRepo)
    const startedAt = '2024-06-15T10:00:00.000Z'

    const postRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'working on #backend', startedAt }),
    })
    expect(postRes.status).toBe(201)
    const postBody = await postRes.json() as { entry: { description: string; startedAt: string; endedAt: unknown } }
    expect(postBody.entry.description).toBe('working on #backend')
    expect(postBody.entry.startedAt).toBe(startedAt)
    expect(postBody.entry.endedAt).toBeNull()

    const runningRes = await app.request('/running')
    const runningBody = await runningRes.json() as { entry: unknown }
    expect(runningBody.entry).not.toBeNull()
  })

  it('POST / returns 409 when an entry is already running', async () => {
    const app = buildApp(userId, entryRepo)

    await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'first task', startedAt: '2024-06-15T10:00:00.000Z' }),
    })

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'second task', startedAt: '2024-06-15T11:00:00.000Z' }),
    })
    expect(res.status).toBe(409)
  })

  it('POST / returns 422 when startedAt is before previous entry\'s endedAt', async () => {
    const app = buildApp(userId, entryRepo)

    const prev = entryRepo.create({
      userId, appId: 'tracker', description: 'previous', tags: '',
      startedAt: '2024-06-15T09:00:00.000Z',
    })
    entryRepo.update(prev.id, { endedAt: '2024-06-15T10:00:00.000Z' })

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'overlapping', startedAt: '2024-06-15T09:30:00.000Z' }),
    })
    expect(res.status).toBe(422)
  })

  it('PATCH /:id returns 422 when endedAt ≤ startedAt', async () => {
    const app = buildApp(userId, entryRepo)

    const entry = entryRepo.create({
      userId, appId: 'tracker', description: 'task', tags: '',
      startedAt: '2024-06-15T10:00:00.000Z',
    })

    const res = await app.request(`/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endedAt: '2024-06-15T09:00:00.000Z' }),
    })
    expect(res.status).toBe(422)
  })

  it('PATCH /:id returns 422 when new startedAt overlaps previous entry\'s endedAt', async () => {
    const app = buildApp(userId, entryRepo)

    const first = entryRepo.create({
      userId, appId: 'tracker', description: 'first', tags: '',
      startedAt: '2024-06-15T09:00:00.000Z',
    })
    entryRepo.update(first.id, { endedAt: '2024-06-15T10:00:00.000Z' })

    const second = entryRepo.create({
      userId, appId: 'tracker', description: 'second', tags: '',
      startedAt: '2024-06-15T10:00:00.000Z',
    })

    const res = await app.request(`/${second.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startedAt: '2024-06-15T09:30:00.000Z' }),
    })
    expect(res.status).toBe(422)
  })

  it('PATCH /:id returns 422 when new endedAt overlaps next entry\'s startedAt', async () => {
    const app = buildApp(userId, entryRepo)

    const first = entryRepo.create({
      userId, appId: 'tracker', description: 'first', tags: '',
      startedAt: '2024-06-15T09:00:00.000Z',
    })
    entryRepo.update(first.id, { endedAt: '2024-06-15T10:00:00.000Z' })

    const second = entryRepo.create({
      userId, appId: 'tracker', description: 'second', tags: '',
      startedAt: '2024-06-15T11:00:00.000Z',
    })
    entryRepo.update(second.id, { endedAt: '2024-06-15T12:00:00.000Z' })

    const res = await app.request(`/${first.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endedAt: '2024-06-15T11:30:00.000Z' }),
    })
    expect(res.status).toBe(422)
  })

  it('PATCH /:id returns 404 when entry belongs to a different userId', async () => {
    const app = buildApp(userId, entryRepo)

    const other = entryRepo.create({
      userId: otherUserId, appId: 'tracker', description: 'other task', tags: '',
      startedAt: '2024-06-15T10:00:00.000Z',
    })

    const res = await app.request(`/${other.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'modified' }),
    })
    expect(res.status).toBe(404)
  })

  it('DELETE /:id returns 204 and entry is gone', async () => {
    const app = buildApp(userId, entryRepo)

    const entry = entryRepo.create({
      userId, appId: 'tracker', description: 'to delete', tags: '',
      startedAt: '2024-06-15T10:00:00.000Z',
    })

    const res = await app.request(`/${entry.id}`, { method: 'DELETE' })
    expect(res.status).toBe(204)
    expect(entryRepo.findById(entry.id)).toBeNull()
  })

  it('DELETE /:id returns 404 for another user\'s entry', async () => {
    const app = buildApp(userId, entryRepo)

    const other = entryRepo.create({
      userId: otherUserId, appId: 'tracker', description: 'other task', tags: '',
      startedAt: '2024-06-15T10:00:00.000Z',
    })

    const res = await app.request(`/${other.id}`, { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})
