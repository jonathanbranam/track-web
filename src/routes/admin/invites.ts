import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import type { AppEnv } from '../../types'

const createSchema = z.object({
  email: z.string().email(),
  expiresIn: z.number().int().min(1).max(365).optional(),
})

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function createAdminInvitesRouter() {
  const router = new Hono<AppEnv>()

  router.post('/', zValidator('json', createSchema), async (c) => {
    const { getDb } = await import('../../db')
    const db = getDb()
    const { email, expiresIn = 7 } = c.req.valid('json')
    const userId = c.get('userId')

    const existing = db.prepare(
      `SELECT id FROM invites WHERE email = ? AND used_at IS NULL AND expires_at > datetime('now')`
    ).get(email)
    if (existing) return c.json({ error: 'A pending invite already exists for that email' }, 409)

    const token = randomBytes(32).toString('base64url')
    const expiresAt = addDays(expiresIn)

    const result = db.prepare(
      `INSERT INTO invites (token, email, expires_at, created_by) VALUES (?, ?, ?, ?)`
    ).run(token, email, expiresAt, userId)

    const id = Number(result.lastInsertRowid)
    const url = `https://me.branam.us/invite/${token}`

    return c.json({ id, url, token, expiresAt }, 201)
  })

  router.get('/', async (c) => {
    const { getDb } = await import('../../db')
    const db = getDb()
    const rows = db.prepare(
      `SELECT id, token, email, expires_at, used_at, created_at FROM invites ORDER BY created_at DESC`
    ).all() as { id: number; token: string; email: string; expires_at: string; used_at: string | null; created_at: string }[]

    return c.json(rows.map(r => ({
      id: r.id,
      email: r.email,
      expiresAt: r.expires_at,
      usedAt: r.used_at,
      url: `https://me.branam.us/invite/${r.token}`,
    })))
  })

  router.delete('/:id', async (c) => {
    const { getDb } = await import('../../db')
    const db = getDb()
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id) || id <= 0) return c.json({ error: 'Invalid id' }, 400)

    const invite = db.prepare(`SELECT id, used_at FROM invites WHERE id = ?`).get(id) as
      | { id: number; used_at: string | null }
      | undefined
    if (!invite) return c.json({ error: 'Invite not found' }, 404)
    if (invite.used_at) return c.json({ error: 'Cannot revoke an already-used invite' }, 409)

    db.prepare('DELETE FROM invites WHERE id = ?').run(id)
    return c.json({ ok: true })
  })

  return router
}
