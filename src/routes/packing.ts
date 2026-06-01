import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Context } from 'hono'
import type { ITripRepository, IPackingItemRepository, IPackingStateRepository } from '../repositories/interfaces'
import type { AppEnv } from '../types'

const OWNER_USER_ID = 1

const createItemSchema = z.object({
  section: z.string().default(''),
  text: z.string().min(1),
  position: z.number().int().min(0).default(0),
  userId: z.number().int().positive().nullable().optional(),
})

const updateItemSchema = z.object({
  section: z.string().optional(),
  text: z.string().min(1).optional(),
  position: z.number().int().min(0).optional(),
  userId: z.number().int().positive().nullable().optional(),
}).refine(
  d => d.section !== undefined || d.text !== undefined || d.position !== undefined || 'userId' in d,
  { message: 'At least one field is required' }
)

const toggleStateSchema = z.object({
  itemId: z.number().int().positive(),
  checked: z.boolean(),
})

const bulkReplaceSchema = z.object({
  items: z.array(z.object({
    id: z.number().int().positive().optional(),
    section: z.string().default(''),
    text: z.string().min(1),
    position: z.number().int().min(0).default(0),
    userId: z.number().int().positive().nullable().optional(),
  })),
})

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

function getItemForTrip(
  packingItemRepo: IPackingItemRepository,
  tripId: number,
  itemId: number,
  requestingUserId: number
) {
  const items = packingItemRepo.listByTrip(tripId, requestingUserId)
  return items.find(i => i.id === itemId) ?? null
}

export function createPackingRouter(tripRepo: ITripRepository, packingItemRepo: IPackingItemRepository, packingStateRepo: IPackingStateRepository) {
  const router = new Hono<AppEnv>()

  // GET /:id/packing/items — list items scoped to requesting user (membership required)
  router.get('/:id/packing/items', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, id, tripRepo)
    if (denial) return denial

    const userId = c.get('userId')
    const items = packingItemRepo.listByTrip(id, userId)
    return c.json({ items })
  })

  // POST /:id/packing/items — create item (membership required; non-owners always create personal items)
  router.post('/:id/packing/items', zValidator('json', createItemSchema), (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, id, tripRepo)
    if (denial) return denial

    const requesterId = c.get('userId')
    const body = c.req.valid('json')

    let userId: number | null
    if (requesterId === OWNER_USER_ID) {
      userId = body.userId ?? null
    } else {
      // Non-owners can only create personal items for themselves
      if (body.userId !== undefined && body.userId !== null && body.userId !== requesterId) {
        return c.json({ error: 'Forbidden' }, 403)
      }
      userId = requesterId
    }

    const item = packingItemRepo.create(id, { section: body.section, text: body.text, position: body.position, userId })
    return c.json({ item }, 201)
  })

  // PUT /:id/packing/items/bulk — bulk-replace all items (owner required)
  // Must be registered before /:id/packing/items/:itemId to avoid route conflict
  router.put('/:id/packing/items/bulk', zValidator('json', bulkReplaceSchema), (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, id, tripRepo, true)
    if (denial) return denial

    const body = c.req.valid('json')
    let items
    try {
      items = packingItemRepo.bulkReplace(id, body.items)
    } catch {
      return c.json({ error: 'One or more item IDs not found for this trip' }, 400)
    }
    return c.json({ items })
  })

  // PUT /:id/packing/items/:itemId — update item (owner required)
  router.put('/:id/packing/items/:itemId', zValidator('json', updateItemSchema), (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)
    const itemId = parseInt(c.req.param('itemId'), 10)
    if (isNaN(itemId)) return c.json({ error: 'Invalid item ID' }, 422)

    const denial = checkAccess(c, id, tripRepo, true)
    if (denial) return denial

    const existing = getItemForTrip(packingItemRepo, id, itemId, OWNER_USER_ID)
    if (!existing) return c.json({ error: 'Item not found' }, 404)

    const body = c.req.valid('json')
    const item = packingItemRepo.update(itemId, body)
    if (!item) return c.json({ error: 'Item not found' }, 404)
    return c.json({ item })
  })

  // DELETE /:id/packing/items/:itemId — delete item (owner can delete any; member can delete their own personal items)
  router.delete('/:id/packing/items/:itemId', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)
    const itemId = parseInt(c.req.param('itemId'), 10)
    if (isNaN(itemId)) return c.json({ error: 'Invalid item ID' }, 422)

    const denial = checkAccess(c, id, tripRepo)
    if (denial) return denial

    const requesterId = c.get('userId')
    const existing = getItemForTrip(packingItemRepo, id, itemId, requesterId)
    if (!existing) return c.json({ error: 'Item not found' }, 404)

    if (requesterId !== OWNER_USER_ID && existing.userId !== requesterId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    packingItemRepo.delete(itemId)
    return c.body(null, 204)
  })

  // GET /:id/packing/state — get current user's checked state (membership required)
  router.get('/:id/packing/state', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, id, tripRepo)
    if (denial) return denial

    const userId = c.get('userId')
    const state = packingStateRepo.getState(id, userId)
    return c.json({ state })
  })

  // PUT /:id/packing/state — toggle a packing item's checked state (membership required)
  router.put('/:id/packing/state', zValidator('json', toggleStateSchema), (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, id, tripRepo)
    if (denial) return denial

    const userId = c.get('userId')
    const { itemId, checked } = c.req.valid('json')
    const item = getItemForTrip(packingItemRepo, id, itemId, userId)
    if (!item) return c.json({ error: 'Item not found' }, 404)

    packingStateRepo.setState(itemId, userId, checked)
    return c.json({ ok: true })
  })

  // GET /:id/packing/summary — per-member completion (owner required)
  router.get('/:id/packing/summary', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, id, tripRepo, true)
    if (denial) return denial

    const members = packingStateRepo.getSummary(id)
    return c.json({ members })
  })

  return router
}
