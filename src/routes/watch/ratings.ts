import { Hono } from 'hono'
import type { IMovieRepository, ITvRepository, RatingItem } from '../../repositories/interfaces'
import type { AppEnv } from '../../types'

export function createRatingsRouter(movieRepo: IMovieRepository, tvRepo: ITvRepository) {
  const router = new Hono<AppEnv>()

  // GET /api/watch/ratings
  router.get('/', (c) => {
    const userId = c.get('userId')
    const movieRatings = movieRepo.getMovieRatings(userId)
    const tvRatings = tvRepo.getTvRatings(userId)

    const merged: RatingItem[] = [...movieRatings, ...tvRatings].sort((a, b) => {
      if (a.rating === null && b.rating === null) return 0
      if (a.rating === null) return 1
      if (b.rating === null) return -1
      return b.rating - a.rating
    })

    return c.json(merged)
  })

  return router
}
