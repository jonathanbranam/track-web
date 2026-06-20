import type Database from 'better-sqlite3'
import type { IUserRepository, User, UserSummary } from '../interfaces'

interface UserRow {
  id: number
  email: string
  password_hash: string
  display_name: string | null
}

function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, passwordHash: row.password_hash, displayName: row.display_name }
}

export class SqliteUserRepository implements IUserRepository {
  constructor(private db: Database.Database) {}

  findByEmail(email: string): User | null {
    const row = this.db
      .prepare('SELECT id, email, password_hash, display_name FROM users WHERE email = ?')
      .get(email) as UserRow | undefined

    if (!row) return null
    return toUser(row)
  }

  findById(id: number): User | null {
    const row = this.db
      .prepare('SELECT id, email, password_hash, display_name FROM users WHERE id = ?')
      .get(id) as UserRow | undefined

    if (!row) return null
    return toUser(row)
  }

  upsert(email: string, passwordHash: string): User {
    this.db
      .prepare(
        `INSERT INTO users (email, password_hash) VALUES (?, ?)
         ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash`
      )
      .run(email, passwordHash)

    return this.findByEmail(email)!
  }

  listAll(): UserSummary[] {
    const rows = this.db
      .prepare('SELECT id, email, display_name, created_at FROM users ORDER BY id')
      .all() as { id: number; email: string; display_name: string | null; created_at: string }[]
    return rows.map(r => ({ id: r.id, email: r.email, displayName: r.display_name, createdAt: r.created_at }))
  }

  createUser(email: string, passwordHash: string, displayName: string | null): UserSummary {
    const info = this.db
      .prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run(email, passwordHash, displayName)
    const id = Number(info.lastInsertRowid)
    const row = this.db
      .prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?')
      .get(id) as { id: number; email: string; display_name: string | null; created_at: string }
    return { id: row.id, email: row.email, displayName: row.display_name, createdAt: row.created_at }
  }

  deleteUser(id: number): boolean {
    const exists = this.db.prepare('SELECT id FROM users WHERE id = ?').get(id)
    if (!exists) return false
    // Cascade the user's data the same way the admin CLI does.
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM time_entries WHERE user_id = ?').run(id)
      this.db.prepare('DELETE FROM user_connections WHERE user_id_a = ? OR user_id_b = ?').run(id, id)
      this.db.prepare('DELETE FROM user_connection_requests WHERE from_user_id = ? OR to_user_id = ?').run(id, id)
      this.db.prepare('DELETE FROM user_invite_codes WHERE created_by_user_id = ?').run(id)
      this.db.prepare('DELETE FROM group_members WHERE user_id = ?').run(id)
      this.db.prepare('DELETE FROM user_movies WHERE user_id = ?').run(id)
      this.db.prepare('DELETE FROM user_tv_series WHERE user_id = ?').run(id)
      this.db.prepare('DELETE FROM watch_event_invites WHERE user_id = ?').run(id)
      this.db.prepare('DELETE FROM watch_event_votes WHERE user_id = ?').run(id)
      this.db.prepare('DELETE FROM users WHERE id = ?').run(id)
    })()
    return true
  }

  updatePassword(id: number, passwordHash: string): boolean {
    const info = this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id)
    return info.changes > 0
  }
}
