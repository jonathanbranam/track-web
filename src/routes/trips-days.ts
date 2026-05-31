import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Context } from 'hono'
import type { ITripRepository, ITripDayRepository } from '../repositories/interfaces'
import type { AppEnv } from '../types'

const dateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

const updateDaySchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  weather: z.string().nullable().optional(),
}).refine(
  d => d.title !== undefined || d.body !== undefined || d.weather !== undefined,
  { message: 'At least one field is required' }
)

function checkAccess(
  c: Context<AppEnv>,
  tripId: number,
  tripRepo: ITripRepository,
  requireOwner = false
): Response | null {
  const trip = tripRepo.findById(tripId)
  if (!trip) return c.json({ error: 'Trip not found' }, 404) as Response

  const userId = c.get('userId')
  const role = tripRepo.getMemberRole(tripId, userId)
  if (!role) return c.json({ error: 'Forbidden' }, 403) as Response
  if (requireOwner && role !== 'owner') return c.json({ error: 'Forbidden' }, 403) as Response

  return null
}

export function createTripDaysRouter(tripRepo: ITripRepository, tripDayRepo: ITripDayRepository) {
  const router = new Hono<AppEnv>()

  // GET /:id/days — list all day records (membership required)
  router.get('/:id/days', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, id, tripRepo)
    if (denial) return denial

    const days = tripDayRepo.listByTrip(id)
    return c.json({ days })
  })

  // PUT /:id/days/:date — update a day record (owner only)
  router.put('/:id/days/:date', zValidator('json', updateDaySchema), (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const date = c.req.param('date')
    const dateValidation = dateParam.safeParse(date)
    if (!dateValidation.success) return c.json({ error: 'Date must be YYYY-MM-DD' }, 400)

    const denial = checkAccess(c, id, tripRepo, true)
    if (denial) return denial

    const body = c.req.valid('json')

    try {
      const day = tripDayRepo.upsertDay(id, date, {
        title: body.title,
        body: body.body,
        weather: body.weather,
      })
      return c.json({ day })
    } catch (e: unknown) {
      const err = e as { status?: number }
      if (err?.status === 404) return c.json({ error: 'Day not found' }, 404)
      throw e
    }
  })

  return router
}
