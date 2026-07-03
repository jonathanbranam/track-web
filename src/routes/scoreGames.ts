import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { IScoreGameRepository } from '../repositories/interfaces'
import type { AppEnv } from '../types'

const createGameSchema = z.object({
  name: z.string().trim().min(1).max(100),
  targetRounds: z.number().int().min(1).max(1000).nullable().optional(),
  players: z
    .array(
      z.object({
        userId: z.number().int().positive().nullable().optional(),
        name: z.string().trim().min(1).max(100),
      })
    )
    .min(1)
    .max(50),
})

const roundSchema = z.object({
  scores: z
    .array(
      z.object({
        playerId: z.number().int().positive(),
        value: z.number().int(),  // any integer, incl. negative and zero
      })
    )
    .max(50),
})

export function createScoreGamesRouter(scoreGameRepo: IScoreGameRepository) {
  const router = new Hono<AppEnv>()

  // GET /game-names — remembered names for the setup picker
  router.get('/game-names', (c) => {
    return c.json({ names: scoreGameRepo.listGameNames() })
  })

  // GET /score-games — caller's games (active first, then completed history)
  router.get('/score-games', (c) => {
    const userId = c.get('userId')
    return c.json({ games: scoreGameRepo.listGames(userId) })
  })

  // POST /score-games — create a game
  router.post(
    '/score-games',
    zValidator('json', createGameSchema, (result, c) => {
      if (!result.success) return c.json({ error: result.error.flatten() }, 422)
    }),
    (c) => {
      const userId = c.get('userId')
      const { name, targetRounds, players } = c.req.valid('json')
      const game = scoreGameRepo.createGame({
        userId,
        name,
        targetRounds: targetRounds ?? null,
        players,
      })
      return c.json({ game }, 201)
    }
  )

  // GET /score-games/:id — full game detail
  router.get('/score-games/:id', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid game ID' }, 422)
    const userId = c.get('userId')
    const game = scoreGameRepo.getGame(id, userId)
    if (!game) return c.json({ error: 'Game not found' }, 404)
    return c.json({ game })
  })

  // PUT /score-games/:id/rounds/:roundNumber — replace all scores for a round
  router.put(
    '/score-games/:id/rounds/:roundNumber',
    zValidator('json', roundSchema, (result, c) => {
      if (!result.success) return c.json({ error: result.error.flatten() }, 422)
    }),
    (c) => {
      const id = parseInt(c.req.param('id'), 10)
      const roundNumber = parseInt(c.req.param('roundNumber'), 10)
      if (isNaN(id) || isNaN(roundNumber) || roundNumber < 1) {
        return c.json({ error: 'Invalid ID' }, 422)
      }
      const userId = c.get('userId')
      const { scores } = c.req.valid('json')
      const game = scoreGameRepo.upsertRound(id, userId, roundNumber, scores)
      if (!game) return c.json({ error: 'Game not found' }, 404)
      return c.json({ game })
    }
  )

  // DELETE /score-games/:id/rounds/:roundNumber — remove a round
  router.delete('/score-games/:id/rounds/:roundNumber', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    const roundNumber = parseInt(c.req.param('roundNumber'), 10)
    if (isNaN(id) || isNaN(roundNumber)) return c.json({ error: 'Invalid ID' }, 422)
    const userId = c.get('userId')
    const game = scoreGameRepo.deleteRound(id, userId, roundNumber)
    if (!game) return c.json({ error: 'Game not found' }, 404)
    return c.json({ game })
  })

  // POST /score-games/:id/complete — end a game and stamp completion
  router.post('/score-games/:id/complete', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid game ID' }, 422)
    const userId = c.get('userId')
    const game = scoreGameRepo.completeGame(id, userId)
    if (!game) return c.json({ error: 'Game not found' }, 404)
    return c.json({ game })
  })

  // DELETE /score-games/:id — delete a game and all its players/rounds
  router.delete('/score-games/:id', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid game ID' }, 422)
    const userId = c.get('userId')
    const ok = scoreGameRepo.deleteGame(id, userId)
    if (!ok) return c.json({ error: 'Game not found' }, 404)
    return c.json({ ok: true })
  })

  return router
}
