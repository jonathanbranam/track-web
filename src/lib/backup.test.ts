import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { setupTestDb } from '../test-utils/db'
import { setDb } from '../db'
import {
  exportTimestamped,
  exportRolling,
  listTimestampedBackups,
  restoreFromFolder,
  MigrationMismatchError,
} from './backup'

describe('backup module', () => {
  const { db, userRepo } = setupTestDb()
  let backupDir: string

  beforeAll(() => {
    backupDir = mkdtempSync(join(tmpdir(), 'backup-test-'))
    process.env.BACKUP_DIR = backupDir
  })

  beforeEach(() => {
    // setupTestDb nulls the global db after each test; re-point it.
    setDb(db)
  })

  afterAll(() => {
    delete process.env.BACKUP_DIR
    rmSync(backupDir, { recursive: true, force: true })
  })

  it('exportTimestamped writes a folder with the expected files', () => {
    userRepo.upsert('a@example.com', 'hash-a')
    const { folder } = exportTimestamped()
    expect(folder).toMatch(/^export-\d{8}-\d{4}$/)
    expect(existsSync(join(backupDir, folder, 'summary.json'))).toBe(true)
    expect(existsSync(join(backupDir, folder, 'users.json'))).toBe(true)
  })

  it('round-trips data through export then restore', () => {
    userRepo.upsert('one@example.com', 'h1')
    userRepo.upsert('two@example.com', 'h2')
    const before = userRepo.listAll().length
    const { folder } = exportTimestamped()

    userRepo.createUser('three@example.com', 'h3', 'Three')
    expect(userRepo.listAll().length).toBe(before + 1)

    const result = restoreFromFolder(folder)
    expect(result.inserted).toBeGreaterThanOrEqual(before)
    expect(userRepo.listAll().length).toBe(before)
    expect(userRepo.findByEmail('three@example.com')).toBeNull()
  })

  it('exportRolling writes the rolling backup folder', () => {
    const { folder } = exportRolling()
    expect(folder).toBe('backup')
    expect(existsSync(join(backupDir, 'backup', 'summary.json'))).toBe(true)
  })

  it('listTimestampedBackups returns the 10 most recent, newest first', () => {
    // Create 12 synthetic timestamped backup folders.
    for (let i = 1; i <= 12; i++) {
      mkdirSync(join(backupDir, `export-202601${String(i).padStart(2, '0')}-0000`), { recursive: true })
    }
    const list = listTimestampedBackups(10)
    expect(list).toHaveLength(10)
    expect(list[0] > list[1]).toBe(true) // newest first
    expect(list).not.toContain('export-20260101-0000') // oldest dropped
  })

  it('restoreFromFolder throws MigrationMismatchError on a mismatched export', () => {
    const folder = 'export-mismatch'
    mkdirSync(join(backupDir, folder), { recursive: true })
    writeFileSync(
      join(backupDir, folder, 'summary.json'),
      JSON.stringify({ latestMigration: 'nonexistent-migration', tables: {}, totalRows: 0 }),
    )
    expect(() => restoreFromFolder(folder)).toThrow(MigrationMismatchError)
    // With force it does not throw on the migration check.
    expect(() => restoreFromFolder(folder, { force: true })).not.toThrow()
  })
})
