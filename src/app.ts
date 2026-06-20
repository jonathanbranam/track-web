import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFileSync } from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'
import type { IUserRepository, IEntryRepository, ISocialRepository, IMovieRepository, ITvRepository, IWatchEventRepository, ICastRepository, ITripRepository, ITripDayRepository, IPackingItemRepository, IPackingStateRepository, IApiTokenRepository, IPuttRepository, IGameScoreRepository } from './repositories/interfaces'
import { createVersionRouter } from './routes/version'
import { createAuthRouter } from './routes/auth'
import { createDeployRouter } from './routes/deploy'
import { createAdminRouter } from './routes/admin'
import { createEntriesRouter } from './routes/entries'
import { createSocialRouter } from './routes/social'
import { createTripsRouter } from './routes/trips'
import { createTripDaysRouter } from './routes/trips-days'
import { createPackingRouter } from './routes/packing'
import { createPuttRouter } from './routes/putt'
import { createScoresRouter } from './routes/scores'
import { createTagsRouter } from './routes/watch/tags'
import { createMoviesRouter } from './routes/watch/movies'
import { createTvRouter } from './routes/watch/tv'
import { createEventsRouter } from './routes/watch/events'
import { createRatingsRouter } from './routes/watch/ratings'
import { createExternalRouter } from './routes/watch/external'
import { createAuthMiddleware, createSessionMiddleware } from './middleware/auth'
import { clearSessionCookie, decodeSession, SESSION_COOKIE } from './utils/session'
import { getCookie } from 'hono/cookie'
import type { AppEnv } from './types'

let cachedOpenApiSpec: unknown = null
try {
  const raw = readFileSync(join(process.cwd(), 'openapi.yaml'), 'utf-8')
  cachedOpenApiSpec = yaml.load(raw)
} catch {
  console.warn('[openapi] openapi.yaml not found or failed to parse — /api/openapi.json will return 404')
}

let cachedLlmContext: string | null = null
try {
  cachedLlmContext = readFileSync(join(process.cwd(), 'llm-context.md'), 'utf-8')
} catch {
  console.warn('[openapi] llm-context.md not found — /api/llm-context.md will return 404')
}

export function createApp(
  userRepo: IUserRepository,
  entryRepo: IEntryRepository,
  socialRepo: ISocialRepository,
  movieRepo: IMovieRepository,
  tvRepo: ITvRepository,
  eventRepo: IWatchEventRepository,
  castRepo: ICastRepository,
  tripRepo: ITripRepository,
  tripDayRepo: ITripDayRepository,
  packingItemRepo: IPackingItemRepository,
  packingStateRepo: IPackingStateRepository,
  tokenRepo: IApiTokenRepository,
  puttRepo: IPuttRepository,
  scoreRepo: IGameScoreRepository
): Hono<AppEnv> {
  const app = new Hono<AppEnv>()
  const sessionMw = createSessionMiddleware(userRepo)
  const authMiddleware = createAuthMiddleware(tokenRepo, userRepo)

  // Version info — no auth, registered before auth middleware
  app.route('/api/version', createVersionRouter())

  // OpenAPI spec and LLM context — no auth, registered before auth middleware
  app.get('/api/openapi.json', (c) => {
    if (!cachedOpenApiSpec) return c.json({ error: 'API spec not available' }, 404)
    return c.json(cachedOpenApiSpec)
  })

  app.get('/api/llm-context.md', (c) => {
    if (!cachedLlmContext) return c.json({ error: 'LLM context not available' }, 404)
    return c.text(cachedLlmContext, 200, { 'Content-Type': 'text/markdown; charset=utf-8' })
  })

  // Convenience logout URL — navigate to /logout in any browser tab
  app.get('/logout', (c) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (token) {
      const payload = decodeSession(token)
      if (payload) userRepo.rotateSessionNonce(payload.userId)
    }
    clearSessionCookie(c)
    return c.redirect('/login')
  })

  // Auth routes — no global auth middleware; individual routes opt in as needed
  app.route('/api/auth', createAuthRouter(userRepo, tokenRepo, authMiddleware, sessionMw))

  // Deploy webhook — HMAC-verified inside the router (no session auth)
  app.route('/api/deploy', createDeployRouter())

  // Admin app routes — every route requires session auth + userId === 1
  app.route('/api/admin', createAdminRouter(userRepo))

  // Social routes — auth enforced per-route inside the router
  app.use('/api/social/*', authMiddleware)
  app.route('/api/social', createSocialRouter(socialRepo))

  // App-specific routes — auth enforced here at the app level
  app.use('/api/time/*', authMiddleware)
  app.route('/api/time/entries', createEntriesRouter(entryRepo))

  // Trips app routes
  app.use('/api/trips/*', authMiddleware)
  app.route('/api/trips', createTripsRouter(tripRepo))
  app.route('/api/trips', createTripDaysRouter(tripRepo, tripDayRepo))
  app.route('/api/trips', createPackingRouter(tripRepo, packingItemRepo, packingStateRepo))
  app.route('/api/trips', createPuttRouter(tripRepo, puttRepo))

  // Games scores
  app.use('/api/scores/*', authMiddleware)
  app.route('/api/scores', createScoresRouter(scoreRepo))

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
