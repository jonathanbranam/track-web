import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { createHash } from 'crypto'
import { getSession, SESSION_COOKIE } from '../utils/session'
import type { IApiTokenRepository } from '../repositories/interfaces'
import type { AppEnv } from '../types'

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const sessionId = getCookie(c, SESSION_COOKIE)
  if (!sessionId) return c.json({ error: 'Unauthorized' }, 401)
  const userId = getSession(sessionId)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  c.set('userId', userId)
  await next()
})

// Admin = the single owner account, user 1. Requires a valid session AND
// userId === 1; non-admins get 403, unauthenticated requests get 401.
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const sessionId = getCookie(c, SESSION_COOKIE)
  if (!sessionId) return c.json({ error: 'Unauthorized' }, 401)
  const userId = getSession(sessionId)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  if (userId !== 1) return c.json({ error: 'Forbidden' }, 403)
  c.set('userId', userId)
  await next()
})

export function createAuthMiddleware(tokenRepo: IApiTokenRepository) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const rawToken = authHeader.slice(7)
      const hash = createHash('sha256').update(rawToken).digest('hex')
      const token = tokenRepo.findByHash(hash)
      if (token && token.expiresAt > new Date().toISOString()) {
        c.set('userId', token.userId)
        await next()
        return
      }
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const sessionId = getCookie(c, SESSION_COOKIE)
    if (!sessionId) return c.json({ error: 'Unauthorized' }, 401)
    const userId = getSession(sessionId)
    if (!userId) return c.json({ error: 'Unauthorized' }, 401)
    c.set('userId', userId)
    await next()
  })
}
