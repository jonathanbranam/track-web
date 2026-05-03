import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { getCookie, deleteCookie } from 'hono/cookie'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { IUserRepository, IEntryRepository } from './repositories/interfaces'
import { createAuthRouter } from './routes/auth'
import { createEntriesRouter } from './routes/entries'
import { authMiddleware } from './middleware/auth'
import { destroySession, SESSION_COOKIE } from './utils/session'
import { env } from './env'
import type { AppEnv } from './types'

export function createApp(
  userRepo: IUserRepository,
  entryRepo: IEntryRepository
): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  // Convenience logout URL — navigate to /logout in any browser tab
  app.get('/logout', (c) => {
    const sessionId = getCookie(c, SESSION_COOKIE)
    if (sessionId) destroySession(sessionId)
    deleteCookie(c, SESSION_COOKIE, { path: '/', domain: env.isProd ? '.branam.us' : undefined })
    return c.redirect('/login')
  })

  // Auth routes — no global auth middleware; individual routes opt in as needed
  app.route('/api/auth', createAuthRouter(userRepo))

  // App-specific routes — auth enforced here at the app level
  app.use('/api/tracker/*', authMiddleware)
  app.route('/api/tracker/entries', createEntriesRouter(entryRepo))

  // Serve compiled tracker frontend (fallback for non-Caddy environments)
  app.use('/*', serveStatic({ root: './client-tracker/dist' }))

  app.get('/*', (c) => {
    try {
      const html = readFileSync(join(process.cwd(), 'client-tracker', 'dist', 'index.html'), 'utf-8')
      return c.html(html)
    } catch {
      return c.text('Frontend not built. Run: npm run build:tracker', 503)
    }
  })

  return app
}
