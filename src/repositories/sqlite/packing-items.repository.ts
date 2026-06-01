import type Database from 'better-sqlite3'
import type { IPackingItemRepository, PackingItem } from '../interfaces'

const OWNER_USER_ID = 1

interface PackingItemRow {
  id: number
  trip_id: number
  section: string
  text: string
  position: number
  user_id: number | null
}

function rowToPackingItem(row: PackingItemRow): PackingItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    section: row.section,
    text: row.text,
    position: row.position,
    userId: row.user_id,
  }
}

export class SqlitePackingItemRepository implements IPackingItemRepository {
  constructor(private db: Database.Database) {}

  listByTrip(tripId: number, requestingUserId: number): PackingItem[] {
    let rows: PackingItemRow[]
    if (requestingUserId === OWNER_USER_ID) {
      rows = this.db
        .prepare('SELECT * FROM packing_items WHERE trip_id = ? ORDER BY section ASC, position ASC')
        .all(tripId) as PackingItemRow[]
    } else {
      rows = this.db
        .prepare('SELECT * FROM packing_items WHERE trip_id = ? AND (user_id IS NULL OR user_id = ?) ORDER BY section ASC, position ASC')
        .all(tripId, requestingUserId) as PackingItemRow[]
    }
    return rows.map(rowToPackingItem)
  }

  create(tripId: number, data: { section: string; text: string; position: number; userId?: number | null }): PackingItem {
    const result = this.db
      .prepare('INSERT INTO packing_items (trip_id, section, text, position, user_id) VALUES (?, ?, ?, ?, ?)')
      .run(tripId, data.section, data.text, data.position, data.userId ?? null)
    const row = this.db
      .prepare('SELECT * FROM packing_items WHERE id = ?')
      .get(result.lastInsertRowid) as PackingItemRow
    return rowToPackingItem(row)
  }

  update(id: number, data: { section?: string; text?: string; position?: number; userId?: number | null }): PackingItem | null {
    const fields: string[] = []
    const values: unknown[] = []
    if (data.section !== undefined) { fields.push('section = ?'); values.push(data.section) }
    if (data.text !== undefined) { fields.push('text = ?'); values.push(data.text) }
    if (data.position !== undefined) { fields.push('position = ?'); values.push(data.position) }
    if ('userId' in data) { fields.push('user_id = ?'); values.push(data.userId ?? null) }
    if (fields.length === 0) {
      const row = this.db.prepare('SELECT * FROM packing_items WHERE id = ?').get(id) as PackingItemRow | undefined
      return row ? rowToPackingItem(row) : null
    }
    values.push(id)
    this.db.prepare(`UPDATE packing_items SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    const row = this.db.prepare('SELECT * FROM packing_items WHERE id = ?').get(id) as PackingItemRow | undefined
    return row ? rowToPackingItem(row) : null
  }

  delete(id: number): boolean {
    const result = this.db.prepare('DELETE FROM packing_items WHERE id = ?').run(id)
    return result.changes > 0
  }

  bulkReplace(tripId: number, items: Array<{ section: string; text: string; position: number; userId?: number | null }>): PackingItem[] {
    const inserted: PackingItem[] = []
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM packing_items WHERE trip_id = ?').run(tripId)
      const insert = this.db.prepare(
        'INSERT INTO packing_items (trip_id, section, text, position, user_id) VALUES (?, ?, ?, ?, ?)'
      )
      for (const item of items) {
        const result = insert.run(tripId, item.section, item.text, item.position, item.userId ?? null)
        const row = this.db
          .prepare('SELECT * FROM packing_items WHERE id = ?')
          .get(result.lastInsertRowid) as PackingItemRow
        inserted.push(rowToPackingItem(row))
      }
    })()
    return inserted
  }
}
