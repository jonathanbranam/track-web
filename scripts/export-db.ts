import 'dotenv/config'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import { getDb, TABLE_NAMES } from '../src/db'
import { env } from '../src/env'

type Row = Record<string, unknown>

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

function main() {
  const db = getDb()
  const latest = process.argv.includes('--backup')
  const now = new Date()
  const folderName = `export-${utcFolderStamp(now)}`
  const exportDir = latest
    ? join(process.cwd(), 'backup')
    : join(process.cwd(), 'exports', folderName)
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
    const indexList = db.prepare(`PRAGMA index_list("${table}")`).all() as { name: string; unique: number; origin: string }[]
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
  // --backup omits exportedAt/exportFolder so repeated exports of unchanged data diff clean
  const summary = latest
    ? { dbPath: env.SQLITE_PATH, tables: tableSummary, totalRows, schemaHash }
    : { exportedAt: now.toISOString(), dbPath: env.SQLITE_PATH, exportFolder: folderName, tables: tableSummary, totalRows, schemaHash }
  writeFileSync(join(exportDir, 'summary.json'), JSON.stringify(summary, null, 2))

  const dest = latest ? 'backup' : `exports/${folderName}`
  console.log(`Export complete: ${dest} — ${TABLE_NAMES.length} tables, ${totalRows} total rows`)
}

main()
