import type Database from 'better-sqlite3'
import type { IGameUnitDefRepository } from '../interfaces'

// The DT tables are single-game: `game_dt_unit_defs` is keyed by
// (variant_id, archetype) with no `game_slug` column. The interface keeps the
// `gameSlug` param so the API surface is unchanged; it is accepted but not used
// at the SQL layer.

interface UnitDefRow {
  archetype: string
  def_json: string
}

export class SqliteGameUnitDefRepository implements IGameUnitDefRepository {
  constructor(private db: Database.Database) {}

  getAll(_gameSlug: string, scenarioId: string): Record<string, unknown> {
    const rows = this.db
      .prepare('SELECT archetype, def_json FROM game_dt_unit_defs WHERE variant_id = ?')
      .all(scenarioId) as UnitDefRow[]
    const out: Record<string, unknown> = {}
    for (const row of rows) out[row.archetype] = JSON.parse(row.def_json)
    return out
  }

  get(_gameSlug: string, scenarioId: string, archetype: string): unknown | null {
    const row = this.db
      .prepare('SELECT def_json FROM game_dt_unit_defs WHERE variant_id = ? AND archetype = ?')
      .get(scenarioId, archetype) as { def_json: string } | undefined
    return row ? JSON.parse(row.def_json) : null
  }

  upsert(_gameSlug: string, scenarioId: string, archetype: string, def: unknown): void {
    this.db
      .prepare(
        `INSERT INTO game_dt_unit_defs (variant_id, archetype, def_json, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(variant_id, archetype)
         DO UPDATE SET def_json = excluded.def_json, updated_at = datetime('now')`
      )
      .run(scenarioId, archetype, JSON.stringify(def))
  }

  seedDefaultIfEmpty(_gameSlug: string, defaults: Record<string, unknown>): void {
    const existing = this.db
      .prepare('SELECT 1 FROM game_dt_variants LIMIT 1')
      .get()
    if (existing) return // never overwrite an existing scenario

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO game_dt_variants (variant_id, name, is_default, created_at, updated_at)
           VALUES ('default', 'Default', 1, datetime('now'), datetime('now'))`
        )
        .run()
      const insertDef = this.db.prepare(
        `INSERT INTO game_dt_unit_defs (variant_id, archetype, def_json, updated_at)
         VALUES ('default', ?, ?, datetime('now'))`
      )
      for (const [archetype, def] of Object.entries(defaults)) {
        insertDef.run(archetype, JSON.stringify(def))
      }
    })
    tx()
  }
}
