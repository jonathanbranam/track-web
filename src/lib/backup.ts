// Shared backup/restore logic — the single source of truth used by both the
// CLI scripts (export-db, import-db, export-push) and the admin API routes.
// The on-disk format and the `exports/` layout match the original scripts
// exactly so existing backups remain valid.

import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, isAbsolute } from 'path'
import { createHash } from 'crypto'
import { spawnSync } from 'child_process'
import { getDb, getLatestMigration, MIGRATIONS, TABLE_NAMES } from '../db'
import { env } from '../env'

type Row = Record<string, unknown>

// Base directory for backups. Defaults to `exports/` (the existing standalone
// git repo). Overridable via BACKUP_DIR for tests. Resolved at call time so the
// override applies even when the module is imported first.
export function exportsBaseDir(): string {
  return process.env.BACKUP_DIR || join(process.cwd(), 'exports')
}

export function rollingBackupDir(): string {
  return join(exportsBaseDir(), 'backup')
}

function formatCsv(columns: string[], rows: Row[]): string {
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    const s = String(val)
    return s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s
  }
  return [columns.join(','), ...rows.map(r => columns.map(c => escape(r[c])).join(','))].join('\n') + '\n'
}

function utcFolderStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    '-' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes())
  )
}

export interface ExportResult {
  /** Folder name relative to `exports/` (e.g. `export-20260620-1530` or `backup`). */
  folder: string
  totalRows: number
}

/** Write a full per-table export (JSON + CSV + schema + summary) into `exportDir`. */
function writeExport(exportDir: string, folderName: string, rolling: boolean, now: Date): ExportResult {
  const db = getDb()
  mkdirSync(exportDir, { recursive: true })

  const schema: Record<string, unknown> = {}
  const tableSummary: Record<string, { rowCount: number }> = {}
  let totalRows = 0

  for (const table of TABLE_NAMES) {
    const columns = (db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[]).map(c => c.name)
    const rows = db.prepare(`SELECT * FROM "${table}"`).all() as Row[]

    writeFileSync(join(exportDir, `${table}.json`), JSON.stringify(rows, null, 2))
    writeFileSync(join(exportDir, `${table}.csv`), formatCsv(columns, rows))

    const fks = db.prepare(`PRAGMA foreign_key_list("${table}")`).all()
    const indexList = db.prepare(`PRAGMA index_list("${table}")`).all() as { name: string }[]
    const indexes = indexList.map(idx => ({
      ...idx,
      columns: db.prepare(`PRAGMA index_info("${idx.name}")`).all(),
    }))
    schema[table] = { columns: db.prepare(`PRAGMA table_info("${table}")`).all(), foreignKeys: fks, indexes }

    tableSummary[table] = { rowCount: rows.length }
    totalRows += rows.length
  }

  const schemaJson = JSON.stringify(schema, null, 2)
  writeFileSync(join(exportDir, 'schema.json'), schemaJson)

  const schemaHash = createHash('sha256').update(schemaJson).digest('hex')
  const latestMigration = getLatestMigration(db)
  // The rolling backup omits exportedAt/exportFolder so repeated exports of
  // unchanged data diff clean (matches the original export-db.ts behavior).
  const summary = rolling
    ? { dbPath: env.SQLITE_PATH, latestMigration, tables: tableSummary, totalRows, schemaHash }
    : { exportedAt: now.toISOString(), dbPath: env.SQLITE_PATH, exportFolder: folderName, latestMigration, tables: tableSummary, totalRows, schemaHash }
  writeFileSync(join(exportDir, 'summary.json'), JSON.stringify(summary, null, 2))

  return { folder: folderName, totalRows }
}

/** Write a new timestamped snapshot to `exports/export-<UTC-stamp>/`. */
export function exportTimestamped(now: Date = new Date()): ExportResult {
  const folderName = `export-${utcFolderStamp(now)}`
  return writeExport(join(exportsBaseDir(), folderName), folderName, false, now)
}

/** Write/overwrite the rolling backup at `exports/backup/`. */
export function exportRolling(now: Date = new Date()): ExportResult {
  return writeExport(rollingBackupDir(), 'backup', true, now)
}

/** List timestamped backup folders, most recent first, limited to `limit`. */
export function listTimestampedBackups(limit = 10): string[] {
  const base = exportsBaseDir()
  if (!existsSync(base)) return []
  return readdirSync(base)
    .filter(name => name.startsWith('export-') && statSync(join(base, name)).isDirectory())
    .sort()
    .reverse()
    .slice(0, limit)
}

