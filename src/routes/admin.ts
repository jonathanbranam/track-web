import { Hono } from 'hono'
import type { Context } from 'hono'
import { mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getDb, TABLE_NAMES } from '../db'
import type { AppEnv } from '../types'

type Row = Record<string, unknown>

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

function backupDir(): string {
  return join(process.cwd(), 'backup')
}

function isAdmin(c: Context<AppEnv>): boolean {
  return c.get('userId') === 1
}

export function createAdminRouter() {
  const router = new Hono<AppEnv>()

  router.post('/backup', (c) => {
    if (!isAdmin(c)) return c.json({ error: 'Forbidden' }, 403)

    const db = getDb()
    const now = new Date()
    const folderName = `backup-${utcFolderStamp(now)}`
    const exportDir = join(backupDir(), folderName)
    mkdirSync(exportDir, { recursive: true })

    const tableSummary: Record<string, { rowCount: number }> = {}
    let totalRows = 0

    for (const table of TABLE_NAMES) {
      const rows = db.prepare(`SELECT * FROM "${table}"`).all() as Row[]
      writeFileSync(join(exportDir, `${table}.json`), JSON.stringify(rows, null, 2))
      tableSummary[table] = { rowCount: rows.length }
      totalRows += rows.length
    }

    const summary = {
      exportedAt: now.toISOString(),
      exportFolder: folderName,
      tables: tableSummary,
      totalRows,
    }
    writeFileSync(join(exportDir, 'summary.json'), JSON.stringify(summary, null, 2))

    return c.json({ folder: folderName })
  })

  router.get('/backups', (c) => {
    if (!isAdmin(c)) return c.json({ error: 'Forbidden' }, 403)

    const dir = backupDir()
    if (!existsSync(dir)) return c.json({ backups: [] })

    const entries = readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort()
      .reverse()

    const backups = entries.flatMap(folder => {
      const summaryPath = join(dir, folder, 'summary.json')
      if (!existsSync(summaryPath)) return []
      try {
        const s = JSON.parse(readFileSync(summaryPath, 'utf-8')) as {
          exportedAt: string
          totalRows: number
        }
        return [{ folder, exportedAt: s.exportedAt, totalRows: s.totalRows }]
      } catch {
        return []
      }
    })

    return c.json({ backups })
  })

  router.post('/restore', async (c) => {
    if (!isAdmin(c)) return c.json({ error: 'Forbidden' }, 403)

    const body = await c.req.json<{ folder?: string }>()
    const folder = body.folder?.trim()
    if (!folder) return c.json({ error: 'folder is required' }, 400)

    // Prevent path traversal
    if (folder.includes('/') || folder.includes('\\') || folder.startsWith('.')) {
      return c.json({ error: 'Invalid folder name' }, 400)
    }

    const folderPath = join(backupDir(), folder)
    if (!existsSync(folderPath)) return c.json({ error: 'Backup not found' }, 404)

    const summaryPath = join(folderPath, 'summary.json')
    if (!existsSync(summaryPath)) return c.json({ error: 'Invalid backup: missing summary.json' }, 400)

    const db = getDb()
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
          `INSERT INTO "${table}" (${columns.map(col => `"${col}"`).join(', ')}) VALUES (${placeholders})`
        )
        for (const row of rows) {
          stmt.run(columns.map(col => row[col] ?? null))
        }
        totalInserted += rows.length
      }

      return totalInserted
    })

    const inserted = importAll()
    db.pragma('foreign_keys = ON')
    return c.json({ message: `Restored ${inserted} rows from ${folder}` })
  })

  return router
}
