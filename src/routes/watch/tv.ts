import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { ITvRepository, ICastRepository } from '../../repositories/interfaces'
import type { AppEnv } from '../../types'

export function createTvRouter(tvRepo: ITvRepository, castRepo: ICastRepository) {
  const router = new Hono<AppEnv>()

  // GET /api/watch/tv/watchlist — must be before /:id
  router.get('/watchlist', (c) => {
    const userId = c.get('userId')
    return c.json(tvRepo.getWatchlist(userId))
  })

  // PUT /api/watch/tv/watchlist/:seriesId
  router.put(
    '/watchlist/:seriesId',
    zValidator('json', z.object({
      state: z.enum(['unseen', 'watching', 'watched', 'would_watch_again']),
      rating: z.number().int().min(-2).max(2).nullable().optional(),
      currentSeason: z.number().int().positive().nullable().optional(),
      currentEpisode: z.number().int().positive().nullable().optional(),
    })),
    (c) => {
      const userId = c.get('userId')
      const seriesId = parseInt(c.req.param('seriesId'), 10)
      if (isNaN(seriesId)) return c.json({ error: 'Invalid seriesId' }, 400)

      const data = c.req.valid('json')
      const entry = tvRepo.upsertWatchlistEntry(userId, seriesId, data)
      return c.json(entry)
    }
  )

  // DELETE /api/watch/tv/watchlist/:seriesId
  router.delete('/watchlist/:seriesId', (c) => {
    const userId = c.get('userId')
    const seriesId = parseInt(c.req.param('seriesId'), 10)
    if (isNaN(seriesId)) return c.json({ error: 'Invalid seriesId' }, 400)

    const deleted = tvRepo.deleteWatchlistEntry(userId, seriesId)
    if (!deleted) return c.json({ error: 'Not found' }, 404)
    return c.json({ ok: true })
  })

  // GET /api/watch/tv
  router.get('/', (c) => {
    const q = c.req.query('q')
    const tag = c.req.query('tag')
    return c.json(tvRepo.listSeries(q, tag))
  })

  // POST /api/watch/tv
  router.post(
    '/',
    zValidator('json', z.object({
      title: z.string().min(1),
      streaming: z.string().nullable().optional(),
      episodeRuntimeMinutes: z.number().int().positive().nullable().optional(),
      seasonCount: z.number().int().positive().nullable().optional(),
      releaseYear: z.number().int().positive().nullable().optional(),
      description: z.string().nullable().optional(),
      tagIds: z.array(z.number().int().positive()).optional(),
    })),
    (c) => {
      const userId = c.get('userId')
      const data = c.req.valid('json')
      const series = tvRepo.createSeries({ ...data, addedByUserId: userId })
      return c.json(series, 201)
    }
  )

  // GET /api/watch/tv/:id
  router.get('/:id', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)
    const series = tvRepo.getSeries(id)
    if (!series) return c.json({ error: 'Not found' }, 404)
    const allCast = castRepo.listCast('tv', id)
    const director = allCast.find(m => m.role === 'director')?.name ?? null
    const cast = allCast
      .filter(m => m.role === 'cast')
      .sort((a, b) => a.billingOrder - b.billingOrder)
      .map(m => ({ name: m.name, billingOrder: m.billingOrder }))
    return c.json({ ...series, director, cast })
  })

  // PUT /api/watch/tv/:id
  router.put(
    '/:id',
    zValidator('json', z.object({
      title: z.string().min(1).optional(),
      streaming: z.string().nullable().optional(),
      episodeRuntimeMinutes: z.number().int().positive().nullable().optional(),
      seasonCount: z.number().int().positive().nullable().optional(),
      releaseYear: z.number().int().positive().nullable().optional(),
      description: z.string().nullable().optional(),
      tagIds: z.array(z.number().int().positive()).optional(),
    })),
    (c) => {
      const id = parseInt(c.req.param('id'), 10)
      if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

      const data = c.req.valid('json')
      const series = tvRepo.updateSeries(id, data)
      if (!series) return c.json({ error: 'Not found' }, 404)
      return c.json(series)
    }
  )

  return router
}
