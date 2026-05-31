import type Database from 'better-sqlite3'
import type { IApiTokenRepository, ApiToken } from '../interfaces'

interface ApiTokenRow {
  id: number
  user_id: number
  token_hash: string
  label: string
  expires_at: string
  created_at: string
}

function rowToToken(row: ApiTokenRow): ApiToken {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    label: row.label,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }
}

export class SqliteApiTokenRepository implements IApiTokenRepository {
  constructor(private db: Database.Database) {}

  create(input: { userId: number; tokenHash: string; label: string; expiresAt: string }): ApiToken {
    const result = this.db
      .prepare(
        `INSERT INTO api_tokens (user_id, token_hash, label, expires_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(input.userId, input.tokenHash, input.label, input.expiresAt)
    const row = this.db
      .prepare('SELECT * FROM api_tokens WHERE id = ?')
      .get(Number(result.lastInsertRowid)) as ApiTokenRow
    return rowToToken(row)
  }

  findByHash(tokenHash: string): ApiToken | null {
    const row = this.db
      .prepare('SELECT * FROM api_tokens WHERE token_hash = ?')
      .get(tokenHash) as ApiTokenRow | undefined
    return row ? rowToToken(row) : null
  }

  listByUser(userId: number): ApiToken[] {
    const rows = this.db
      .prepare('SELECT * FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as ApiTokenRow[]
    return rows.map(rowToToken)
  }

  deleteById(id: number, userId: number): boolean {
    const result = this.db
      .prepare('DELETE FROM api_tokens WHERE id = ? AND user_id = ?')
      .run(id, userId)
    return result.changes > 0
  }
}
