import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { setCookie } from 'hono/cookie'
import bcrypt from 'bcrypt'
import type { IUserRepository } from '../repositories/interfaces'
import { createSession, SESSION_COOKIE, COOKIE_MAX_AGE } from '../utils/session'
import { env } from '../env'
import type { AppEnv } from '../types'

const claimSchema = z.object({
  password: z.string().min(1),
  displayName: z.string().min(1).optional(),
})

export function createInvitesRouter(userRepo: IUserRepository) {
  const router = new Hono<AppEnv>()

  router.get('/:token', async (c) => {
    const { getDb } = await import('../db')
    const db = getDb()
    const token = c.req.param('token')

    const invite = db.prepare(
      `SELECT email, expires_at FROM invites WHERE token = ? AND used_at IS NULL AND expires_at > datetime('now')`
    ).get(token) as { email: string; expires_at: string } | undefined

    if (!invite) return c.json({ error: 'Invite not found or expired' }, 404)

    return c.json({ email: invite.email, expiresAt: invite.expires_at })
  })

  router.post('/:token/claim', zValidator('json', claimSchema), async (c) => {
    const { getDb } = await import('../db')
    const db = getDb()
    const token = c.req.param('token')
    const { password, displayName } = c.req.valid('json')

    const invite = db.prepare(
      `SELECT id, email, expires_at FROM invites WHERE token = ? AND used_at IS NULL AND expires_at > datetime('now')`
    ).get(token) as { id: number; email: string; expires_at: string } | undefined

    if (!invite) return c.json({ error: 'Invite not found or expired' }, 404)

    const passwordHash = await bcrypt.hash(password, 12)
    const now = new Date().toISOString()

    let user = userRepo.findByEmail(invite.email)
    if (user) {
      userRepo.updatePassword(user.id, passwordHash)
      if (displayName) userRepo.updateDisplayName(user.id, displayName)
      user = userRepo.findByEmail(invite.email)!
    } else {
      userRepo.createUser(invite.email, passwordHash, displayName ?? null)
      user = userRepo.findByEmail(invite.email)!
    }

    db.prepare(`UPDATE invites SET used_at = ? WHERE id = ?`).run(now, invite.id)

    const sessionId = createSession(user.id, user.sessionNonce)
    setCookie(c, SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: env.isProd,
      sameSite: 'Lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      domain: env.isProd ? '.branam.us' : undefined,
    })

    return c.json({ ok: true })
  })

  return router
}
