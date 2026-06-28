import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import Database from 'better-sqlite3'
import { migrate, setDb } from '../../db'
import { SqliteUserRepository } from '../../repositories/sqlite/user.repository'
import { SqliteSocialRepository } from '../../repositories/sqlite/social.repository'
import { SqliteMovieRepository } from '../../repositories/sqlite/movie.repository'
import { SqliteTvRepository } from '../../repositories/sqlite/tv.repository'
import { SqliteWatchEventRepository } from '../../repositories/sqlite/watch-event.repository'
import { SqliteApiTokenRepository } from '../../repositories/sqlite/apiToken.repository'
import { SqliteSessionRepository } from '../../repositories/sqlite/session.repository'
import { createAuthRouter } from '../auth'
import { createEventsRouter } from './events'
import { createSessionMiddleware } from '../../middleware/auth'
import { clearFailures } from '../../utils/rate-limit'

const EMAIL_A = 'alice@example.com'
const EMAIL_B = 'bob@example.com'
const PASSWORD = 'test'

function makeTestEnv() {
  const db = new Database(':memory:')
  migrate(db)
  setDb(db)
  const userRepo = new SqliteUserRepository(db)
  const socialRepo = new SqliteSocialRepository(db)
  const movieRepo = new SqliteMovieRepository(db)
  const tvRepo = new SqliteTvRepository(db)
  const eventRepo = new SqliteWatchEventRepository(db)
  const tokenRepo = new SqliteApiTokenRepository(db)
  const sessionRepo = new SqliteSessionRepository(db)
  const app = new Hono()
  const sessionMw = createSessionMiddleware(sessionRepo)
  app.route('/api/auth', createAuthRouter(userRepo, tokenRepo, sessionRepo, sessionMw, sessionMw))
  app.use('/api/watch/*', sessionMw)
  app.route('/api/watch/events', createEventsRouter(eventRepo, movieRepo, tvRepo, socialRepo))
  return { db, userRepo, eventRepo, movieRepo, app }
}

async function loginUser(app: Hono, email: string): Promise<string> {
  const res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  const cookie = res.headers.get('set-cookie') ?? ''
  return cookie.match(/sid=([^;]+)/)?.[1] ?? ''
}

describe('DELETE /api/watch/events/:id/candidates/:candidateId', () => {
  let env: ReturnType<typeof makeTestEnv>
  let userA: { id: number; email: string }
  let userB: { id: number; email: string }
  let sidA: string
  let sidB: string
  let eventId: number
  let candidateId: number

  beforeEach(async () => {
    clearFailures('unknown')
    env = makeTestEnv()
    const hash = await bcrypt.hash(PASSWORD, 4)
    env.userRepo.upsert(EMAIL_A, hash)
    env.userRepo.upsert(EMAIL_B, hash)
    userA = env.userRepo.findByEmail(EMAIL_A)!
    userB = env.userRepo.findByEmail(EMAIL_B)!
    sidA = await loginUser(env.app, EMAIL_A)
    sidB = await loginUser(env.app, EMAIL_B)

    const event = env.eventRepo.createEvent({
      title: 'Movie Night',
      scheduledDate: '2026-07-01',
      createdByUserId: userA.id,
      inviteeUserIds: [],
    })
    eventId = event.id

    const movie = env.movieRepo.createMovie({ title: 'Some Film', addedByUserId: userA.id })
    const candidate = env.eventRepo.addCandidate(eventId, {
      itemType: 'movie',
      movieId: movie.id,
      suggestedByUserId: userA.id,
    })
    candidateId = candidate.id
  })

  it('returns 403 when requester is not an invitee', async () => {
    const res = await env.app.request(`/api/watch/events/${eventId}/candidates/${candidateId}`, {
      method: 'DELETE',
      headers: { Cookie: `sid=${sidB}` },
    })
    expect(res.status).toBe(403)
  })

  it('returns 404 when candidate does not exist', async () => {
    const res = await env.app.request(`/api/watch/events/${eventId}/candidates/99999`, {
      method: 'DELETE',
      headers: { Cookie: `sid=${sidA}` },
    })
    expect(res.status).toBe(404)
  })

  it('returns 409 when event is completed', async () => {
    env.eventRepo.upsertSelection(eventId, { candidateId })
    env.eventRepo.completeEvent(eventId, new Date().toISOString())

    const res = await env.app.request(`/api/watch/events/${eventId}/candidates/${candidateId}`, {
      method: 'DELETE',
      headers: { Cookie: `sid=${sidA}` },
    })
    expect(res.status).toBe(409)
  })

  it('returns 204 and removes the candidate on success', async () => {
    const res = await env.app.request(`/api/watch/events/${eventId}/candidates/${candidateId}`, {
      method: 'DELETE',
      headers: { Cookie: `sid=${sidA}` },
    })
    expect(res.status).toBe(204)
    expect(env.eventRepo.getCandidate(candidateId)).toBeNull()
  })
})
