import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { ITripRepository } from '../repositories/interfaces'
import type { AppEnv } from '../types'

const createTripSchema = z.object({
  name: z.string().min(1).max(200),
  destination: z.string().max(200).nullish(),
  departureNotes: z.string().max(2000).nullish(),
  returnNotes: z.string().max(2000).nullish(),
  nights: z.number().int().min(0).nullish(),
  fullDays: z.number().int().min(0).nullish(),
})

const updateTripSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  destination: z.string().max(200).nullish(),
  departureNotes: z.string().max(2000).nullish(),
  returnNotes: z.string().max(2000).nullish(),
  nights: z.number().int().min(0).nullish(),
  fullDays: z.number().int().min(0).nullish(),
}).refine(d =>
  d.name !== undefined || d.destination !== undefined || d.departureNotes !== undefined ||
  d.returnNotes !== undefined || d.nights !== undefined || d.fullDays !== undefined,
  { message: 'At least one field is required' }
)

export function createTripsRouter(tripRepo: ITripRepository) {
  const router = new Hono<AppEnv>()

  // GET /current — must be before /:id
  router.get('/current', (c) => {
    const userId = c.get('userId')
    const trip = tripRepo.findCurrent(userId)
    if (!trip) return c.json({ error: 'No current trip set' }, 404)
    return c.json({ trip })
  })

  // GET / — list all trips
  router.get('/', (c) => {
    const userId = c.get('userId')
    return c.json({ trips: tripRepo.list(userId) })
  })

  // POST / — create trip
  router.post('/', zValidator('json', createTripSchema), (c) => {
    const userId = c.get('userId')
    const body = c.req.valid('json')
    const trip = tripRepo.create({
      userId,
      name: body.name,
      destination: body.destination ?? null,
      departureNotes: body.departureNotes ?? null,
      returnNotes: body.returnNotes ?? null,
      nights: body.nights ?? null,
      fullDays: body.fullDays ?? null,
    })
    return c.json({ trip }, 201)
  })

  // PUT /:id/set-current — mark as current
  router.put('/:id/set-current', (c) => {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)
    const trip = tripRepo.setCurrent(userId, id)
    if (!trip) return c.json({ error: 'Trip not found' }, 404)
    return c.json({ trip })
  })

  // PUT /:id — update trip
  router.put('/:id', zValidator('json', updateTripSchema), (c) => {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const existing = tripRepo.findById(id)
    if (!existing || existing.userId !== userId) return c.json({ error: 'Trip not found' }, 404)

    const body = c.req.valid('json')
    const trip = tripRepo.update(id, {
      name: body.name,
      destination: body.destination,
      departureNotes: body.departureNotes,
      returnNotes: body.returnNotes,
      nights: body.nights,
      fullDays: body.fullDays,
    })
    return c.json({ trip })
  })

  // DELETE /:id
  router.delete('/:id', (c) => {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const existing = tripRepo.findById(id)
    if (!existing || existing.userId !== userId) return c.json({ error: 'Trip not found' }, 404)

    tripRepo.delete(id)
    return c.body(null, 204)
  })

  return router
}
