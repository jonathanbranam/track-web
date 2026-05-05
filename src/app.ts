import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { IUserRepository, IEntryRepository, ISocialRepository } from './repositories/interfaces'
import { createAuthRouter } from './routes/auth'
import { createEntriesRouter } from './routes/entries'
import { createSocialRouter } from './routes/social'
import { authMiddleware } from './middleware/auth'
import { clearSessionCookie } from './utils/session'
import type { AppEnv } from './types'

export function createApp(
  userRepo: IUserRepository,
  entryRepo: IEntryRepository,
  socialRepo: ISocialRepository
): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  // Convenience logout URL — navigate to /logout in any browser tab
  app.get('/logout', (c) => {
    clearSessionCookie(c)
    return c.redirect('/login')
  })

  // Auth routes — no global auth middleware; individual routes opt in as needed
  app.route('/api/auth', createAuthRouter(userRepo))

  // Social routes — auth enforced per-route inside the router
  app.use('/api/social/*', authMiddleware)
  app.route('/api/social', createSocialRouter(socialRepo))

  // App-specific routes — auth enforced here at the app level
  app.use('/api/time/*', authMiddleware)
  app.route('/api/time/entries', createEntriesRouter(entryRepo))

  // Serve compiled time frontend (fallback for non-Caddy environments)
  app.use('/*', serveStatic({ root: './client-time/dist' }))

  app.get('/*', (c) => {
    try {
      const html = readFileSync(join(process.cwd(), 'client-time', 'dist', 'index.html'), 'utf-8')
      return c.html(html)
    } catch {
      return c.text('Frontend not built. Run: npm run build:time', 503)
    }
  })

  return app
}
