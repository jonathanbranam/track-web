import { Hono } from 'hono'
import type { Context } from 'hono'
import { existsSync } from 'fs'
import {
  exportTimestamped,
  listTimestampedBackups,
  restoreFromFolder,
  scheduledBackupAndPush,
  MigrationMismatchError,
  rollingBackupDir,
} from '../../lib/backup'
import type { AppEnv } from '../../types'

export function createAdminBackupsRouter() {
  const router = new Hono<AppEnv>()

  // Run the scheduled backup now (rolling export + git push when changed).
  router.post('/scheduled', (c) => {
    try {
      const result = scheduledBackupAndPush()
      return c.json(result)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 500)
    }
  })

  // Restore from the last scheduled backup (exports/backup/).
  router.post('/scheduled/restore', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    if (body?.confirm !== true) return c.json({ error: 'Confirmation required' }, 400)
    if (!existsSync(rollingBackupDir())) return c.json({ error: 'No scheduled backup found' }, 404)
    return runRestore(c, 'backup')
  })

  // Run a timestamped backup now.
  router.post('/timestamped', (c) => {
    const result = exportTimestamped()
    return c.json({ folder: result.folder, totalRows: result.totalRows })
  })

  // List the 10 most recent timestamped backups.
  router.get('/timestamped', (c) => {
    return c.json({ backups: listTimestampedBackups(10) })
  })

  // Restore from a selected timestamped backup.
  router.post('/timestamped/:name/restore', async (c) => {
    const name = c.req.param('name')
    const body = await c.req.json().catch(() => ({}))
    if (body?.confirm !== true) return c.json({ error: 'Confirmation required' }, 400)
    // Validate against the existing set — never trust a client-supplied path.
    if (!listTimestampedBackups(Number.MAX_SAFE_INTEGER).includes(name)) {
      return c.json({ error: 'Unknown backup' }, 404)
    }
    return runRestore(c, name)
  })

  return router
}

function runRestore(c: Context<AppEnv>, folder: string) {
  try {
    const result = restoreFromFolder(folder)
    return c.json({ restored: true, ...result })
  } catch (err) {
    if (err instanceof MigrationMismatchError) {
      return c.json({ error: err.message }, 409)
    }
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
}
