import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { createHash } from 'crypto'
import { decodeSession, SESSION_COOKIE } from '../utils/session'
import type { IApiTokenRepository, IUserRepository } from '../repositories/interfaces'
import type { AppEnv } from '../types'

export function createSessionMiddleware(userRepo: IUserRepository) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (!token) return c.json({ error: 'Unauthorized' }, 401)
    const payload = decodeSession(token)
    if (!payload) return c.json({ error: 'Unauthorized' }, 401)
    const user = userRepo.findById(payload.userId)
    if (!user || user.sessionNonce !== payload.sessionNonce) return c.json({ error: 'Unauthorized' }, 401)
    c.set('userId', payload.userId)
    await next()
  })
}

// Admin = the single owner account, user 1. Requires a valid session AND
// userId === 1; non-admins get 403, unauthenticated requests get 401.
export function createRequireAdminMiddleware(userRepo: IUserRepository) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (!token) return c.json({ error: 'Unauthorized' }, 401)
    const payload = decodeSession(token)
    if (!payload) return c.json({ error: 'Unauthorized' }, 401)
    const user = userRepo.findById(payload.userId)
    if (!user || user.sessionNonce !== payload.sessionNonce) return c.json({ error: 'Unauthorized' }, 401)
    if (payload.userId !== 1) return c.json({ error: 'Forbidden' }, 403)
    c.set('userId', payload.userId)
    await next()
  })
}

export function createAuthMiddleware(tokenRepo: IApiTokenRepository, userRepo: IUserRepository) {
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

    const token = getCookie(c, SESSION_COOKIE)
    if (!token) return c.json({ error: 'Unauthorized' }, 401)
    const payload = decodeSession(token)
    if (!payload) return c.json({ error: 'Unauthorized' }, 401)
    const user = userRepo.findById(payload.userId)
    if (!user || user.sessionNonce !== payload.sessionNonce) return c.json({ error: 'Unauthorized' }, 401)
    c.set('userId', payload.userId)
    await next()
  })
}
