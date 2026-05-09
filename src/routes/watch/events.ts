import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { IWatchEventRepository, IMovieRepository, ITvRepository, ISocialRepository } from '../../repositories/interfaces'
import type { AppEnv } from '../../types'

const inviteeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('user'), userId: z.number().int().positive() }),
  z.object({ type: z.literal('group'), groupId: z.number().int().positive() }),
])

export function createEventsRouter(
  eventRepo: IWatchEventRepository,
  movieRepo: IMovieRepository,
  tvRepo: ITvRepository,
  socialRepo: ISocialRepository
) {
  const router = new Hono<AppEnv>()

  // GET /api/watch/events
  router.get('/', (c) => {
    const userId = c.get('userId')
    const filter = c.req.query('filter') as 'active' | 'completed-recent' | undefined
    const validFilter = filter === 'active' || filter === 'completed-recent' ? filter : undefined
    return c.json(eventRepo.listEvents(userId, validFilter))
  })

  // POST /api/watch/events
  router.post(
    '/',
    zValidator('json', z.object({
      title: z.string().min(1),
      scheduledDate: z.string().min(1),
      invitees: z.array(inviteeSchema).default([]),
    })),
    (c) => {
      const userId = c.get('userId')
      const { title, scheduledDate, invitees } = c.req.valid('json')

      const inviteeUserIds = new Set<number>()
      for (const inv of invitees) {
        if (inv.type === 'user') {
          if (!socialRepo.isConnected(userId, inv.userId)) {
            return c.json({ error: `User ${inv.userId} is not connected to you` }, 403)
          }
          inviteeUserIds.add(inv.userId)
        } else {
          if (!socialRepo.isMember(inv.groupId, userId)) {
            return c.json({ error: `You are not a member of group ${inv.groupId}` }, 403)
          }
          const members = eventRepo.getGroupMembers(inv.groupId)
          for (const memberId of members) {
            inviteeUserIds.add(memberId)
          }
        }
      }

      const event = eventRepo.createEvent({
        title,
        scheduledDate,
        createdByUserId: userId,
        inviteeUserIds: Array.from(inviteeUserIds),
      })
      return c.json(event, 201)
    }
  )

  // DELETE /api/watch/events/:id
  router.delete('/:id', (c) => {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

    if (!eventRepo.isInvited(id, userId)) return c.json({ error: 'Forbidden' }, 403)

    eventRepo.deleteEvent(id)
    return c.body(null, 204)
  })

  // DELETE /api/watch/events/:id/selection
  router.delete('/:id/selection', (c) => {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

    if (!eventRepo.isInvited(id, userId)) return c.json({ error: 'Forbidden' }, 403)

    const event = eventRepo.getEvent(id)
    if (!event) return c.json({ error: 'Not found' }, 404)
    if (event.completedAt) return c.json({ error: 'Event is completed' }, 409)

    eventRepo.clearSelection(id)
    return c.body(null, 204)
  })

  // POST /api/watch/events/:id/reopen
  router.post('/:id/reopen', (c) => {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

    if (!eventRepo.isInvited(id, userId)) return c.json({ error: 'Forbidden' }, 403)

    const event = eventRepo.getEvent(id)
    if (!event) return c.json({ error: 'Not found' }, 404)
    if (!event.completedAt) return c.json({ error: 'Event is not completed' }, 409)

    eventRepo.reopenEvent(id)
    return c.json({ ok: true })
  })

  // PATCH /api/watch/events/:id
  router.patch(
    '/:id',
    zValidator('json', z.object({
      title: z.string().min(1).optional(),
      scheduledDate: z.string().min(1).optional(),
    })),
    (c) => {
      const userId = c.get('userId')
      const id = parseInt(c.req.param('id'), 10)
      if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

      if (!eventRepo.isInvited(id, userId)) return c.json({ error: 'Forbidden' }, 403)

      const data = c.req.valid('json')
      if (!data.title && !data.scheduledDate) return c.json({ error: 'Provide title or scheduledDate' }, 400)

      const updated = eventRepo.patchEvent(id, data)
      return c.json(updated)
    }
  )

  // GET /api/watch/events/:id
  router.get('/:id', (c) => {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

    const detail = eventRepo.getEventDetail(id)
    if (!detail) return c.json({ error: 'Not found' }, 404)

    const { event } = detail
    const isParticipant = event.createdByUserId === userId || eventRepo.isInvited(id, userId)
    if (!isParticipant) return c.json({ error: 'Forbidden' }, 403)

    return c.json(detail)
  })

  // PUT /api/watch/events/:id/attendance
  router.put(
    '/:id/attendance',
    zValidator('json', z.object({
      attendance: z.enum(['yes', 'no', 'maybe']),
      userId: z.number().int().positive().optional(),
    })),
    (c) => {
      const callerId = c.get('userId')
      const id = parseInt(c.req.param('id'), 10)
      if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

      if (!eventRepo.isInvited(id, callerId)) return c.json({ error: 'Forbidden' }, 403)

      const { attendance, userId: targetUserId } = c.req.valid('json')
      const targetId = targetUserId ?? callerId
      if (!eventRepo.isInvited(id, targetId)) return c.json({ error: 'Target user is not a participant' }, 404)

      eventRepo.upsertAttendance(id, targetId, attendance)
      return c.json({ ok: true })
    }
  )

  // POST /api/watch/events/:id/candidates
  router.post(
    '/:id/candidates',
    zValidator('json', z.object({
      movieId: z.number().int().positive().optional(),
      seriesId: z.number().int().positive().optional(),
    })),
    (c) => {
      const userId = c.get('userId')
      const id = parseInt(c.req.param('id'), 10)
      if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

      if (!eventRepo.isInvited(id, userId)) return c.json({ error: 'Forbidden' }, 403)

      const { movieId, seriesId } = c.req.valid('json')
      if (!movieId && !seriesId) return c.json({ error: 'Provide movieId or seriesId' }, 400)
      if (movieId && seriesId) return c.json({ error: 'Provide only one of movieId or seriesId' }, 400)

      try {
        const candidate = eventRepo.addCandidate(id, {
          itemType: movieId ? 'movie' : 'tv',
          movieId: movieId ?? null,
          seriesId: seriesId ?? null,
          suggestedByUserId: userId,
        })
        return c.json(candidate, 201)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('UNIQUE constraint failed')) return c.json({ error: 'Already nominated' }, 409)
        throw err
      }
    }
  )

  // DELETE /api/watch/events/:id/candidates/:candidateId
  router.delete('/:id/candidates/:candidateId', (c) => {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'), 10)
    const candidateId = parseInt(c.req.param('candidateId'), 10)
    if (isNaN(id) || isNaN(candidateId)) return c.json({ error: 'Invalid id' }, 400)

    if (!eventRepo.isInvited(id, userId)) return c.json({ error: 'Forbidden' }, 403)

    const event = eventRepo.getEvent(id)
    if (!event) return c.json({ error: 'Not found' }, 404)
    if (event.completedAt) return c.json({ error: 'Event is completed' }, 409)

    const candidate = eventRepo.getCandidate(candidateId)
    if (!candidate) return c.json({ error: 'Candidate not found' }, 404)

    eventRepo.removeCandidate(candidateId)
    return c.body(null, 204)
  })

  // POST /api/watch/events/:id/candidates/:candidateId/vote — Tasks 5.2 + 5.3
  router.post(
    '/:id/candidates/:candidateId/vote',
    zValidator('json', z.object({ vote: z.number().int().min(-2).max(2) })),
    (c) => {
      const userId = c.get('userId')
      const id = parseInt(c.req.param('id'), 10)
      const candidateId = parseInt(c.req.param('candidateId'), 10)
      if (isNaN(id) || isNaN(candidateId)) return c.json({ error: 'Invalid id' }, 400)

      if (!eventRepo.isInvited(id, userId)) return c.json({ error: 'Forbidden' }, 403)

      const { vote } = c.req.valid('json')
      eventRepo.upsertVote(id, candidateId, userId, vote)

      // Task 5.3: seed watchlist rating from vote
      const candidate = eventRepo.getCandidate(candidateId)
      if (candidate) {
        if (candidate.itemType === 'movie' && candidate.movieId) {
          movieRepo.seedWatchlistRating(userId, candidate.movieId, vote)
        } else if (candidate.itemType === 'tv' && candidate.seriesId) {
          tvRepo.seedWatchlistRating(userId, candidate.seriesId, vote)
        }
      }

      return c.json({ ok: true })
    }
  )

  // PUT /api/watch/events/:id/selection
  router.put(
    '/:id/selection',
    zValidator('json', z.object({
      candidateId: z.number().int().positive(),
      episodeMode: z.enum(['latest', 'specific']).nullable().optional(),
      seasonFrom: z.number().int().positive().nullable().optional(),
      episodeFrom: z.number().int().positive().nullable().optional(),
      seasonTo: z.number().int().positive().nullable().optional(),
      episodeTo: z.number().int().positive().nullable().optional(),
    })),
    (c) => {
      const userId = c.get('userId')
      const id = parseInt(c.req.param('id'), 10)
      if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

      const event = eventRepo.getEvent(id)
      if (!event) return c.json({ error: 'Not found' }, 404)
      if (event.createdByUserId !== userId) return c.json({ error: 'Forbidden' }, 403)

      const data = c.req.valid('json')
      eventRepo.upsertSelection(id, data)
      return c.json({ ok: true })
    }
  )

  // POST /api/watch/events/:id/invitees
  router.post(
    '/:id/invitees',
    zValidator('json', z.object({ invitees: z.array(inviteeSchema) })),
    (c) => {
      const userId = c.get('userId')
      const id = parseInt(c.req.param('id'), 10)
      if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

      const event = eventRepo.getEvent(id)
      if (!event) return c.json({ error: 'Not found' }, 404)
      if (event.completedAt) return c.json({ error: 'Event is completed' }, 409)

      const isParticipant = event.createdByUserId === userId || eventRepo.isInvited(id, userId)
      if (!isParticipant) return c.json({ error: 'Forbidden' }, 403)

      const { invitees } = c.req.valid('json')
      for (const inv of invitees) {
        if (inv.type === 'user') {
          if (!socialRepo.isConnected(userId, inv.userId)) {
            return c.json({ error: `User ${inv.userId} is not connected to you` }, 403)
          }
          eventRepo.addInvitee(id, inv.userId)
        } else {
          if (!socialRepo.isMember(inv.groupId, userId)) {
            return c.json({ error: `You are not a member of group ${inv.groupId}` }, 403)
          }
          const members = eventRepo.getGroupMembers(inv.groupId)
          for (const memberId of members) {
            eventRepo.addInvitee(id, memberId)
          }
        }
      }
      return c.json({ ok: true })
    }
  )

  // DELETE /api/watch/events/:id/invitees/:userId
  router.delete('/:id/invitees/:inviteeId', (c) => {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'), 10)
    const inviteeId = parseInt(c.req.param('inviteeId'), 10)
    if (isNaN(id) || isNaN(inviteeId)) return c.json({ error: 'Invalid id' }, 400)

    const event = eventRepo.getEvent(id)
    if (!event) return c.json({ error: 'Not found' }, 404)
    if (event.completedAt) return c.json({ error: 'Event is completed' }, 409)

    const isParticipant = event.createdByUserId === userId || eventRepo.isInvited(id, userId)
    if (!isParticipant) return c.json({ error: 'Forbidden' }, 403)

    if (inviteeId === event.createdByUserId) return c.json({ error: 'Cannot remove the event creator' }, 403)

    const removed = eventRepo.removeInvitee(id, inviteeId)
    if (!removed) return c.json({ error: 'Invitee not found' }, 404)

    return c.json({ ok: true })
  })

  // POST /api/watch/events/:id/complete — Tasks 5.2 + 5.4
  router.post('/:id/complete', (c) => {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

    const event = eventRepo.getEvent(id)
    if (!event) return c.json({ error: 'Not found' }, 404)
    if (event.createdByUserId !== userId) return c.json({ error: 'Forbidden' }, 403)
    if (event.completedAt) return c.json({ error: 'Event already completed' }, 409)

    const selection = eventRepo.getSelection(id)
    if (!selection) return c.json({ error: 'No selection confirmed yet' }, 409)

    const completedAt = new Date().toISOString()
    eventRepo.completeEvent(id, completedAt)

    // Task 5.4: apply watchlist transitions for all yes-RSVP attendees
    const candidate = eventRepo.getCandidate(selection.candidateId)
    if (candidate) {
      const yesUserIds = eventRepo.getYesRsvpUserIds(id)
      for (const attendeeId of yesUserIds) {
        if (candidate.itemType === 'movie' && candidate.movieId) {
          movieRepo.applyWatchedTransition(attendeeId, candidate.movieId)
        } else if (candidate.itemType === 'tv' && candidate.seriesId) {
          const seasonTo = selection.episodeMode === 'specific' ? selection.seasonTo : null
          const episodeTo = selection.episodeMode === 'specific' ? selection.episodeTo : null
          tvRepo.applyWatchingTransition(attendeeId, candidate.seriesId, seasonTo, episodeTo)
        }
      }
    }

    return c.json({ ok: true })
  })

  return router
}
