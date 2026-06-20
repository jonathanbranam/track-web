import { describe, it, expect, beforeAll } from 'vitest'
import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import { setupTestDb } from '../test-utils/db'
import { SqliteGameScoreRepository } from '../repositories/sqlite/scores.repository'
import { createScoresRouter } from './scores'
import { sessionMiddleware } from '../middleware/auth'
import { createSession } from '../utils/session'

describe('scores routes', () => {
  const { db, userRepo } = setupTestDb()
  let app: Hono
  let sessionCookie: string
  let userId: number

  beforeAll(async () => {
    const hash = await bcrypt.hash('password', 4)
    const user = userRepo.upsert('player@example.com', hash)
    userId = user.id

    const sessionId = createSession(userId)
    sessionCookie = `sid=${sessionId}`

    const scoreRepo = new SqliteGameScoreRepository(db)
    app = new Hono()
    app.use('/*', sessionMiddleware)
    app.route('/', createScoresRouter(scoreRepo))
  })

  it('POST / returns 201 and persists the score', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ gameSlug: 'ball-merge', mode: 'classic', level: 'box', score: 500 }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as { gameSlug: string; score: number; userId: number }
    expect(body.gameSlug).toBe('ball-merge')
    expect(body.score).toBe(500)
    expect(body.userId).toBe(userId)
  })

  it('POST / without session returns 401', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameSlug: 'ball-merge', mode: 'classic', level: 'box', score: 100 }),
    })
    expect(res.status).toBe(401)
  })

  it('POST / with invalid payload returns 422', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ gameSlug: 'ball-merge', mode: 'classic', level: 'box', score: 'not-a-number' }),
    })
    expect(res.status).toBe(400)
  })

  it('GET /leaderboard returns top scores ranked highest first', async () => {
    // Submit multiple scores for the same user
    for (const s of [200, 800, 400]) {
      await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ gameSlug: 'ball-merge', mode: 'classic', level: 'box', score: s }),
      })
    }

    const res = await app.request('/leaderboard?game=ball-merge&mode=classic&level=box', {
      headers: { Cookie: sessionCookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { leaderboard: Array<{ rank: number; score: number; playerName: string }> }
    expect(body.leaderboard.length).toBeGreaterThan(0)
    // User appears once with their best score
    expect(body.leaderboard.filter(e => e.playerName === 'player').length).toBe(1)
    expect(body.leaderboard[0].score).toBe(800)
    expect(body.leaderboard[0].rank).toBe(1)
  })

  it('GET /leaderboard without session returns 401', async () => {
    const res = await app.request('/leaderboard?game=ball-merge&mode=classic&level=box')
    expect(res.status).toBe(401)
  })

  it('GET /leaderboard with missing params returns 422', async () => {
    const res = await app.request('/leaderboard?game=ball-merge', {
      headers: { Cookie: sessionCookie },
    })
    expect(res.status).toBe(422)
  })
})
