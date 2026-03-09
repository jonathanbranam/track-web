// Must be first: validates env vars and exits if any are missing
import './env'
import { serve } from '@hono/node-server'
import { getDb } from './db'
import { env } from './env'
import { SqliteUserRepository } from './repositories/sqlite/user.repository'
import { SqliteEntryRepository } from './repositories/sqlite/entry.repository'
import { createApp } from './app'

async function main() {
  // Initialize database and run migrations
  const db = getDb()

  // Wire up repositories (Task 4.6: inject into app, no direct SQLite in routes)
  const userRepo = new SqliteUserRepository(db)
  const entryRepo = new SqliteEntryRepository(db)

  // Task 3.3: Seed / update user from env on every startup
  userRepo.upsert(env.EMAIL, env.PASSWORD_HASH)
  console.log(`[startup] User ready: ${env.EMAIL}`)

  const app = createApp(userRepo, entryRepo)

  serve({ fetch: app.fetch, port: env.PORT })
  console.log(`[startup] Server listening on http://localhost:${env.PORT}`)
}

main().catch((err) => {
  console.error('[startup] Fatal error:', err)
  process.exit(1)
})
