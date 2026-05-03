import type Database from 'better-sqlite3'
import type { IEntryRepository, TimeEntry, CreateEntryInput } from '../interfaces'

interface EntryRow {
  id: number
  user_id: number
  app_id: string
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
    appId: row.app_id,
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
        `INSERT INTO time_entries (user_id, app_id, description, tags, started_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(input.userId, input.appId, input.description, input.tags, input.startedAt)

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
        `SELECT * FROM time_entries
         WHERE user_id = ? AND app_id = 'time' AND ended_at IS NULL LIMIT 1`
      )
      .get(userId) as EntryRow | undefined
    return row ? rowToEntry(row) : null
  }

  getLatestEnded(userId: number): TimeEntry | null {
    const row = this.db
      .prepare(
        `SELECT * FROM time_entries
         WHERE user_id = ? AND app_id = 'time' AND ended_at IS NOT NULL
         ORDER BY ended_at DESC LIMIT 1`
      )
      .get(userId) as EntryRow | undefined
    return row ? rowToEntry(row) : null
  }

  update(id: number, data: { startedAt?: string; endedAt?: string; description?: string; tags?: string }): TimeEntry | null {
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
    if (data.description !== undefined && data.tags !== undefined) {
      this.db
        .prepare('UPDATE time_entries SET description = ?, tags = ? WHERE id = ?')
        .run(data.description, data.tags, id)
    }
    return this.findById(id)
  }

  getPreviousEntry(userId: number, entryId: number): TimeEntry | null {
    const subject = this.findById(entryId)
    if (!subject) return null
    const row = this.db
      .prepare(
        `SELECT * FROM time_entries
         WHERE user_id = ? AND app_id = 'time' AND started_at < ? AND id != ? AND ended_at IS NOT NULL
         ORDER BY started_at DESC LIMIT 1`
      )
      .get(userId, subject.startedAt, entryId) as EntryRow | undefined
    return row ? rowToEntry(row) : null
  }

  getNextEntry(userId: number, entryId: number): TimeEntry | null {
    const subject = this.findById(entryId)
    if (!subject) return null
    const row = this.db
      .prepare(
        `SELECT * FROM time_entries
         WHERE user_id = ? AND app_id = 'time' AND started_at > ? AND id != ?
         ORDER BY started_at ASC LIMIT 1`
      )
      .get(userId, subject.startedAt, entryId) as EntryRow | undefined
    return row ? rowToEntry(row) : null
  }

  delete(id: number): boolean {
    const result = this.db.prepare('DELETE FROM time_entries WHERE id = ?').run(id)
    return result.changes > 0
  }

  listByDay(userId: number, startUtc: string, endUtc: string): TimeEntry[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM time_entries
         WHERE user_id = ?
           AND app_id = 'time'
           AND started_at >= ?
           AND started_at < ?
           AND ended_at IS NOT NULL
         ORDER BY started_at ASC`
      )
      .all(userId, startUtc, endUtc) as EntryRow[]
    return rows.map(rowToEntry)
  }
}
