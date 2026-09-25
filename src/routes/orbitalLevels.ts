import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { IOrbitalLevelRepository, OrbitalLevelError } from '../repositories/interfaces'
import type { AppEnv } from '../types'
import { nameSchema, onInvalid } from './orbitalConfigs'

// Orbital Dodger saved levels, shared by every signed-in player (session auth
// comes from the app-level middleware on /api/games/*; no ownership or admin).
// Unlike configs, the layout is validated here: geometry has no safe fallback,
// and a NaN position or a bad orbit index would break the scene.
//
// These limits are mirrored client-side in
// client-games/src/games/orbital-dodger/levels.ts (LEVEL_LIMITS) — keep in sync.
export const LEVEL_LIMITS = {
  width: 400,
  height: 720,
  minRadius: 12,
  maxRadius: 90,
  minRingHeight: 20,
  maxRingHeight: 200,
  minStars: 1,
  maxStars: 30,
  maxPlanets: 12,
  maxBytes: 16 * 1024,
} as const

const L = LEVEL_LIMITS
const coord = (max: number, what: string) =>
  z.number().finite().min(0, `${what} must be inside the play area`).max(max, `${what} must be inside the play area`)

const pointSchema = (what: string) => z.object({ x: coord(L.width, what), y: coord(L.height, what) })

const planetSchema = pointSchema('Planets').extend({
  r: z.number().finite().min(L.minRadius, `Planet radius must be ${L.minRadius}–${L.maxRadius}`)
    .max(L.maxRadius, `Planet radius must be ${L.minRadius}–${L.maxRadius}`),
  color: z.number().int().min(0, 'Planet color is invalid').max(4, 'Planet color is invalid'),
  ringHeight: z.number().finite().min(L.minRingHeight, `Ring height must be ${L.minRingHeight}–${L.maxRingHeight}`)
    .max(L.maxRingHeight, `Ring height must be ${L.minRingHeight}–${L.maxRingHeight}`).optional(),
})

const startSchema = z.discriminatedUnion('kind', [
  pointSchema('The start').extend({ kind: z.literal('point') }),
  z.object({
    kind: z.literal('orbit'),
    planet: z.number().int().min(0, 'The orbit start names a planet the level does not have'),
    angleDeg: z.number().finite(),
    dir: z.union([z.literal(1), z.literal(-1)]),
  }),
])

export const layoutSchema = z
  .object({
    v: z.literal(1),
    start: startSchema,
    planets: z.array(planetSchema).max(L.maxPlanets, `A level can have at most ${L.maxPlanets} planets`),
    stars: z
      .array(pointSchema('Stars'))
      .min(L.minStars, 'A level needs at least one star')
      .max(L.maxStars, `A level can have at most ${L.maxStars} stars`),
  })
  .refine(
    (l) => l.start.kind !== 'orbit' || l.start.planet < l.planets.length,
    'The orbit start names a planet the level does not have',
  )
  .refine((l) => JSON.stringify(l).length <= L.maxBytes, 'Level is too large')

const createSchema = z.object({ name: nameSchema, layout: layoutSchema })

const updateSchema = z
  .object({ name: nameSchema.optional(), layout: layoutSchema.optional() })
  .refine((b) => b.name !== undefined || b.layout !== undefined, 'Nothing to update')

const ERRORS: Record<OrbitalLevelError, { status: 404 | 409; message: string }> = {
  'not-found': { status: 404, message: 'Level not found' },
  'name-taken': { status: 409, message: 'That name is already taken' },
}

export function createOrbitalLevelsRouter(repo: IOrbitalLevelRepository) {
  const router = new Hono<AppEnv>()

  const parseId = (raw: string): number | null => {
    const id = Number(raw)
    return Number.isInteger(id) && id > 0 ? id : null
  }

  router.get('/levels', (c) => c.json({ levels: repo.list() }))

  router.post('/levels', zValidator('json', createSchema, onInvalid), (c) => {
    const { name, layout } = c.req.valid('json')
    const res = repo.create(name, layout, c.get('userId') ?? null)
    if (!res.ok) return c.json({ error: ERRORS[res.error].message }, ERRORS[res.error].status)
    return c.json(res.level, 201)
  })

  router.patch('/levels/:id', zValidator('json', updateSchema, onInvalid), (c) => {
    const id = parseId(c.req.param('id'))
    if (id === null) return c.json({ error: ERRORS['not-found'].message }, 404)
    const res = repo.update(id, c.req.valid('json'), c.get('userId') ?? null)
    if (!res.ok) return c.json({ error: ERRORS[res.error].message }, ERRORS[res.error].status)
    return c.json(res.level)
  })

  router.delete('/levels/:id', (c) => {
    const id = parseId(c.req.param('id'))
    if (id === null) return c.json({ error: ERRORS['not-found'].message }, 404)
    const res = repo.delete(id)
    if (!res.ok) return c.json({ error: ERRORS[res.error].message }, ERRORS[res.error].status)
    return c.body(null, 204)
  })

  return router
}
