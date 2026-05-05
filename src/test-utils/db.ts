import Database from 'better-sqlite3'
import { afterEach } from 'vitest'
import { migrate, setDb } from '../db'
import { SqliteUserRepository } from '../repositories/sqlite/user.repository'
import { SqliteEntryRepository } from '../repositories/sqlite/entry.repository'
import { SqliteSocialRepository } from '../repositories/sqlite/social.repository'

export function setupTestDb() {
  const db = new Database(':memory:')
  migrate(db)
  const userRepo = new SqliteUserRepository(db)
  const entryRepo = new SqliteEntryRepository(db)
  const socialRepo = new SqliteSocialRepository(db)
  setDb(db)
  afterEach(() => setDb(null))
  return { db, userRepo, entryRepo, socialRepo }
}
