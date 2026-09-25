import type Database from 'better-sqlite3'
import type {
  IOrbitalConfigRepository,
  OrbitalConfig,
  OrbitalConfigError,
  OrbitalConfigResult,
  OrbitalTuningValues,
} from '../interfaces'

interface ConfigRow {
  id: number
  name: string
  tuning_json: string
  is_default: number
  updated_at: string
}

function rowToConfig(row: ConfigRow): OrbitalConfig {
  let tuning: OrbitalTuningValues = {}
  try {
    const parsed = JSON.parse(row.tuning_json)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) tuning = parsed
  } catch {
    // A corrupt blob resolves to the shipped defaults client-side.
  }
  return { id: row.id, name: row.name, isDefault: row.is_default === 1, tuning, updatedAt: row.updated_at }
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
}

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

export class SqliteOrbitalConfigRepository implements IOrbitalConfigRepository {
  constructor(private db: Database.Database) {}

  list(): OrbitalConfig[] {
    const rows = this.db
      .prepare(
        `SELECT id, name, tuning_json, is_default, updated_at
           FROM game_od_configs
          ORDER BY is_default DESC, created_at ASC, id ASC`
      )
      .all() as ConfigRow[]
    return rows.map(rowToConfig)
  }

  get(id: number): OrbitalConfig | null {
    const row = this.db
      .prepare('SELECT id, name, tuning_json, is_default, updated_at FROM game_od_configs WHERE id = ?')
      .get(id) as ConfigRow | undefined
    return row ? rowToConfig(row) : null
  }

  create(name: string, tuning: OrbitalTuningValues, userId: number | null): OrbitalConfigResult {
    try {
      const info = this.db
        .prepare(
          `INSERT INTO game_od_configs (name, tuning_json, is_default, updated_by)
           VALUES (?, ?, 0, ?)`
        )
        .run(name, JSON.stringify(tuning), userId)
      return { ok: true, config: this.get(Number(info.lastInsertRowid))! }
    } catch (err) {
      if (isUniqueViolation(err)) return { ok: false, error: 'name-taken' }
      throw err
    }
  }

  update(
    id: number,
    changes: { name?: string; tuning?: OrbitalTuningValues },
    userId: number | null,
  ): OrbitalConfigResult {
    const existing = this.get(id)
    if (!existing) return { ok: false, error: 'not-found' }
    if (changes.name !== undefined && existing.isDefault && changes.name !== existing.name) {
      return { ok: false, error: 'is-default' }
    }
    try {
      this.db
        .prepare(
          `UPDATE game_od_configs
              SET name = COALESCE(?, name),
                  tuning_json = COALESCE(?, tuning_json),
                  updated_by = ?,
                  updated_at = ${NOW}
            WHERE id = ?`
        )
        .run(
          changes.name ?? null,
          changes.tuning !== undefined ? JSON.stringify(changes.tuning) : null,
          userId,
          id,
        )
    } catch (err) {
      if (isUniqueViolation(err)) return { ok: false, error: 'name-taken' }
      throw err
    }
    return { ok: true, config: this.get(id)! }
  }

  delete(id: number): { ok: true } | { ok: false; error: Exclude<OrbitalConfigError, 'name-taken'> } {
    const existing = this.get(id)
    if (!existing) return { ok: false, error: 'not-found' }
    if (existing.isDefault) return { ok: false, error: 'is-default' }
    this.db.prepare('DELETE FROM game_od_configs WHERE id = ?').run(id)
    return { ok: true }
  }
}
