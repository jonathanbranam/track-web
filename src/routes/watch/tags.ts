import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { IMovieRepository } from '../../repositories/interfaces'
import type { AppEnv } from '../../types'

export function createTagsRouter(movieRepo: IMovieRepository) {
  const router = new Hono<AppEnv>()

  router.get('/', (c) => {
    return c.json(movieRepo.listTags())
  })

  router.post(
    '/',
    zValidator('json', z.object({ name: z.string().min(1) })),
    (c) => {
      const { name } = c.req.valid('json')
      try {
        const tag = movieRepo.createTag(name)
        return c.json(tag, 201)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('UNIQUE constraint failed')) return c.json({ error: 'Tag already exists' }, 409)
        throw err
      }
    }
  )

  return router
}
