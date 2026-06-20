import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { randomBytes, createHash } from 'crypto'
import bcrypt from 'bcrypt'
import type { IUserRepository, IApiTokenRepository } from '../repositories/interfaces'
import { createSession, decodeSession, clearSessionCookie, SESSION_COOKIE, COOKIE_MAX_AGE } from '../utils/session'
import { getCookie } from 'hono/cookie'
import { env } from '../env'
import { checkRateLimit, recordFailure, clearFailures } from '../utils/rate-limit'
import type { AppEnv } from '../types'
import type { MiddlewareHandler } from 'hono'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const createTokenSchema = z.object({
  label: z.string().min(1),
  days: z.number().int().min(1).max(180),
})

function getIp(c: Parameters<MiddlewareHandler>[0]): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ??
    c.req.header('x-real-ip') ??
    'unknown'
  )
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function createAuthRouter(
  userRepo: IUserRepository,
  tokenRepo: IApiTokenRepository,
  authMw: MiddlewareHandler<AppEnv>,
  sessionMw: MiddlewareHandler<AppEnv>
) {
  const router = new Hono<AppEnv>()

  router.post('/login', zValidator('json', loginSchema), async (c) => {
    const ip = getIp(c)

    const rateCheck = checkRateLimit(ip)
    if (!rateCheck.allowed) {
      const retryAfterSecs = Math.ceil((rateCheck.retryAfterMs ?? 0) / 1000)
      return c.json(
        { error: 'Too many failed attempts. Please try again later.' },
        429,
        { 'Retry-After': String(retryAfterSecs) }
      )
    }

    const { email, password } = c.req.valid('json')
    const user = userRepo.findByEmail(email)

    const dummyHash = '$2b$10$invalidhashfortimingnormalization000000000000000000000'
    const hashToCompare = user?.passwordHash ?? dummyHash
    const valid = await bcrypt.compare(password, hashToCompare)

    if (!user || !valid) {
      recordFailure(ip)
      return c.json({ error: 'Invalid email or password.' }, 401)
    }

    clearFailures(ip)
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

  router.post('/logout', (c) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (token) {
      const payload = decodeSession(token)
      if (payload) userRepo.rotateSessionNonce(payload.userId)
    }
    clearSessionCookie(c)
    return c.json({ ok: true })
  })

  router.get('/me', authMw, (c) => {
    const userId = c.get('userId')
    const row = userRepo.findById(userId)
    const displayName = row?.displayName ?? row?.email.split('@')[0] ?? String(userId)
    return c.json({ userId, displayName })
  })

  router.post('/forgot', (c) => {
    const ip = getIp(c)
    console.log(`[security] Forgot-login attempt | ip=${ip} | time=${new Date().toISOString()}`)
    return c.json({ message: 'For security reasons, please contact support.' })
  })

  // Token management — session auth only; bearer tokens may not manage tokens
  router.post('/tokens', sessionMw, zValidator('json', createTokenSchema), (c) => {
    const userId = c.get('userId')
    const { label, days } = c.req.valid('json')
    const rawToken = 'track_' + randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = addDays(days)
    const token = tokenRepo.create({ userId, tokenHash, label, expiresAt })
    return c.json(
      { id: token.id, label: token.label, expiresAt: token.expiresAt, token: rawToken },
      201
    )
  })

  router.get('/tokens', sessionMw, (c) => {
    const userId = c.get('userId')
    const tokens = tokenRepo.listByUser(userId)
    return c.json(
      tokens.map(t => ({ id: t.id, label: t.label, createdAt: t.createdAt, expiresAt: t.expiresAt }))
    )
  })

  router.delete('/tokens/:id', sessionMw, (c) => {
    const userId = c.get('userId')
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id) || id <= 0) return c.json({ error: 'Not found' }, 404)
    const deleted = tokenRepo.deleteById(id, userId)
    if (!deleted) return c.json({ error: 'Not found' }, 404)
    return c.json({ ok: true })
  })

  return router
}
