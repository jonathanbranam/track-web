import type Database from 'better-sqlite3'
import type { IUserRepository, User } from '../interfaces'

interface UserRow {
  id: number
  email: string
  password_hash: string
}

export class SqliteUserRepository implements IUserRepository {
  constructor(private db: Database.Database) {}

  findByEmail(email: string): User | null {
    const row = this.db
      .prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
      .get(email) as UserRow | undefined

    if (!row) return null
    return { id: row.id, email: row.email, passwordHash: row.password_hash }
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
}
