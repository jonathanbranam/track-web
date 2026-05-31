import type Database from 'better-sqlite3'
import type { ITripRepository, Trip, CreateTripInput, UpdateTripInput } from '../interfaces'

interface TripRow {
  id: number
  user_id: number
  name: string
  destination: string | null
  departure_notes: string | null
  return_notes: string | null
  nights: number | null
  full_days: number | null
  is_current: number
  created_at: string
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
    isCurrent: row.is_current === 1,
    createdAt: row.created_at,
  }
}

export class SqliteTripRepository implements ITripRepository {
  constructor(private db: Database.Database) {}

  create(input: CreateTripInput): Trip {
    const result = this.db
      .prepare(
        `INSERT INTO trips (user_id, name, destination, departure_notes, return_notes, nights, full_days)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.userId,
        input.name,
        input.destination ?? null,
        input.departureNotes ?? null,
        input.returnNotes ?? null,
        input.nights ?? null,
        input.fullDays ?? null,
      )
    return this.findById(Number(result.lastInsertRowid))!
  }

  list(userId: number): Trip[] {
    const rows = this.db
      .prepare('SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as TripRow[]
    return rows.map(rowToTrip)
  }

  findById(id: number): Trip | null {
    const row = this.db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as TripRow | undefined
    return row ? rowToTrip(row) : null
  }

  findCurrent(userId: number): Trip | null {
    const row = this.db
      .prepare('SELECT * FROM trips WHERE user_id = ? AND is_current = 1 LIMIT 1')
      .get(userId) as TripRow | undefined
    return row ? rowToTrip(row) : null
  }

  setCurrent(userId: number, tripId: number): Trip | null {
    const trip = this.findById(tripId)
    if (!trip || trip.userId !== userId) return null

    this.db.transaction(() => {
      this.db.prepare('UPDATE trips SET is_current = 0 WHERE user_id = ?').run(userId)
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

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    this.db.prepare(`UPDATE trips SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id)
  }

  delete(id: number): boolean {
    const result = this.db.prepare('DELETE FROM trips WHERE id = ?').run(id)
    return result.changes > 0
  }
}
