import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { createHash } from 'crypto'
import { hashSessionToken, SESSION_COOKIE } from '../utils/session'
import type { IApiTokenRepository, ISessionRepository } from '../repositories/interfaces'
import type { AppEnv } from '../types'

// Resolve a cookie session: hash the opaque token, look up a live row, reject if
// missing or expired. Returns the owning userId or null.
function resolveSession(sessionRepo: ISessionRepository, token: string | undefined): number | null {
  if (!token) return null
  const session = sessionRepo.findByHash(hashSessionToken(token))
  if (!session || session.expiresAt <= new Date().toISOString()) return null
  return session.userId
}

export function createSessionMiddleware(sessionRepo: ISessionRepository) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const userId = resolveSession(sessionRepo, getCookie(c, SESSION_COOKIE))
    if (userId === null) return c.json({ error: 'Unauthorized' }, 401)
    c.set('userId', userId)
    await next()
  })
}

// Admin = the single owner account, user 1. Requires a valid session AND
// userId === 1; non-admins get 403, unauthenticated requests get 401.
export function createRequireAdminMiddleware(sessionRepo: ISessionRepository) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const userId = resolveSession(sessionRepo, getCookie(c, SESSION_COOKIE))
    if (userId === null) return c.json({ error: 'Unauthorized' }, 401)
    if (userId !== 1) return c.json({ error: 'Forbidden' }, 403)
    c.set('userId', userId)
    await next()
  })
}

export function createAuthMiddleware(tokenRepo: IApiTokenRepository, sessionRepo: ISessionRepository) {
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

    const userId = resolveSession(sessionRepo, getCookie(c, SESSION_COOKIE))
    if (userId === null) return c.json({ error: 'Unauthorized' }, 401)
    c.set('userId', userId)
    await next()
  })
}
