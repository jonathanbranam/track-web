import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { IOrbitalConfigRepository, OrbitalConfigError } from '../repositories/interfaces'
import type { AppEnv } from '../types'

// Orbital Dodger tuning configs, shared by every signed-in player (session auth
// comes from the app-level middleware on /api/games/*; no ownership or admin).
// The server treats `tuning` as an opaque key → value map — the client owns the
// Tuning schema and layers stored values over its shipped defaults.

const MAX_TUNING_BYTES = 8 * 1024

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(40, 'Name must be 40 characters or fewer')

const tuningSchema = z
  .record(z.string(), z.union([z.number(), z.boolean(), z.string()]))
  .refine((t) => JSON.stringify(t).length <= MAX_TUNING_BYTES, 'Tuning is too large')

const createSchema = z.object({ name: nameSchema, tuning: tuningSchema })

const updateSchema = z
  .object({ name: nameSchema.optional(), tuning: tuningSchema.optional() })
  .refine((b) => b.name !== undefined || b.tuning !== undefined, 'Nothing to update')

// A readable single message, so the panel can show it inline as-is.
const onInvalid = (result: { success: boolean; error?: z.ZodError }, c: { json: (b: unknown, s: 400) => Response }) => {
  if (!result.success) return c.json({ error: result.error?.issues[0]?.message ?? 'Invalid request' }, 400)
}

const ERRORS: Record<OrbitalConfigError, { status: 404 | 409 | 403; message: string }> = {
  'not-found': { status: 404, message: 'Config not found' },
  'name-taken': { status: 409, message: 'That name is already taken' },
  'is-default': { status: 403, message: 'The Default config cannot be renamed or deleted' },
}

export function createOrbitalConfigsRouter(repo: IOrbitalConfigRepository) {
  const router = new Hono<AppEnv>()

  const parseId = (raw: string): number | null => {
    const id = Number(raw)
    return Number.isInteger(id) && id > 0 ? id : null
  }

  router.get('/configs', (c) => c.json({ configs: repo.list() }))

  router.post('/configs', zValidator('json', createSchema, onInvalid), (c) => {
    const { name, tuning } = c.req.valid('json')
    const res = repo.create(name, tuning, c.get('userId') ?? null)
    if (!res.ok) return c.json({ error: ERRORS[res.error].message }, ERRORS[res.error].status)
    return c.json(res.config, 201)
  })

  router.patch('/configs/:id', zValidator('json', updateSchema, onInvalid), (c) => {
    const id = parseId(c.req.param('id'))
    if (id === null) return c.json({ error: ERRORS['not-found'].message }, 404)
    const res = repo.update(id, c.req.valid('json'), c.get('userId') ?? null)
    if (!res.ok) return c.json({ error: ERRORS[res.error].message }, ERRORS[res.error].status)
    return c.json(res.config)
  })

  router.delete('/configs/:id', (c) => {
    const id = parseId(c.req.param('id'))
    if (id === null) return c.json({ error: ERRORS['not-found'].message }, 404)
    const res = repo.delete(id)
    if (!res.ok) return c.json({ error: ERRORS[res.error].message }, ERRORS[res.error].status)
    return c.body(null, 204)
  })

  return router
}
