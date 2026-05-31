import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Context } from 'hono'
import type { ITripRepository } from '../repositories/interfaces'
import type { AppEnv } from '../types'

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish()

const createTripSchema = z.object({
  name: z.string().min(1).max(200),
  destination: z.string().max(200).nullish(),
  departureNotes: z.string().max(2000).nullish(),
  returnNotes: z.string().max(2000).nullish(),
  nights: z.number().int().min(0).nullish(),
  fullDays: z.number().int().min(0).nullish(),
  startDate: dateField,
  endDate: dateField,
  infoMarkdown: z.string().nullish(),
})

const updateTripSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  destination: z.string().max(200).nullish(),
  departureNotes: z.string().max(2000).nullish(),
  returnNotes: z.string().max(2000).nullish(),
  nights: z.number().int().min(0).nullish(),
  fullDays: z.number().int().min(0).nullish(),
  startDate: dateField,
  endDate: dateField,
  infoMarkdown: z.string().nullish(),
}).refine(d =>
  d.name !== undefined || d.destination !== undefined || d.departureNotes !== undefined ||
  d.returnNotes !== undefined || d.nights !== undefined || d.fullDays !== undefined ||
  d.startDate !== undefined || d.endDate !== undefined || d.infoMarkdown !== undefined,
  { message: 'At least one field is required' }
)

const addMemberSchema = z.object({
  userId: z.number().int().positive(),
})

// Returns a 403/404 response if access is denied, otherwise null.
// requireOwner=true also checks the user has the 'owner' role.
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

export function createTripsRouter(tripRepo: ITripRepository) {
  const router = new Hono<AppEnv>()

  // GET /current — must be before /:id
  router.get('/current', (c) => {
    const userId = c.get('userId')
    const trip = tripRepo.findCurrent(userId)
    if (!trip) return c.json({ error: 'No current trip set' }, 404)
    return c.json({ trip })
  })

  // GET / — list all trips (membership-filtered)
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
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
      infoMarkdown: body.infoMarkdown ?? null,
    })
    return c.json({ trip }, 201)
  })

  // GET /:id/members — list members
  router.get('/:id/members', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, id, tripRepo)
    if (denial) return denial

    const members = tripRepo.listMembers(id)
    return c.json({ members })
  })

  // POST /:id/members — add member (owner only)
  router.post('/:id/members', zValidator('json', addMemberSchema), (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, id, tripRepo, true)
    if (denial) return denial

    const { userId: newUserId } = c.req.valid('json')

    try {
      const member = tripRepo.addMember(id, newUserId, 'member')
      return c.json({ member }, 201)
    } catch (e: unknown) {
      const err = e as { code?: string }
      if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') return c.json({ error: 'Already a member' }, 409)
      if (err?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') return c.json({ error: 'User not found' }, 404)
      throw e
    }
  })

  // DELETE /:id/members/:userId — remove member (owner only)
  router.delete('/:id/members/:memberId', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, id, tripRepo, true)
    if (denial) return denial

    const requestingUserId = c.get('userId')
    const targetUserId = parseInt(c.req.param('memberId'), 10)
    if (isNaN(targetUserId)) return c.json({ error: 'Invalid user ID' }, 422)

    if (targetUserId === requestingUserId) return c.json({ error: 'Cannot remove yourself as owner' }, 400)

    const removed = tripRepo.removeMember(id, targetUserId)
    if (!removed) return c.json({ error: 'Member not found' }, 404)

    return c.body(null, 204)
  })

  // PUT /:id/set-current — mark as current (owner only)
  router.put('/:id/set-current', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, id, tripRepo, true)
    if (denial) return denial

    const userId = c.get('userId')
    const trip = tripRepo.setCurrent(userId, id)
    if (!trip) return c.json({ error: 'Trip not found' }, 404)
    return c.json({ trip })
  })

  // PUT /:id — update trip (owner only)
  router.put('/:id', zValidator('json', updateTripSchema), (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, id, tripRepo, true)
    if (denial) return denial

    const body = c.req.valid('json')
    const trip = tripRepo.update(id, {
      name: body.name,
      destination: body.destination,
      departureNotes: body.departureNotes,
      returnNotes: body.returnNotes,
      nights: body.nights,
      fullDays: body.fullDays,
      startDate: body.startDate,
      endDate: body.endDate,
      infoMarkdown: body.infoMarkdown,
    })
    return c.json({ trip })
  })

  // DELETE /:id (owner only)
  router.delete('/:id', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, id, tripRepo, true)
    if (denial) return denial

    tripRepo.delete(id)
    return c.body(null, 204)
  })

  return router
}
