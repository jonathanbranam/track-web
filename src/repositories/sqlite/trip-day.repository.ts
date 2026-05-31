import type Database from 'better-sqlite3'
import type { ITripDayRepository, TripDay } from '../interfaces'

interface TripDayRow {
  id: number
  trip_id: number
  date: string
  title: string
  body: string
  weather: string | null
}

function rowToTripDay(row: TripDayRow): TripDay {
  return {
    id: row.id,
    tripId: row.trip_id,
    date: row.date,
    title: row.title,
    body: row.body,
    weather: row.weather,
  }
}

export class SqliteTripDayRepository implements ITripDayRepository {
  constructor(private db: Database.Database) {}

  listByTrip(tripId: number): TripDay[] {
    const rows = this.db
      .prepare('SELECT * FROM trip_days WHERE trip_id = ? ORDER BY date ASC')
      .all(tripId) as TripDayRow[]
    return rows.map(rowToTripDay)
  }

  upsertDay(tripId: number, date: string, data: { title?: string; body?: string; weather?: string | null }): TripDay {
    const fields: string[] = []
    const values: unknown[] = []

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.body !== undefined) { fields.push('body = ?'); values.push(data.body) }
    if (data.weather !== undefined) { fields.push('weather = ?'); values.push(data.weather) }

    if (fields.length > 0) {
      values.push(tripId, date)
      this.db
        .prepare(`UPDATE trip_days SET ${fields.join(', ')} WHERE trip_id = ? AND date = ?`)
        .run(...values)
    }

    const row = this.db
      .prepare('SELECT * FROM trip_days WHERE trip_id = ? AND date = ?')
      .get(tripId, date) as TripDayRow | undefined

    if (!row) throw Object.assign(new Error('Day not found'), { status: 404 })
    return rowToTripDay(row)
  }

  generateDays(tripId: number, startDate: string, endDate: string): void {
    if (!startDate || !endDate) return

    const insert = this.db.prepare(
      `INSERT OR IGNORE INTO trip_days (trip_id, date) VALUES (?, ?)`
    )

    const start = new Date(startDate + 'T00:00:00Z')
    const end = new Date(endDate + 'T00:00:00Z')

    this.db.transaction(() => {
      const current = new Date(start)
      while (current <= end) {
        const dateStr = current.toISOString().slice(0, 10)
        insert.run(tripId, dateStr)
        current.setUTCDate(current.getUTCDate() + 1)
      }
    })()
  }
}
