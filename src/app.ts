import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { IUserRepository, IEntryRepository } from './repositories/interfaces'
import { createAuthRouter } from './routes/auth'
import { createEntriesRouter } from './routes/entries'
import type { AppEnv } from './types'

export function createApp(
  userRepo: IUserRepository,
  entryRepo: IEntryRepository
): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  // API routes (take precedence over static files)
  app.route('/api/auth', createAuthRouter(userRepo))
  app.route('/api/entries', createEntriesRouter(entryRepo))

  // Task 5.1: Serve compiled frontend static files
  app.use('/*', serveStatic({ root: './dist' }))

  // Task 5.2: SPA fallback — serve index.html for all unmatched routes
  app.get('/*', (c) => {
    try {
      const html = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf-8')
      return c.html(html)
    } catch {
      return c.text('Frontend not built. Run: npm run build:client', 503)
    }
  })

  return app
}
