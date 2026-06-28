import Database from 'better-sqlite3'
import { afterEach } from 'vitest'
import { migrate, setDb } from '../db'
import { SqliteUserRepository } from '../repositories/sqlite/user.repository'
import { SqliteEntryRepository } from '../repositories/sqlite/entry.repository'
import { SqliteSocialRepository } from '../repositories/sqlite/social.repository'
import { SqliteSessionRepository } from '../repositories/sqlite/session.repository'
import { mintSessionToken, hashSessionToken, COOKIE_MAX_AGE } from '../utils/session'
import type { ISessionRepository } from '../repositories/interfaces'

export function setupTestDb() {
  const db = new Database(':memory:')
  migrate(db)
  const userRepo = new SqliteUserRepository(db)
  const entryRepo = new SqliteEntryRepository(db)
  const socialRepo = new SqliteSocialRepository(db)
  const sessionRepo = new SqliteSessionRepository(db)
  setDb(db)
  afterEach(() => setDb(null))
  return { db, userRepo, entryRepo, socialRepo, sessionRepo }
}

// Insert a live session for `userId` and return the raw cookie token to send as
// `sid=<token>`. Mirrors what POST /login does, for tests that bypass login.
export function createTestSession(
  sessionRepo: ISessionRepository,
  userId: number,
  userAgent = 'test-agent'
): string {
  const rawToken = mintSessionToken()
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toISOString()
  sessionRepo.create(userId, hashSessionToken(rawToken), expiresAt, userAgent)
  return rawToken
}
