// Deletes expired rows from the sessions table. Safe to run anytime — when
// nothing is expired it deletes zero rows and exits successfully. Intended to
// run on a cron schedule (see setup.md). Supports --json for script-friendly output.
import 'dotenv/config'
import { getDb } from '../src/db'
import { SqliteSessionRepository } from '../src/repositories/sqlite/session.repository'

const asJson = process.argv.includes('--json')

const db = getDb()
const sessionRepo = new SqliteSessionRepository(db)
const deleted = sessionRepo.pruneExpired()

if (asJson) {
  console.log(JSON.stringify({ deleted }))
} else {
  console.log(`Pruned ${deleted} expired session(s).`)
}
