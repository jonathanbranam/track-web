// Must be first: validates env vars and exits if any are missing
import './env'
import { serve } from '@hono/node-server'
import { getDb } from './db'
import { env } from './env'
import { SqliteUserRepository } from './repositories/sqlite/user.repository'
import { SqliteEntryRepository } from './repositories/sqlite/entry.repository'
import { SqliteSocialRepository } from './repositories/sqlite/social.repository'
import { SqliteMovieRepository } from './repositories/sqlite/movie.repository'
import { SqliteTvRepository } from './repositories/sqlite/tv.repository'
import { SqliteWatchEventRepository } from './repositories/sqlite/watch-event.repository'
import { CastSqliteRepository } from './repositories/sqlite/cast.repository'
import { SqliteTripRepository } from './repositories/sqlite/trip.repository'
import { createApp } from './app'

async function main() {
  // Initialize database and run migrations
  const db = getDb()

  const userRepo = new SqliteUserRepository(db)
  const entryRepo = new SqliteEntryRepository(db)
  const socialRepo = new SqliteSocialRepository(db)
  const movieRepo = new SqliteMovieRepository(db)
  const tvRepo = new SqliteTvRepository(db)
  const eventRepo = new SqliteWatchEventRepository(db)
  const castRepo = new CastSqliteRepository(db)
  const tripRepo = new SqliteTripRepository(db)

  const app = createApp(userRepo, entryRepo, socialRepo, movieRepo, tvRepo, eventRepo, castRepo, tripRepo)

  serve({ fetch: app.fetch, port: env.PORT })
  console.log(`[startup] Server listening on http://localhost:${env.PORT}`)
}

main().catch((err) => {
  console.error('[startup] Fatal error:', err)
  process.exit(1)
})
