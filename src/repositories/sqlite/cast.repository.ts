import type Database from 'better-sqlite3'
import type { ICastRepository, Person, TitleCastEntry, CastMember } from '../interfaces'

export class CastSqliteRepository implements ICastRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  upsertPerson(name: string, tmdbPersonId: number): Person {
    this.db
      .prepare('INSERT OR IGNORE INTO people (name, tmdb_person_id) VALUES (?, ?)')
      .run(name, tmdbPersonId)
    const row = this.db
      .prepare('SELECT id, name, tmdb_person_id FROM people WHERE tmdb_person_id = ?')
      .get(tmdbPersonId) as { id: number; name: string; tmdb_person_id: number }
    return { id: row.id, name: row.name, tmdbPersonId: row.tmdb_person_id }
  }

  upsertTitleCast(titleType: 'movie' | 'tv', titleId: number, entries: TitleCastEntry[]): void {
    const table = titleType === 'movie' ? 'movie_cast' : 'tv_cast'
    const del = this.db.prepare(`DELETE FROM ${table} WHERE title_id = ?`)
    const ins = this.db.prepare(
      `INSERT INTO ${table} (person_id, title_id, role, billing_order) VALUES (?, ?, ?, ?)`
    )
    this.db.transaction(() => {
      del.run(titleId)
      for (const e of entries) {
        ins.run(e.personId, titleId, e.role, e.billingOrder)
      }
    })()
  }

  listCast(titleType: 'movie' | 'tv', titleId: number): CastMember[] {
    const table = titleType === 'movie' ? 'movie_cast' : 'tv_cast'
    const rows = this.db
      .prepare(
        `SELECT p.name, p.tmdb_person_id, c.role, c.billing_order
         FROM ${table} c
         JOIN people p ON p.id = c.person_id
         WHERE c.title_id = ?
         ORDER BY c.billing_order`
      )
      .all(titleId) as { name: string; tmdb_person_id: number; role: 'cast' | 'director'; billing_order: number }[]
    return rows.map(r => ({
      name: r.name,
      tmdbPersonId: r.tmdb_person_id,
      role: r.role,
      billingOrder: r.billing_order,
    }))
  }
}
