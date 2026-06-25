import type Database from 'better-sqlite3'
import type { IGameScenarioRepository, GameScenario } from '../interfaces'

// NOTE: the DT tables are single-game, so the underlying `game_dt_variants` /
// `game_dt_unit_defs` tables no longer carry a `game_slug` column. The repository
// interface still threads `gameSlug` so the route/API surface is unchanged; it is
// accepted but not used at the SQL layer (every row belongs to dungeon-tactics).

interface VariantRow {
  variant_id: string
  name: string
  is_default: number
}

function rowToScenario(row: VariantRow): GameScenario {
  return { id: row.variant_id, name: row.name, isDefault: row.is_default === 1 }
}

// Derive a stable, url-safe scenario id from a display name, falling back to
// 'scenario' when the name has no usable characters.
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'scenario'
}

export class SqliteGameScenarioRepository implements IGameScenarioRepository {
  constructor(private db: Database.Database) {}

  list(_gameSlug: string): GameScenario[] {
    const rows = this.db
      .prepare(
        `SELECT variant_id, name, is_default
           FROM game_dt_variants
          ORDER BY is_default DESC, created_at ASC, variant_id ASC`
      )
      .all() as VariantRow[]
    return rows.map(rowToScenario)
  }

  getDefault(_gameSlug: string): GameScenario | null {
    const row = this.db
      .prepare(
        `SELECT variant_id, name, is_default
           FROM game_dt_variants
          WHERE is_default = 1
          LIMIT 1`
      )
      .get() as VariantRow | undefined
    return row ? rowToScenario(row) : null
  }

  exists(_gameSlug: string, scenarioId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM game_dt_variants WHERE variant_id = ?')
      .get(scenarioId)
    return !!row
  }

  private uniqueId(gameSlug: string, base: string): string {
    let candidate = base
    let n = 2
    while (this.exists(gameSlug, candidate)) {
      candidate = `${base}-${n}`
      n++
    }
    return candidate
  }

  create(gameSlug: string, name: string, copyFromScenarioId?: string): GameScenario {
    const variantId = this.uniqueId(gameSlug, slugify(name))
    const source = copyFromScenarioId ?? this.getDefault(gameSlug)?.id ?? null

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO game_dt_variants (variant_id, name, is_default, created_at, updated_at)
           VALUES (?, ?, 0, datetime('now'), datetime('now'))`
        )
        .run(variantId, name)

      // Copy the source scenario's defs as the new scenario's starting point.
      if (source) {
        this.db
          .prepare(
            `INSERT INTO game_dt_unit_defs (variant_id, archetype, def_json, updated_at)
             SELECT ?, archetype, def_json, datetime('now')
               FROM game_dt_unit_defs
              WHERE variant_id = ?`
          )
          .run(variantId, source)
      }
    })
    tx()

    return { id: variantId, name, isDefault: false }
  }

  setDefault(_gameSlug: string, scenarioId: string): GameScenario | null {
    if (!this.exists(_gameSlug, scenarioId)) return null
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE game_dt_variants SET is_default = 0, updated_at = datetime('now')
            WHERE is_default = 1`
        )
        .run()
      this.db
        .prepare(
          `UPDATE game_dt_variants SET is_default = 1, updated_at = datetime('now')
            WHERE variant_id = ?`
        )
        .run(scenarioId)
    })
    tx()
    const row = this.db
      .prepare('SELECT variant_id, name, is_default FROM game_dt_variants WHERE variant_id = ?')
      .get(scenarioId) as VariantRow
    return rowToScenario(row)
  }
}
