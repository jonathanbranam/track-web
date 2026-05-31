import type Database from 'better-sqlite3'
import type { ITripRepository, Trip, TripMember, CreateTripInput, UpdateTripInput } from '../interfaces'

interface TripRow {
  id: number
  user_id: number
  name: string
  destination: string | null
  departure_notes: string | null
  return_notes: string | null
  nights: number | null
  full_days: number | null
  start_date: string | null
  end_date: string | null
  info_markdown: string | null
  is_current: number
  created_at: string
}

interface TripMemberRow {
  user_id: number
  role: string
  joined_at: string
}

function rowToTrip(row: TripRow): Trip {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    destination: row.destination,
    departureNotes: row.departure_notes,
    returnNotes: row.return_notes,
    nights: row.nights,
    fullDays: row.full_days,
    startDate: row.start_date,
    endDate: row.end_date,
    infoMarkdown: row.info_markdown,
    isCurrent: row.is_current === 1,
    createdAt: row.created_at,
  }
}

function rowToMember(row: TripMemberRow): TripMember {
  return {
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
  }
}

export class SqliteTripRepository implements ITripRepository {
  constructor(private db: Database.Database) {}

  create(input: CreateTripInput): Trip {
    return this.db.transaction(() => {
      const result = this.db
        .prepare(
          `INSERT INTO trips (user_id, name, destination, departure_notes, return_notes, nights, full_days, start_date, end_date, info_markdown)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.userId,
          input.name,
          input.destination ?? null,
          input.departureNotes ?? null,
          input.returnNotes ?? null,
          input.nights ?? null,
          input.fullDays ?? null,
          input.startDate ?? null,
          input.endDate ?? null,
          input.infoMarkdown ?? null,
        )
      const tripId = Number(result.lastInsertRowid)
      this.db
        .prepare(`INSERT INTO trip_members (trip_id, user_id, role, joined_at) VALUES (?, ?, 'owner', datetime('now'))`)
        .run(tripId, input.userId)
      return this.findById(tripId)!
    })()
  }

  list(userId: number): Trip[] {
    const rows = this.db
      .prepare(
        `SELECT t.* FROM trips t
         JOIN trip_members tm ON tm.trip_id = t.id
         WHERE tm.user_id = ?
         ORDER BY t.created_at DESC`
      )
      .all(userId) as TripRow[]
    return rows.map(rowToTrip)
  }

  findById(id: number): Trip | null {
    const row = this.db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as TripRow | undefined
    return row ? rowToTrip(row) : null
  }

  findCurrent(userId: number): Trip | null {
    const row = this.db
      .prepare(
        `SELECT t.* FROM trips t
         JOIN trip_members tm ON tm.trip_id = t.id
         WHERE tm.user_id = ? AND t.is_current = 1
         LIMIT 1`
      )
      .get(userId) as TripRow | undefined
    return row ? rowToTrip(row) : null
  }

  setCurrent(userId: number, tripId: number): Trip | null {
    const trip = this.findById(tripId)
    if (!trip) return null

    this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE trips SET is_current = 0
           WHERE id IN (SELECT trip_id FROM trip_members WHERE user_id = ?)`
        )
        .run(userId)
      this.db.prepare('UPDATE trips SET is_current = 1 WHERE id = ?').run(tripId)
    })()

    return this.findById(tripId)
  }

  update(id: number, data: UpdateTripInput): Trip | null {
    const fields: string[] = []
    const values: unknown[] = []

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.destination !== undefined) { fields.push('destination = ?'); values.push(data.destination) }
    if (data.departureNotes !== undefined) { fields.push('departure_notes = ?'); values.push(data.departureNotes) }
    if (data.returnNotes !== undefined) { fields.push('return_notes = ?'); values.push(data.returnNotes) }
    if (data.nights !== undefined) { fields.push('nights = ?'); values.push(data.nights) }
    if (data.fullDays !== undefined) { fields.push('full_days = ?'); values.push(data.fullDays) }
    if (data.startDate !== undefined) { fields.push('start_date = ?'); values.push(data.startDate) }
    if (data.endDate !== undefined) { fields.push('end_date = ?'); values.push(data.endDate) }
    if (data.infoMarkdown !== undefined) { fields.push('info_markdown = ?'); values.push(data.infoMarkdown) }

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    this.db.prepare(`UPDATE trips SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id)
  }

  delete(id: number): boolean {
    const result = this.db.prepare('DELETE FROM trips WHERE id = ?').run(id)
    return result.changes > 0
  }

  // Membership

  isMember(tripId: number, userId: number): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?')
      .get(tripId, userId)
    return !!row
  }

  getMemberRole(tripId: number, userId: number): string | null {
    const row = this.db
      .prepare('SELECT role FROM trip_members WHERE trip_id = ? AND user_id = ?')
      .get(tripId, userId) as { role: string } | undefined
    return row?.role ?? null
  }

  listMembers(tripId: number): TripMember[] {
    const rows = this.db
      .prepare('SELECT user_id, role, joined_at FROM trip_members WHERE trip_id = ? ORDER BY joined_at ASC')
      .all(tripId) as TripMemberRow[]
    return rows.map(rowToMember)
  }

  addMember(tripId: number, userId: number, role = 'member'): TripMember {
    this.db
      .prepare(`INSERT INTO trip_members (trip_id, user_id, role, joined_at) VALUES (?, ?, ?, datetime('now'))`)
      .run(tripId, userId, role)
    const row = this.db
      .prepare('SELECT user_id, role, joined_at FROM trip_members WHERE trip_id = ? AND user_id = ?')
      .get(tripId, userId) as TripMemberRow
    return rowToMember(row)
  }

  removeMember(tripId: number, userId: number): boolean {
    const result = this.db
      .prepare('DELETE FROM trip_members WHERE trip_id = ? AND user_id = ?')
      .run(tripId, userId)
    return result.changes > 0
  }
}
