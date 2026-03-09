import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { getSession, SESSION_COOKIE } from '../utils/session'
import type { AppEnv } from '../types'

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const sessionId = getCookie(c, SESSION_COOKIE)
  if (!sessionId) return c.json({ error: 'Unauthorized' }, 401)

  const userId = getSession(sessionId)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  c.set('userId', userId)
  await next()
})
