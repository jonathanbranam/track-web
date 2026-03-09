import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { IEntryRepository } from '../repositories/interfaces'
import { parseTags, normalizeDescription, tagsToString } from '../utils/tags'
import { getDayBounds, getTodayDateString } from '../utils/date'
import { authMiddleware } from '../middleware/auth'
import type { AppEnv } from '../types'

const createEntrySchema = z.object({
  description: z.string().min(1).max(500),
  startedAt: z.string().datetime({ offset: true }),
})

const updateEntrySchema = z
  .object({
    startedAt: z.string().datetime({ offset: true }).optional(),
    endedAt: z.string().datetime({ offset: true }).optional(),
  })
  .refine((d) => d.startedAt !== undefined || d.endedAt !== undefined, {
    message: 'At least one of startedAt or endedAt is required',
  })

export function createEntriesRouter(entryRepo: IEntryRepository) {
  const router = new Hono<AppEnv>()

  // Task 3.7: auth middleware on all entry routes
  router.use('*', authMiddleware)

  // Task 4.3: GET /api/entries/running — must be before /:id
  router.get('/running', (c) => {
    const userId = c.get('userId')
    const entry = entryRepo.getRunning(userId)
    return c.json({ entry: entry ?? null })
  })

  // Task 4.4: GET /api/entries?date=YYYY-MM-DD
  router.get('/', (c) => {
    const userId = c.get('userId')
    const dateStr = c.req.query('date') ?? getTodayDateString()

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return c.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, 422)
    }

    const { startUtc, endUtc } = getDayBounds(dateStr)
    const entries = entryRepo.listByDay(userId, startUtc, endUtc)
    return c.json({ entries })
  })

  // Task 4.1: POST /api/entries — start a new task
  router.post('/', zValidator('json', createEntrySchema), (c) => {
    const userId = c.get('userId')
    const { description, startedAt } = c.req.valid('json')

    // Enforce: only one running entry at a time
    const running = entryRepo.getRunning(userId)
    if (running) {
      return c.json(
        { error: 'A task is already running. Stop it before starting a new one.' },
        409
      )
    }

    // Enforce: no overlap with previous entry
    const latest = entryRepo.getLatestEnded(userId)
    if (latest?.endedAt && startedAt < latest.endedAt) {
      return c.json(
        {
          error: 'Start time cannot be before the end of the previous entry.',
          previousEndedAt: latest.endedAt,
        },
        422
      )
    }

    // Task 2.6: normalize description and parse tags
    const normalizedDescription = normalizeDescription(description)
    const tags = parseTags(normalizedDescription)

    const entry = entryRepo.create({
      userId,
      description: normalizedDescription,
      tags: tagsToString(tags),
      startedAt,
    })

    return c.json({ entry }, 201)
  })

  // Task 4.2: PATCH /api/entries/:id — update start/end time or stop
  router.patch('/:id', zValidator('json', updateEntrySchema), (c) => {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) return c.json({ error: 'Invalid entry ID.' }, 422)

    const existing = entryRepo.findById(id)
    if (!existing || existing.userId !== userId) {
      return c.json({ error: 'Entry not found.' }, 404)
    }

    const updates = c.req.valid('json')
    const newStartedAt = updates.startedAt ?? existing.startedAt
    const newEndedAt = updates.endedAt ?? existing.endedAt

    if (newEndedAt && newEndedAt < newStartedAt) {
      return c.json({ error: 'End time cannot be before start time.' }, 422)
    }

    const updated = entryRepo.update(id, {
      startedAt: updates.startedAt,
      endedAt: updates.endedAt,
    })

    if (!updated) return c.json({ error: 'Entry not found.' }, 404)
    return c.json({ entry: updated })
  })

  return router
}
