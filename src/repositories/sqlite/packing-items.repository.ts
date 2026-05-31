import type Database from 'better-sqlite3'
import type { IPackingItemRepository, PackingItem } from '../interfaces'

interface PackingItemRow {
  id: number
  trip_id: number
  section: string
  text: string
  position: number
}

function rowToPackingItem(row: PackingItemRow): PackingItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    section: row.section,
    text: row.text,
    position: row.position,
  }
}

export class SqlitePackingItemRepository implements IPackingItemRepository {
  constructor(private db: Database.Database) {}

  listByTrip(tripId: number): PackingItem[] {
    const rows = this.db
      .prepare('SELECT * FROM packing_items WHERE trip_id = ? ORDER BY section ASC, position ASC')
      .all(tripId) as PackingItemRow[]
    return rows.map(rowToPackingItem)
  }

  create(tripId: number, data: { section: string; text: string; position: number }): PackingItem {
    const result = this.db
      .prepare('INSERT INTO packing_items (trip_id, section, text, position) VALUES (?, ?, ?, ?)')
      .run(tripId, data.section, data.text, data.position)
    const row = this.db
      .prepare('SELECT * FROM packing_items WHERE id = ?')
      .get(result.lastInsertRowid) as PackingItemRow
    return rowToPackingItem(row)
  }

  update(id: number, data: { section?: string; text?: string; position?: number }): PackingItem | null {
    const fields: string[] = []
    const values: unknown[] = []
    if (data.section !== undefined) { fields.push('section = ?'); values.push(data.section) }
    if (data.text !== undefined) { fields.push('text = ?'); values.push(data.text) }
    if (data.position !== undefined) { fields.push('position = ?'); values.push(data.position) }
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

  bulkReplace(tripId: number, items: Array<{ section: string; text: string; position: number }>): PackingItem[] {
    const inserted: PackingItem[] = []
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM packing_items WHERE trip_id = ?').run(tripId)
      const insert = this.db.prepare(
        'INSERT INTO packing_items (trip_id, section, text, position) VALUES (?, ?, ?, ?)'
      )
      for (const item of items) {
        const result = insert.run(tripId, item.section, item.text, item.position)
        const row = this.db
          .prepare('SELECT * FROM packing_items WHERE id = ?')
          .get(result.lastInsertRowid) as PackingItemRow
        inserted.push(rowToPackingItem(row))
      }
    })()
    return inserted
  }
}
