import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '../../db'
import { SqliteOrbitalLevelRepository } from './orbitalLevels'
import type { OrbitalLevelLayout } from '../interfaces'

const layout = (x = 100): OrbitalLevelLayout => ({
  v: 1,
  start: { kind: 'point', x: 200, y: 360 },
  planets: [{ x, y: 200, r: 30, color: 2, ringHeight: 40 }],
  stars: [{ x: 300, y: 500 }],
})

describe('SqliteOrbitalLevelRepository', () => {
  let db: Database.Database
  let repo: SqliteOrbitalLevelRepository

  beforeEach(() => {
    db = new Database(':memory:')
    migrate(db)
    repo = new SqliteOrbitalLevelRepository(db)
  })

  it('a fresh database has the table and no levels', () => {
    const count = db.prepare('SELECT COUNT(*) AS n FROM game_od_levels').get() as { n: number }
    expect(count.n).toBe(0)
    expect(repo.list()).toEqual([])
  })

  it('creates and lists levels by creation order, round-tripping the layout', () => {
    const res = repo.create('Twin Wells', layout(), 1)
    expect(res.ok).toBe(true)
    repo.create('Gate', layout(150), null)
    expect(repo.list().map((l) => l.name)).toEqual(['Twin Wells', 'Gate'])
    if (!res.ok) return
    expect(repo.get(res.level.id)?.layout).toEqual(layout())
  })

  it('refuses a duplicate name regardless of case, on create and rename', () => {
    repo.create('Twin Wells', layout(), null)
    expect(repo.create('twin wells', layout(), null)).toEqual({ ok: false, error: 'name-taken' })
    const other = repo.create('Gate', layout(), null)
    if (!other.ok) throw new Error('create failed')
    expect(repo.update(other.level.id, { name: 'TWIN WELLS' }, null)).toEqual({ ok: false, error: 'name-taken' })
    expect(repo.get(other.level.id)?.name).toBe('Gate')
  })

  it('renames and saves over a level independently', () => {
    const res = repo.create('Twin Wells', layout(), null)
    if (!res.ok) throw new Error('create failed')
    const renamed = repo.update(res.level.id, { name: 'Gate' }, null)
    expect(renamed.ok && renamed.level).toMatchObject({ name: 'Gate', layout: layout() })
    const saved = repo.update(res.level.id, { layout: layout(250) }, 2)
    expect(saved.ok && saved.level).toMatchObject({ name: 'Gate', layout: layout(250) })
  })

  it('deletes a level and reports unknown ids', () => {
    const res = repo.create('Twin Wells', layout(), null)
    if (!res.ok) throw new Error('create failed')
    expect(repo.delete(res.level.id)).toEqual({ ok: true })
    expect(repo.get(res.level.id)).toBeNull()
    expect(repo.delete(res.level.id)).toEqual({ ok: false, error: 'not-found' })
    expect(repo.update(9999, { name: 'X' }, null)).toEqual({ ok: false, error: 'not-found' })
  })
})
