// Must be first: validates env vars and exits if any are missing
import './env'
import { serve } from '@hono/node-server'
import { getDb } from './db'
import { env } from './env'
import { SqliteUserRepository } from './repositories/sqlite/user.repository'
import { SqliteEntryRepository } from './repositories/sqlite/entry.repository'
import { SqliteSocialRepository } from './repositories/sqlite/social.repository'
import { createApp } from './app'

async function main() {
  // Initialize database and run migrations
  const db = getDb()

  const userRepo = new SqliteUserRepository(db)
  const entryRepo = new SqliteEntryRepository(db)
  const socialRepo = new SqliteSocialRepository(db)

  const app = createApp(userRepo, entryRepo, socialRepo)

  serve({ fetch: app.fetch, port: env.PORT })
  console.log(`[startup] Server listening on http://localhost:${env.PORT}`)
}

main().catch((err) => {
  console.error('[startup] Fatal error:', err)
  process.exit(1)
})
