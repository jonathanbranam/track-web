import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { MIGRATIONS, migrate } from './db'
import { SqliteSessionRepository } from './repositories/sqlite/session.repository'

// Drives the migration list by hand so we can seed legacy `game_scenarios` /
// `game_unit_defs` rows *before* the 0034 rename runs, then assert the rebuild
// preserved them in `game_dt_variants` / `game_dt_unit_defs` keyed by variant_id.
function runThrough(db: Database.Database, lastId: string): void {
  for (const m of MIGRATIONS) {
    m.up(db)
    if (m.id === lastId) return
  }
}

function runOnly(db: Database.Database, id: string): void {
  const m = MIGRATIONS.find(x => x.id === id)
  if (!m) throw new Error(`migration ${id} not found`)
  m.up(db)
}

describe('0034 DT variant-table rename migration', () => {
  it('preserves prior scenario + unit-def rows keyed by variant_id', () => {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    // Apply every migration up to and including the legacy unit-def table.
    runThrough(db, '0033_game_unit_defs')

    // Seed legacy rows as the old schema stored them.
    db.prepare(
      `INSERT INTO game_scenarios (game_slug, scenario_id, name, is_default, created_at, updated_at)
       VALUES ('dungeon-tactics-solo', 'default', 'Default', 1, '2026-01-01', '2026-01-01'),
              ('dungeon-tactics-solo', 'slow', 'Slow Enemies', 0, '2026-01-02', '2026-01-02')`
    ).run()
    db.prepare(
      `INSERT INTO game_unit_defs (game_slug, scenario_id, archetype, def_json, updated_at)
       VALUES ('dungeon-tactics-solo', 'default', 'melee', '{"maxHp":3}', '2026-01-01'),
              ('dungeon-tactics-solo', 'slow', 'melee', '{"maxHp":9}', '2026-01-02')`
    ).run()

    // Run the rename rebuild.
    runOnly(db, '0034_dt_variant_tables_rename')

    // Old tables are gone.
    const oldTables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table'
           AND name IN ('game_scenarios', 'game_unit_defs')`
      )
      .all()
    expect(oldTables).toHaveLength(0)

    // Variants preserved, keyed by variant_id, with the single default intact.
    const variants = db
      .prepare('SELECT variant_id, name, is_default FROM game_dt_variants ORDER BY variant_id')
      .all() as { variant_id: string; name: string; is_default: number }[]
    expect(variants).toEqual([
      { variant_id: 'default', name: 'Default', is_default: 1 },
      { variant_id: 'slow', name: 'Slow Enemies', is_default: 0 },
    ])

    // Unit defs preserved with def_json intact, keyed by (variant_id, archetype).
    const slowMelee = db
      .prepare('SELECT def_json FROM game_dt_unit_defs WHERE variant_id = ? AND archetype = ?')
      .get('slow', 'melee') as { def_json: string }
    expect(JSON.parse(slowMelee.def_json)).toEqual({ maxHp: 9 })

    db.close()
  })
})

describe('0037 sessions migration + SqliteSessionRepository', () => {
  it('creates the sessions table and token_hash index', () => {
    const db = new Database(':memory:')
    migrate(db)

    const table = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'`)
      .get()
    expect(table).toBeTruthy()

    const index = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name='idx_sessions_hash'`)
      .get()
    expect(index).toBeTruthy()

    db.close()
  })

  it('pruneExpired deletes only past-expiry rows', () => {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    migrate(db)
    db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run('u@example.com', 'h')
    const userId = 1
    const repo = new SqliteSessionRepository(db)

    const past = '2000-01-01T00:00:00.000Z'
    const future = new Date(Date.now() + 86_400_000).toISOString()
    repo.create(userId, 'hash-expired-1', past, 'agent')
    repo.create(userId, 'hash-expired-2', past, null)
    repo.create(userId, 'hash-live', future, 'agent')

    const deleted = repo.pruneExpired()
    expect(deleted).toBe(2)

    // The live row survives; the expired rows are gone.
    expect(repo.findByHash('hash-live')).not.toBeNull()
    expect(repo.findByHash('hash-expired-1')).toBeNull()

    // No-op on a second run.
    expect(repo.pruneExpired()).toBe(0)

    db.close()
  })
})
