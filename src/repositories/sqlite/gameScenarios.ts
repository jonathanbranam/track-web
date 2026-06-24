import type Database from 'better-sqlite3'
import type { IGameScenarioRepository, GameScenario } from '../interfaces'

interface ScenarioRow {
  scenario_id: string
  name: string
  is_default: number
}

function rowToScenario(row: ScenarioRow): GameScenario {
  return { id: row.scenario_id, name: row.name, isDefault: row.is_default === 1 }
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

  list(gameSlug: string): GameScenario[] {
    const rows = this.db
      .prepare(
        `SELECT scenario_id, name, is_default
           FROM game_scenarios
          WHERE game_slug = ?
          ORDER BY is_default DESC, created_at ASC, scenario_id ASC`
      )
      .all(gameSlug) as ScenarioRow[]
    return rows.map(rowToScenario)
  }

  getDefault(gameSlug: string): GameScenario | null {
    const row = this.db
      .prepare(
        `SELECT scenario_id, name, is_default
           FROM game_scenarios
          WHERE game_slug = ? AND is_default = 1
          LIMIT 1`
      )
      .get(gameSlug) as ScenarioRow | undefined
    return row ? rowToScenario(row) : null
  }

  exists(gameSlug: string, scenarioId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM game_scenarios WHERE game_slug = ? AND scenario_id = ?')
      .get(gameSlug, scenarioId)
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
    const scenarioId = this.uniqueId(gameSlug, slugify(name))
    const source = copyFromScenarioId ?? this.getDefault(gameSlug)?.id ?? null

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO game_scenarios (game_slug, scenario_id, name, is_default, created_at, updated_at)
           VALUES (?, ?, ?, 0, datetime('now'), datetime('now'))`
        )
        .run(gameSlug, scenarioId, name)

      // Copy the source scenario's defs as the new scenario's starting point.
      if (source) {
        this.db
          .prepare(
            `INSERT INTO game_unit_defs (game_slug, scenario_id, archetype, def_json, updated_at)
             SELECT game_slug, ?, archetype, def_json, datetime('now')
               FROM game_unit_defs
              WHERE game_slug = ? AND scenario_id = ?`
          )
          .run(scenarioId, gameSlug, source)
      }
    })
    tx()

    return { id: scenarioId, name, isDefault: false }
  }

  setDefault(gameSlug: string, scenarioId: string): GameScenario | null {
    if (!this.exists(gameSlug, scenarioId)) return null
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE game_scenarios SET is_default = 0, updated_at = datetime('now')
            WHERE game_slug = ? AND is_default = 1`
        )
        .run(gameSlug)
      this.db
        .prepare(
          `UPDATE game_scenarios SET is_default = 1, updated_at = datetime('now')
            WHERE game_slug = ? AND scenario_id = ?`
        )
        .run(gameSlug, scenarioId)
    })
    tx()
    const row = this.db
      .prepare('SELECT scenario_id, name, is_default FROM game_scenarios WHERE game_slug = ? AND scenario_id = ?')
      .get(gameSlug, scenarioId) as ScenarioRow
    return rowToScenario(row)
  }
}
