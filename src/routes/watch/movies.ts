import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { IMovieRepository, ICastRepository } from '../../repositories/interfaces'
import type { AppEnv } from '../../types'

export function createMoviesRouter(movieRepo: IMovieRepository, castRepo: ICastRepository) {
  const router = new Hono<AppEnv>()

  // GET /api/watch/movies/series — must be before /:id
  router.get('/series', (c) => {
    return c.json(movieRepo.listSeries())
  })

  // POST /api/watch/movies/series
  router.post(
    '/series',
    zValidator('json', z.object({ name: z.string().min(1) })),
    (c) => {
      const { name } = c.req.valid('json')
      const series = movieRepo.createSeries(name)
      return c.json(series, 201)
    }
  )

  // PUT /api/watch/movies/series/:id
  router.put(
    '/series/:id',
    zValidator('json', z.object({
      name: z.string().min(1).optional(),
      entries: z.array(z.object({
        movieId: z.number().int().positive(),
        position: z.number().int(),
      })).optional(),
    })),
    (c) => {
      const id = parseInt(c.req.param('id'), 10)
      if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

      const { name, entries } = c.req.valid('json')

      if (entries) {
        const movieIds = entries.map(e => e.movieId)
        if (new Set(movieIds).size !== movieIds.length) {
          return c.json({ error: 'Duplicate movieId in entries' }, 400)
        }
      }

      const series = movieRepo.updateSeries(id, { name, entries })
      if (!series) return c.json({ error: 'Not found' }, 404)
      return c.json(series)
    }
  )

  // GET /api/watch/movies/watchlist — must be before /:id
  router.get('/watchlist', (c) => {
    const userId = c.get('userId')
    return c.json(movieRepo.getWatchlist(userId))
  })

  // PUT /api/watch/movies/watchlist/:movieId
  router.put(
    '/watchlist/:movieId',
    zValidator('json', z.object({
      state: z.enum(['unseen', 'watched', 'would_watch_again']),
      rating: z.number().int().min(-2).max(2).nullable().optional(),
    })),
    (c) => {
      const userId = c.get('userId')
      const movieId = parseInt(c.req.param('movieId'), 10)
      if (isNaN(movieId)) return c.json({ error: 'Invalid movieId' }, 400)

      const { state, rating } = c.req.valid('json')
      const entry = movieRepo.upsertWatchlistEntry(userId, movieId, { state, rating })
      return c.json(entry)
    }
  )

  // DELETE /api/watch/movies/watchlist/:movieId
  router.delete('/watchlist/:movieId', (c) => {
    const userId = c.get('userId')
    const movieId = parseInt(c.req.param('movieId'), 10)
    if (isNaN(movieId)) return c.json({ error: 'Invalid movieId' }, 400)

    const deleted = movieRepo.deleteWatchlistEntry(userId, movieId)
    if (!deleted) return c.json({ error: 'Not found' }, 404)
    return c.json({ ok: true })
  })

  // GET /api/watch/movies
  router.get('/', (c) => {
    const q = c.req.query('q')
    const tag = c.req.query('tag')
    return c.json(movieRepo.listMovies(q, tag))
  })

  // POST /api/watch/movies
  router.post(
    '/',
    zValidator('json', z.object({
      title: z.string().min(1),
      runtimeMinutes: z.number().int().positive().nullable().optional(),
      releaseYear: z.number().int().positive().nullable().optional(),
      description: z.string().nullable().optional(),
      streaming: z.string().nullable().optional(),
      tagIds: z.array(z.number().int().positive()).optional(),
    })),
    (c) => {
      const userId = c.get('userId')
      const data = c.req.valid('json')
      const movie = movieRepo.createMovie({ ...data, addedByUserId: userId })
      return c.json(movie, 201)
    }
  )

  // GET /api/watch/movies/:id
  router.get('/:id', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)
    const movie = movieRepo.getMovie(id)
    if (!movie) return c.json({ error: 'Not found' }, 404)
    const allCast = castRepo.listCast('movie', id)
    const director = allCast.find(m => m.role === 'director')?.name ?? null
    const cast = allCast
      .filter(m => m.role === 'cast')
      .sort((a, b) => a.billingOrder - b.billingOrder)
      .map(m => ({ name: m.name, billingOrder: m.billingOrder }))
    return c.json({ ...movie, director, cast })
  })

  // PUT /api/watch/movies/:id
  router.put(
    '/:id',
    zValidator('json', z.object({
      title: z.string().min(1).optional(),
      runtimeMinutes: z.number().int().positive().nullable().optional(),
      releaseYear: z.number().int().positive().nullable().optional(),
      description: z.string().nullable().optional(),
      streaming: z.string().nullable().optional(),
      tagIds: z.array(z.number().int().positive()).optional(),
    })),
    (c) => {
      const id = parseInt(c.req.param('id'), 10)
      if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

      const data = c.req.valid('json')
      const movie = movieRepo.updateMovie(id, data)
      if (!movie) return c.json({ error: 'Not found' }, 404)
      return c.json(movie)
    }
  )

  return router
}
