import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '../../db'
import { SqliteOrbitalConfigRepository } from './orbitalConfigs'

describe('SqliteOrbitalConfigRepository', () => {
  let db: Database.Database
  let repo: SqliteOrbitalConfigRepository

  beforeEach(() => {
    db = new Database(':memory:')
    migrate(db)
    repo = new SqliteOrbitalConfigRepository(db)
  })

  it('a fresh database has exactly one Default config with empty tuning', () => {
    const configs = repo.list()
    expect(configs).toHaveLength(1)
    expect(configs[0]).toMatchObject({ name: 'Default', isDefault: true, tuning: {} })
  })

  it('lists the Default first, then by creation order', () => {
    repo.create('Floaty', { G: 300 }, null)
    repo.create('Heavy', { G: 2000 }, null)
    expect(repo.list().map((c) => c.name)).toEqual(['Default', 'Floaty', 'Heavy'])
  })

  it('round-trips tuning values of every type', () => {
    const tuning = { G: 700.5, influenceZones: false, edgeMode: 'wrap' }
    const res = repo.create('Mixed', tuning, 1)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(repo.get(res.config.id)?.tuning).toEqual(tuning)
  })

  it('refuses a duplicate name regardless of case, on create and rename', () => {
    repo.create('Floaty', {}, null)
    expect(repo.create('floaty', {}, null)).toEqual({ ok: false, error: 'name-taken' })
    const other = repo.create('Other', {}, null)
    if (!other.ok) throw new Error('create failed')
    expect(repo.update(other.config.id, { name: 'FLOATY' }, null)).toEqual({ ok: false, error: 'name-taken' })
    expect(repo.get(other.config.id)?.name).toBe('Other')
  })

  it('renames and saves over a config', () => {
    const res = repo.create('Floaty', { G: 300 }, null)
    if (!res.ok) throw new Error('create failed')
    const renamed = repo.update(res.config.id, { name: 'Low Gravity' }, null)
    expect(renamed.ok && renamed.config).toMatchObject({ name: 'Low Gravity', tuning: { G: 300 } })
    const saved = repo.update(res.config.id, { tuning: { G: 400 } }, null)
    expect(saved.ok && saved.config).toMatchObject({ name: 'Low Gravity', tuning: { G: 400 } })
  })

  it('allows saving over the Default but refuses renaming or deleting it', () => {
    const def = repo.list()[0]
    expect(repo.update(def.id, { tuning: { G: 900 } }, null).ok).toBe(true)
    expect(repo.get(def.id)?.tuning).toEqual({ G: 900 })
    expect(repo.update(def.id, { name: 'Mine' }, null)).toEqual({ ok: false, error: 'is-default' })
    expect(repo.delete(def.id)).toEqual({ ok: false, error: 'is-default' })
    expect(repo.list()).toHaveLength(1)
  })

  it('deletes a non-default config and reports unknown ids', () => {
    const res = repo.create('Floaty', {}, null)
    if (!res.ok) throw new Error('create failed')
    expect(repo.delete(res.config.id)).toEqual({ ok: true })
    expect(repo.get(res.config.id)).toBeNull()
    expect(repo.delete(res.config.id)).toEqual({ ok: false, error: 'not-found' })
    expect(repo.update(9999, { tuning: {} }, null)).toEqual({ ok: false, error: 'not-found' })
  })
})
