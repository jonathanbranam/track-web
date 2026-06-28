import type Database from 'better-sqlite3'
import type { ISessionRepository, Session } from '../interfaces'

interface SessionRow {
  id: number
  user_id: number
  token_hash: string
  expires_at: string
  user_agent: string | null
  created_at: string
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }
}

export class SqliteSessionRepository implements ISessionRepository {
  constructor(private db: Database.Database) {}

  create(userId: number, tokenHash: string, expiresAt: string, userAgent?: string | null): Session {
    const result = this.db
      .prepare(
        `INSERT INTO sessions (user_id, token_hash, expires_at, user_agent)
         VALUES (?, ?, ?, ?)`
      )
      .run(userId, tokenHash, expiresAt, userAgent ?? null)
    const row = this.db
      .prepare('SELECT * FROM sessions WHERE id = ?')
      .get(Number(result.lastInsertRowid)) as SessionRow
    return rowToSession(row)
  }

  findByHash(tokenHash: string): Session | null {
    const row = this.db
      .prepare('SELECT * FROM sessions WHERE token_hash = ?')
      .get(tokenHash) as SessionRow | undefined
    return row ? rowToSession(row) : null
  }

  deleteByHash(tokenHash: string): boolean {
    const result = this.db
      .prepare('DELETE FROM sessions WHERE token_hash = ?')
      .run(tokenHash)
    return result.changes > 0
  }

  deleteByUser(userId: number): number {
    const result = this.db
      .prepare('DELETE FROM sessions WHERE user_id = ?')
      .run(userId)
    return result.changes
  }

  pruneExpired(): number {
    const result = this.db
      .prepare(`DELETE FROM sessions WHERE expires_at <= ?`)
      .run(new Date().toISOString())
    return result.changes
  }
}
