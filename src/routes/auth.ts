import { Hono } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import type { IUserRepository } from '../repositories/interfaces'
import { createSession, destroySession, SESSION_COOKIE, COOKIE_MAX_AGE } from '../utils/session'
import { checkRateLimit, recordFailure, clearFailures } from '../utils/rate-limit'
import { authMiddleware } from '../middleware/auth'
import type { AppEnv } from '../types'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function getIp(c: Parameters<typeof authMiddleware>[0]): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ??
    c.req.header('x-real-ip') ??
    'unknown'
  )
}

export function createAuthRouter(userRepo: IUserRepository) {
  const router = new Hono<AppEnv>()

  // Task 3.4: POST /api/auth/login
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

    // Constant-time response: always compare even if user not found
    const dummyHash = '$2b$12$invalidhashfortimingnormalization000000000000000000000'
    const hashToCompare = user?.passwordHash ?? dummyHash
    const valid = await bcrypt.compare(password, hashToCompare)

    if (!user || !valid) {
      recordFailure(ip)
      return c.json({ error: 'Invalid email or password.' }, 401)
    }

    clearFailures(ip)
    const sessionId = createSession(user.id)

    setCookie(c, SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return c.json({ ok: true })
  })

  // Task 3.5: POST /api/auth/logout
  router.post('/logout', (c) => {
    const sessionId = getCookie(c, SESSION_COOKIE)
    if (sessionId) destroySession(sessionId)
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    return c.json({ ok: true })
  })

  // Task 3.6: GET /api/auth/me
  router.get('/me', authMiddleware, (c) => {
    const userId = c.get('userId')
    return c.json({ userId })
  })

  // Task 3.9: POST /api/auth/forgot — log the attempt, return generic message
  router.post('/forgot', (c) => {
    const ip = getIp(c)
    console.log(`[security] Forgot-login attempt | ip=${ip} | time=${new Date().toISOString()}`)
    return c.json({ message: 'For security reasons, please contact support.' })
  })

  return router
}
