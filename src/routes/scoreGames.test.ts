import { describe, it, expect, beforeAll } from 'vitest'
import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import { setupTestDb, createTestSession } from '../test-utils/db'
import { SqliteScoreGameRepository } from '../repositories/sqlite/scoreGame.repository'
import { createScoreGamesRouter } from './scoreGames'
import { createSessionMiddleware } from '../middleware/auth'

interface GameDetail {
  id: number
  name: string
  status: string
  targetRounds: number | null
  completedAt: string | null
  players: { id: number; name: string; userId: number | null }[]
  scores: { playerId: number; roundNumber: number; value: number }[]
}

describe('score-games routes', () => {
  const { db, userRepo, sessionRepo } = setupTestDb()
  let app: Hono
  let cookie: string

  beforeAll(async () => {
    const hash = await bcrypt.hash('password', 4)
    const user = userRepo.upsert('player@example.com', hash)
    cookie = `sid=${createTestSession(sessionRepo, user.id)}`

    const repo = new SqliteScoreGameRepository(db)
    app = new Hono()
    app.use('/*', createSessionMiddleware(sessionRepo))
    app.route('/', createScoreGamesRouter(repo))
  })

  const post = (path: string, body: unknown) =>
    app.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    })

  it('requires auth', async () => {
    const res = await app.request('/score-games')
    expect(res.status).toBe(401)
  })

  it('GET /game-names includes the seeded names', async () => {
    const res = await app.request('/game-names', { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const body = await res.json() as { names: string[] }
    expect(body.names).toEqual(expect.arrayContaining(['Sushi Go', 'Tides of Time', 'Pit', 'Farkle', 'Uno']))
  })

  it('rejects a game with no players', async () => {
    const res = await post('/score-games', { name: 'Uno', players: [] })
    expect(res.status).toBe(422)
  })

  it('runs a full create → round → complete flow', async () => {
    const create = await post('/score-games', {
      name: 'Skull King',
      targetRounds: 2,
      players: [{ name: 'Alice' }, { name: 'Bob' }],
    })
    expect(create.status).toBe(201)
    const { game } = await create.json() as { game: GameDetail }
    expect(game.name).toBe('Skull King')
    const [alice, bob] = game.players

    // Round 1 — negative allowed
    const r1 = await app.request(`/score-games/${game.id}/rounds/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ scores: [{ playerId: alice.id, value: -10 }, { playerId: bob.id, value: 20 }] }),
    })
    expect(r1.status).toBe(200)
    const r1body = await r1.json() as { game: GameDetail }
    expect(r1body.game.scores.find(s => s.playerId === alice.id)!.value).toBe(-10)

    // Complete
    const done = await post(`/score-games/${game.id}/complete`, {})
    expect(done.status).toBe(200)
    const doneBody = await done.json() as { game: GameDetail }
    expect(doneBody.game.status).toBe('completed')
    expect(doneBody.game.completedAt).toBeTruthy()

    // A new game name is remembered
    const names = await (await app.request('/game-names', { headers: { Cookie: cookie } })).json() as { names: string[] }
    expect(names.names).toContain('Skull King')
  })

  it('returns 404 for a game the caller does not own', async () => {
    const other = userRepo.upsert('other@example.com', 'x')
    const otherCookie = `sid=${createTestSession(sessionRepo, other.id)}`
    const create = await post('/score-games', { name: 'Uno', players: [{ name: 'A' }] })
    const { game } = await create.json() as { game: GameDetail }

    const res = await app.request(`/score-games/${game.id}`, { headers: { Cookie: otherCookie } })
    expect(res.status).toBe(404)
  })

  it('deletes a game (owner 200, non-owner 404, unauth 401)', async () => {
    const create = await post('/score-games', { name: 'Uno', players: [{ name: 'A' }] })
    const { game } = await create.json() as { game: GameDetail }

    // unauthenticated
    expect((await app.request(`/score-games/${game.id}`, { method: 'DELETE' })).status).toBe(401)

    // non-owner
    const other = userRepo.upsert('deleter@example.com', 'x')
    const otherCookie = `sid=${createTestSession(sessionRepo, other.id)}`
    expect((await app.request(`/score-games/${game.id}`, { method: 'DELETE', headers: { Cookie: otherCookie } })).status).toBe(404)

    // owner
    const ok = await app.request(`/score-games/${game.id}`, { method: 'DELETE', headers: { Cookie: cookie } })
    expect(ok.status).toBe(200)
    // now gone
    expect((await app.request(`/score-games/${game.id}`, { headers: { Cookie: cookie } })).status).toBe(404)
  })
})
