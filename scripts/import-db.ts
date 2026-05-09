import 'dotenv/config'
import { readFileSync, existsSync } from 'fs'
import { join, isAbsolute } from 'path'
import { getDb, TABLE_NAMES } from '../src/db'

type Row = Record<string, unknown>

function usage(): never {
  console.error('Usage: npm run db:import -- --from <export-folder-name-or-path>')
  process.exit(1)
}

function resolveFolder(arg: string): string {
  if (isAbsolute(arg) || existsSync(arg)) return arg
  return join(process.cwd(), 'exports', arg)
}

function main() {
  const argv = process.argv.slice(2)
  const fromIdx = argv.indexOf('--from')
  const folderArg = fromIdx !== -1 ? argv[fromIdx + 1] : argv[0]
  if (!folderArg) usage()

  const folderPath = resolveFolder(folderArg)
  if (!existsSync(folderPath)) {
    console.error(`Export folder not found: ${folderPath}`)
    process.exit(1)
  }

  const summaryPath = join(folderPath, 'summary.json')
  if (!existsSync(summaryPath)) {
    console.error(`No summary.json found in ${folderPath}`)
    process.exit(1)
  }

  const summary = JSON.parse(readFileSync(summaryPath, 'utf-8')) as {
    exportedAt: string
    tables: Record<string, { rowCount: number }>
    totalRows: number
  }

  const db = getDb()

  // Schema compatibility check
  const schemaPath = join(folderPath, 'schema.json')
  if (existsSync(schemaPath)) {
    const exportedSchema = JSON.parse(readFileSync(schemaPath, 'utf-8')) as Record<
      string,
      { columns: { name: string }[] }
    >
    let warned = false
    for (const table of TABLE_NAMES) {
      const exportedCols = exportedSchema[table]?.columns.map((c: { name: string }) => c.name).sort() ?? []
      const currentCols = (db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[])
        .map(c => c.name)
        .sort()
      const added = currentCols.filter(c => !exportedCols.includes(c))
      const removed = exportedCols.filter(c => !currentCols.includes(c))
      if (added.length || removed.length) {
        if (!warned) { console.warn('Schema differences detected (proceeding anyway):'); warned = true }
        if (added.length) console.warn(`  ${table}: columns added since export: ${added.join(', ')}`)
        if (removed.length) console.warn(`  ${table}: columns missing from current schema: ${removed.join(', ')}`)
      }
    }
  }

  db.pragma('foreign_keys = OFF')

  const importAll = db.transaction(() => {
    // Delete in reverse order (leaves before roots)
    for (const table of [...TABLE_NAMES].reverse()) {
      db.exec(`DELETE FROM "${table}"`)
    }

    let totalInserted = 0
    for (const table of TABLE_NAMES) {
      const filePath = join(folderPath, `${table}.json`)
      if (!existsSync(filePath)) {
        console.warn(`  Skipping ${table}: ${table}.json not found in export`)
        continue
      }
      const rows = JSON.parse(readFileSync(filePath, 'utf-8')) as Row[]
      if (rows.length === 0) continue

      const columns = Object.keys(rows[0])
      const placeholders = columns.map(() => '?').join(', ')
      const stmt = db.prepare(
        `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`
      )
      for (const row of rows) {
        stmt.run(columns.map(c => row[c] ?? null))
      }
      totalInserted += rows.length
    }
    return totalInserted
  })

  const inserted = importAll()
  db.pragma('foreign_keys = ON')

  const violations = db.pragma('foreign_key_check') as unknown[]
  if (violations.length > 0) {
    console.warn(`FK integrity issues after import (${violations.length} violations):`, violations)
  }

  console.log(
    `Import complete from ${folderPath} — ${TABLE_NAMES.length} tables, ${inserted} rows restored`
  )
  console.log(`  (exported at ${summary.exportedAt}, originally ${summary.totalRows} rows)`)
}

main()
