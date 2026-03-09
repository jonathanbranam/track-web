import type Database from 'better-sqlite3'
import type { IEntryRepository, TimeEntry, CreateEntryInput } from '../interfaces'

interface EntryRow {
  id: number
  user_id: number
  description: string
  tags: string
  started_at: string
  ended_at: string | null
  created_at: string
}

function rowToEntry(row: EntryRow): TimeEntry {
  return {
    id: row.id,
    userId: row.user_id,
    description: row.description,
    tags: row.tags,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
  }
}

export class SqliteEntryRepository implements IEntryRepository {
  constructor(private db: Database.Database) {}

  create(input: CreateEntryInput): TimeEntry {
    const result = this.db
      .prepare(
        `INSERT INTO time_entries (user_id, description, tags, started_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(input.userId, input.description, input.tags, input.startedAt)

    return this.findById(Number(result.lastInsertRowid))!
  }

  findById(id: number): TimeEntry | null {
    const row = this.db
      .prepare('SELECT * FROM time_entries WHERE id = ?')
      .get(id) as EntryRow | undefined
    return row ? rowToEntry(row) : null
  }

  getRunning(userId: number): TimeEntry | null {
    const row = this.db
      .prepare(
        'SELECT * FROM time_entries WHERE user_id = ? AND ended_at IS NULL LIMIT 1'
      )
      .get(userId) as EntryRow | undefined
    return row ? rowToEntry(row) : null
  }

  getLatestEnded(userId: number): TimeEntry | null {
    const row = this.db
      .prepare(
        `SELECT * FROM time_entries
         WHERE user_id = ? AND ended_at IS NOT NULL
         ORDER BY ended_at DESC LIMIT 1`
      )
      .get(userId) as EntryRow | undefined
    return row ? rowToEntry(row) : null
  }

  update(id: number, data: { startedAt?: string; endedAt?: string }): TimeEntry | null {
    if (data.startedAt !== undefined) {
      this.db
        .prepare('UPDATE time_entries SET started_at = ? WHERE id = ?')
        .run(data.startedAt, id)
    }
    if (data.endedAt !== undefined) {
      this.db
        .prepare('UPDATE time_entries SET ended_at = ? WHERE id = ?')
        .run(data.endedAt, id)
    }
    return this.findById(id)
  }

  // Task 2.5: date-range query using 4am US/Eastern boundary
  listByDay(userId: number, startUtc: string, endUtc: string): TimeEntry[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM time_entries
         WHERE user_id = ?
           AND started_at >= ?
           AND started_at < ?
           AND ended_at IS NOT NULL
         ORDER BY started_at ASC`
      )
      .all(userId, startUtc, endUtc) as EntryRow[]
    return rows.map(rowToEntry)
  }
}
