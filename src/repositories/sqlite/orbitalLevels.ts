import type Database from 'better-sqlite3'
import type {
  IOrbitalLevelRepository,
  OrbitalLevel,
  OrbitalLevelLayout,
  OrbitalLevelResult,
} from '../interfaces'

interface LevelRow {
  id: number
  name: string
  layout_json: string
  updated_at: string
}

// Rows are only written through the validating route, so the stored JSON is
// trusted to be a v1 layout.
function rowToLevel(row: LevelRow): OrbitalLevel {
  return { id: row.id, name: row.name, layout: JSON.parse(row.layout_json) as OrbitalLevelLayout, updatedAt: row.updated_at }
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
}

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

export class SqliteOrbitalLevelRepository implements IOrbitalLevelRepository {
  constructor(private db: Database.Database) {}

  list(): OrbitalLevel[] {
    const rows = this.db
      .prepare('SELECT id, name, layout_json, updated_at FROM game_od_levels ORDER BY created_at ASC, id ASC')
      .all() as LevelRow[]
    return rows.map(rowToLevel)
  }

  get(id: number): OrbitalLevel | null {
    const row = this.db
      .prepare('SELECT id, name, layout_json, updated_at FROM game_od_levels WHERE id = ?')
      .get(id) as LevelRow | undefined
    return row ? rowToLevel(row) : null
  }

  create(name: string, layout: OrbitalLevelLayout, userId: number | null): OrbitalLevelResult {
    try {
      const info = this.db
        .prepare('INSERT INTO game_od_levels (name, layout_json, updated_by) VALUES (?, ?, ?)')
        .run(name, JSON.stringify(layout), userId)
      return { ok: true, level: this.get(Number(info.lastInsertRowid))! }
    } catch (err) {
      if (isUniqueViolation(err)) return { ok: false, error: 'name-taken' }
      throw err
    }
  }

  update(
    id: number,
    changes: { name?: string; layout?: OrbitalLevelLayout },
    userId: number | null,
  ): OrbitalLevelResult {
    if (!this.get(id)) return { ok: false, error: 'not-found' }
    try {
      this.db
        .prepare(
          `UPDATE game_od_levels
              SET name = COALESCE(?, name),
                  layout_json = COALESCE(?, layout_json),
                  updated_by = ?,
                  updated_at = ${NOW}
            WHERE id = ?`
        )
        .run(
          changes.name ?? null,
          changes.layout !== undefined ? JSON.stringify(changes.layout) : null,
          userId,
          id,
        )
    } catch (err) {
      if (isUniqueViolation(err)) return { ok: false, error: 'name-taken' }
      throw err
    }
    return { ok: true, level: this.get(id)! }
  }

  delete(id: number): { ok: true } | { ok: false; error: 'not-found' } {
    const info = this.db.prepare('DELETE FROM game_od_levels WHERE id = ?').run(id)
    return info.changes > 0 ? { ok: true } : { ok: false, error: 'not-found' }
  }
}
