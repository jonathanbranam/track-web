import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Context } from 'hono'
import type { ITripRepository, IPuttRepository } from '../repositories/interfaces'
import type { AppEnv } from '../types'

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

const createRoundSchema = z.object({
  name: z.string().default(''),
})

const upsertScoreSchema = z.object({
  userId: z.number().int().positive(),
  hole: z.number().int().min(1).max(18),
  strokes: z.number().int().min(1).max(50),
})

export function createPuttRouter(tripRepo: ITripRepository, puttRepo: IPuttRepository) {
  const router = new Hono<AppEnv>()

  // GET /:tripId/putt/rounds — list rounds for trip
  router.get('/:tripId/putt/rounds', (c) => {
    const tripId = parseInt(c.req.param('tripId'), 10)
    if (isNaN(tripId)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, tripId, tripRepo)
    if (denial) return denial

    const rounds = puttRepo.listRounds(tripId)
    return c.json({ rounds })
  })

  // POST /:tripId/putt/rounds — create a new round
  router.post('/:tripId/putt/rounds', zValidator('json', createRoundSchema), (c) => {
    const tripId = parseInt(c.req.param('tripId'), 10)
    if (isNaN(tripId)) return c.json({ error: 'Invalid trip ID' }, 422)

    const denial = checkAccess(c, tripId, tripRepo)
    if (denial) return denial

    const userId = c.get('userId')
    const { name } = c.req.valid('json')

    const existingRounds = puttRepo.listRounds(tripId)
    const roundName = name.trim() || `Round ${existingRounds.length + 1}`

    const round = puttRepo.createRound(tripId, roundName, userId)
    return c.json({ round }, 201)
  })

  // DELETE /:tripId/putt/rounds/:roundId — delete a round (owner only)
  router.delete('/:tripId/putt/rounds/:roundId', (c) => {
    const tripId = parseInt(c.req.param('tripId'), 10)
    const roundId = parseInt(c.req.param('roundId'), 10)
    if (isNaN(tripId) || isNaN(roundId)) return c.json({ error: 'Invalid ID' }, 422)

    const denial = checkAccess(c, tripId, tripRepo, true)
    if (denial) return denial

    const round = puttRepo.findRound(roundId)
    if (!round || round.tripId !== tripId) return c.json({ error: 'Round not found' }, 404)

    puttRepo.deleteRound(roundId)
    return c.json({ ok: true })
  })

  // GET /:tripId/putt/rounds/:roundId/scores — all scores + member list for a round
  router.get('/:tripId/putt/rounds/:roundId/scores', (c) => {
    const tripId = parseInt(c.req.param('tripId'), 10)
    const roundId = parseInt(c.req.param('roundId'), 10)
    if (isNaN(tripId) || isNaN(roundId)) return c.json({ error: 'Invalid ID' }, 422)

    const denial = checkAccess(c, tripId, tripRepo)
    if (denial) return denial

    const round = puttRepo.findRound(roundId)
    if (!round || round.tripId !== tripId) return c.json({ error: 'Round not found' }, 404)

    const scores = puttRepo.getScores(roundId)
    const members = puttRepo.listMembers(tripId)
    return c.json({ scores, members })
  })

  // PUT /:tripId/putt/rounds/:roundId/scores — upsert one score
  // Owner may set scores for any member; members may only set their own
  router.put('/:tripId/putt/rounds/:roundId/scores', zValidator('json', upsertScoreSchema), (c) => {
    const tripId = parseInt(c.req.param('tripId'), 10)
    const roundId = parseInt(c.req.param('roundId'), 10)
    if (isNaN(tripId) || isNaN(roundId)) return c.json({ error: 'Invalid ID' }, 422)

    const denial = checkAccess(c, tripId, tripRepo)
    if (denial) return denial

    const callerId = c.get('userId')
    const role = tripRepo.getMemberRole(tripId, callerId)
    const { userId, hole, strokes } = c.req.valid('json')

    if (role !== 'owner' && userId !== callerId) {
      return c.json({ error: 'Forbidden: cannot set scores for other players' }, 403)
    }

    // Verify target userId is a trip member
    const targetRole = tripRepo.getMemberRole(tripId, userId)
    if (!targetRole) return c.json({ error: 'Target player is not a trip member' }, 422)

    const round = puttRepo.findRound(roundId)
    if (!round || round.tripId !== tripId) return c.json({ error: 'Round not found' }, 404)

    const score = puttRepo.upsertScore(roundId, userId, hole, strokes)
    return c.json({ score })
  })

  return router
}
