import type Database from 'better-sqlite3'
import type { IPackingStateRepository, PackingMemberSummary } from '../interfaces'

export class SqlitePackingStateRepository implements IPackingStateRepository {
  constructor(private readonly db: Database.Database) {}

  getState(tripId: number, userId: number): Record<number, boolean> {
    const rows = this.db.prepare<[number, number]>(`
      SELECT ps.packing_item_id
      FROM packing_state ps
      JOIN packing_items pi ON pi.id = ps.packing_item_id
      WHERE pi.trip_id = ? AND ps.user_id = ? AND ps.checked = 1
    `).all(tripId, userId) as { packing_item_id: number }[]

    const state: Record<number, boolean> = {}
    for (const row of rows) {
      state[row.packing_item_id] = true
    }
    return state
  }

  setState(itemId: number, userId: number, checked: boolean): void {
    this.db.prepare<[number, number, number]>(`
      INSERT INTO packing_state (packing_item_id, user_id, checked)
      VALUES (?, ?, ?)
      ON CONFLICT (packing_item_id, user_id) DO UPDATE SET checked = excluded.checked
    `).run(itemId, userId, checked ? 1 : 0)
  }

  getSummary(tripId: number): PackingMemberSummary[] {
    const total = (this.db.prepare<[number]>(
      'SELECT COUNT(*) AS n FROM packing_items WHERE trip_id = ?'
    ).get(tripId) as { n: number }).n

    const rows = this.db.prepare<[number]>(`
      SELECT ps.user_id AS userId,
             SUM(CASE WHEN ps.checked = 1 THEN 1 ELSE 0 END) AS checked
      FROM packing_state ps
      JOIN packing_items pi ON pi.id = ps.packing_item_id
      WHERE pi.trip_id = ?
      GROUP BY ps.user_id
    `).all(tripId) as Array<{ userId: number; checked: number }>

    return rows.map(r => ({ userId: r.userId, checked: r.checked, total }))
  }
}
