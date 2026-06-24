import type Database from 'better-sqlite3'
import type { IGameUnitDefRepository } from '../interfaces'

interface UnitDefRow {
  archetype: string
  def_json: string
}

export class SqliteGameUnitDefRepository implements IGameUnitDefRepository {
  constructor(private db: Database.Database) {}

  getAll(gameSlug: string, scenarioId: string): Record<string, unknown> {
    const rows = this.db
      .prepare('SELECT archetype, def_json FROM game_unit_defs WHERE game_slug = ? AND scenario_id = ?')
      .all(gameSlug, scenarioId) as UnitDefRow[]
    const out: Record<string, unknown> = {}
    for (const row of rows) out[row.archetype] = JSON.parse(row.def_json)
    return out
  }

  get(gameSlug: string, scenarioId: string, archetype: string): unknown | null {
    const row = this.db
      .prepare('SELECT def_json FROM game_unit_defs WHERE game_slug = ? AND scenario_id = ? AND archetype = ?')
      .get(gameSlug, scenarioId, archetype) as { def_json: string } | undefined
    return row ? JSON.parse(row.def_json) : null
  }

  upsert(gameSlug: string, scenarioId: string, archetype: string, def: unknown): void {
    this.db
      .prepare(
        `INSERT INTO game_unit_defs (game_slug, scenario_id, archetype, def_json, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(game_slug, scenario_id, archetype)
         DO UPDATE SET def_json = excluded.def_json, updated_at = datetime('now')`
      )
      .run(gameSlug, scenarioId, archetype, JSON.stringify(def))
  }

  seedDefaultIfEmpty(gameSlug: string, defaults: Record<string, unknown>): void {
    const existing = this.db
      .prepare('SELECT 1 FROM game_scenarios WHERE game_slug = ? LIMIT 1')
      .get(gameSlug)
    if (existing) return // never overwrite an existing scenario

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO game_scenarios (game_slug, scenario_id, name, is_default, created_at, updated_at)
           VALUES (?, 'default', 'Default', 1, datetime('now'), datetime('now'))`
        )
        .run(gameSlug)
      const insertDef = this.db.prepare(
        `INSERT INTO game_unit_defs (game_slug, scenario_id, archetype, def_json, updated_at)
         VALUES (?, 'default', ?, ?, datetime('now'))`
      )
      for (const [archetype, def] of Object.entries(defaults)) {
        insertDef.run(gameSlug, archetype, JSON.stringify(def))
      }
    })
    tx()
  }
}
