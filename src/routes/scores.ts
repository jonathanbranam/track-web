import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { IGameScoreRepository } from '../repositories/interfaces'
import type { AppEnv } from '../types'

const submitSchema = z.object({
  gameSlug: z.string().min(1).max(100),
  mode: z.string().min(1).max(50),
  level: z.string().min(1).max(50),
  score: z.number().int().positive(),
})

export function createScoresRouter(scoreRepo: IGameScoreRepository) {
  const router = new Hono<AppEnv>()

  router.post('/', zValidator('json', submitSchema, (result, c) => {
    if (!result.success) return c.json({ error: result.error.flatten() }, 422)
  }), (c) => {
    const userId = c.get('userId')
    const { gameSlug, mode, level, score } = c.req.valid('json')
    const entry = scoreRepo.submit({
      userId,
      gameSlug,
      mode,
      level,
      score,
      achievedAt: new Date().toISOString(),
    })
    return c.json(entry, 201)
  })

  router.get('/leaderboard', (c) => {
    const game = c.req.query('game')
    const mode = c.req.query('mode')
    const level = c.req.query('level')
    const limitRaw = c.req.query('limit')

    if (!game || !mode || !level) {
      return c.json({ error: 'game, mode, and level query params are required' }, 422)
    }

    const limit = limitRaw ? Math.min(Math.max(1, parseInt(limitRaw, 10) || 10), 50) : 10
    const leaderboard = scoreRepo.getLeaderboard(game, mode, level, limit)
    return c.json({ leaderboard })
  })

  return router
}