export class MigrationMismatchError extends Error {
  constructor(public exportMigration: string | null, public currentMigration: string | null) {
    super(
      `Migration mismatch: export was at ${exportMigration ?? '(unknown)'}, ` +
      `current DB at ${currentMigration ?? '(none)'}`
    )
    this.name = 'MigrationMismatchError'
  }
}

function resolveFolder(arg: string): string {
  if (isAbsolute(arg) || existsSync(arg)) return arg
  return join(exportsBaseDir(), arg)
}

export interface RestoreResult {
  tables: number
  inserted: number
  exportedAt?: string
  totalRows: number
}

/**
 * Restore the database from an export folder (name under `exports/` or a path).
 * Runs in-process against the live DB connection inside a single transaction.
 * Throws `MigrationMismatchError` when the export's migration differs and
 * `force` is not set.
 */
export function restoreFromFolder(folderArg: string, opts: { force?: boolean } = {}): RestoreResult {
  const folderPath = resolveFolder(folderArg)
  if (!existsSync(folderPath)) throw new Error(`Backup folder not found: ${folderArg}`)

  const summaryPath = join(folderPath, 'summary.json')
  if (!existsSync(summaryPath)) throw new Error(`No summary.json found in ${folderArg}`)

  const summary = JSON.parse(readFileSync(summaryPath, 'utf-8')) as {
    exportedAt?: string
    latestMigration?: string | null
    tables: Record<string, { rowCount: number }>
    totalRows: number
  }

  const db = getDb()

  const exportMigration = summary.latestMigration ?? null
  const currentMigration = getLatestMigration(db)
  if (exportMigration !== currentMigration && !opts.force) {
    throw new MigrationMismatchError(exportMigration, currentMigration)
  }

  db.pragma('foreign_keys = OFF')
  const importAll = db.transaction(() => {
    for (const table of [...TABLE_NAMES].reverse()) {
      db.exec(`DELETE FROM "${table}"`)
    }
    let totalInserted = 0
    for (const table of TABLE_NAMES) {
      const filePath = join(folderPath, `${table}.json`)
      if (!existsSync(filePath)) continue
      const rows = JSON.parse(readFileSync(filePath, 'utf-8')) as Row[]
      if (rows.length === 0) continue
      const columns = Object.keys(rows[0])
      const placeholders = columns.map(() => '?').join(', ')
      const stmt = db.prepare(
        `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`
      )
      for (const row of rows) stmt.run(columns.map(c => row[c] ?? null))
      totalInserted += rows.length
    }
    return totalInserted
  })

  const inserted = importAll()
  db.pragma('foreign_keys = ON')

  return {
    tables: TABLE_NAMES.length,
    inserted,
    exportedAt: summary.exportedAt,
    totalRows: summary.totalRows,
  }
}

export interface ScheduledBackupResult {
  folder: string
  pushed: boolean
}

/**
 * Run the scheduled backup: write the rolling backup, then — treating `exports/`
 * as a standalone git repo — commit and push `backup/` only if it changed.
 * Mirrors scripts/export-push.sh.
 */
export function scheduledBackupAndPush(now: Date = new Date()): ScheduledBackupResult {
  exportRolling(now)

  const git = (args: string[]) =>
    spawnSync('git', args, { cwd: exportsBaseDir(), encoding: 'utf-8' })

  // Changed if there are tracked modifications or untracked files under backup/.
  const status = git(['status', '--porcelain', 'backup'])
  if (status.status !== 0) throw new Error(`git status failed: ${status.stderr?.trim()}`)
  if (status.stdout.trim().length === 0) {
    return { folder: 'backup', pushed: false }
  }

  const stamp = now.toISOString()
  const add = git(['add', 'backup'])
  if (add.status !== 0) throw new Error(`git add failed: ${add.stderr?.trim()}`)
  const commit = git(['commit', '-m', `chore: db backup ${stamp}`])
  if (commit.status !== 0) throw new Error(`git commit failed: ${commit.stderr?.trim()}`)
  const push = git(['push'])
  if (push.status !== 0) throw new Error(`git push failed: ${push.stderr?.trim()}`)

  return { folder: 'backup', pushed: true }
}
