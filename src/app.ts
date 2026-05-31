import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { IUserRepository, IEntryRepository, ISocialRepository, IMovieRepository, ITvRepository, IWatchEventRepository, ICastRepository, ITripRepository, IApiTokenRepository } from './repositories/interfaces'
import { createAuthRouter } from './routes/auth'
import { createDeployRouter } from './routes/deploy'
import { createEntriesRouter } from './routes/entries'
import { createSocialRouter } from './routes/social'
import { createTripsRouter } from './routes/trips'
import { createTagsRouter } from './routes/watch/tags'
import { createMoviesRouter } from './routes/watch/movies'
import { createTvRouter } from './routes/watch/tv'
import { createEventsRouter } from './routes/watch/events'
import { createRatingsRouter } from './routes/watch/ratings'
import { createExternalRouter } from './routes/watch/external'
import { createAuthMiddleware, sessionMiddleware } from './middleware/auth'
import { clearSessionCookie } from './utils/session'
import type { AppEnv } from './types'

export function createApp(
  userRepo: IUserRepository,
  entryRepo: IEntryRepository,
  socialRepo: ISocialRepository,
  movieRepo: IMovieRepository,
  tvRepo: ITvRepository,
  eventRepo: IWatchEventRepository,
  castRepo: ICastRepository,
  tripRepo: ITripRepository,
  tokenRepo: IApiTokenRepository
): Hono<AppEnv> {
  const app = new Hono<AppEnv>()
  const authMiddleware = createAuthMiddleware(tokenRepo)

  // Convenience logout URL — navigate to /logout in any browser tab
  app.get('/logout', (c) => {
    clearSessionCookie(c)
    return c.redirect('/login')
  })

  // Auth routes — no global auth middleware; individual routes opt in as needed
  app.route('/api/auth', createAuthRouter(userRepo, tokenRepo, authMiddleware, sessionMiddleware))

  // Deploy webhook + admin trigger — auth handled inside the router
  app.route('/api/deploy', createDeployRouter())

  // Social routes — auth enforced per-route inside the router
  app.use('/api/social/*', authMiddleware)
  app.route('/api/social', createSocialRouter(socialRepo))

  // App-specific routes — auth enforced here at the app level
  app.use('/api/time/*', authMiddleware)
  app.route('/api/time/entries', createEntriesRouter(entryRepo))

  // Trips app routes
  app.use('/api/trips/*', authMiddleware)
  app.route('/api/trips', createTripsRouter(tripRepo))

  // Watch app routes
  app.use('/api/watch/*', authMiddleware)
  app.route('/api/watch/tags', createTagsRouter(movieRepo))
  app.route('/api/watch/movies', createMoviesRouter(movieRepo, castRepo))
  app.route('/api/watch/tv', createTvRouter(tvRepo, castRepo))
  app.route('/api/watch/events', createEventsRouter(eventRepo, movieRepo, tvRepo, socialRepo))
  app.route('/api/watch/ratings', createRatingsRouter(movieRepo, tvRepo))
  app.route('/api/watch/external', createExternalRouter(movieRepo, tvRepo, castRepo))

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
