import { Hono } from 'hono'
import { existsSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import type { AppEnv } from '../../types'

const LOG_DIR = join(process.cwd(), 'logs')

// Fixed allowlist — clients pass a key, never a path.
const LOGS: Record<string, string> = {
  output: 'out.log',
  error: 'error.log',
  deploy: 'deploy.log',
}

const DEFAULT_LINES = 200
const MAX_LINES = 1000

function tail(filePath: string, lines: number): string {
  if (!existsSync(filePath)) return ''
  const content = readFileSync(filePath, 'utf-8')
  const all = content.split('\n')
  // Drop a trailing empty element from a final newline before tailing.
  if (all.length && all[all.length - 1] === '') all.pop()
  return all.slice(-lines).join('\n')
}

export function createAdminLogsRouter() {
  const router = new Hono<AppEnv>()

  router.get('/', (c) => {
    const logs = Object.entries(LOGS).map(([key, file]) => {
      const path = join(LOG_DIR, file)
      const exists = existsSync(path)
      const stat = exists ? statSync(path) : null
      return {
        key,
        file,
        exists,
        size: stat?.size ?? 0,
        modifiedAt: stat ? stat.mtime.toISOString() : null,
      }
    })
    return c.json({ logs })
  })

  router.get('/:name', (c) => {
    const name = c.req.param('name')
    const file = LOGS[name]
    if (!file) return c.json({ error: 'Unknown log' }, 404)

    const requested = Number(c.req.query('lines') ?? DEFAULT_LINES)
    const lines = Number.isFinite(requested)
      ? Math.min(Math.max(Math.trunc(requested), 1), MAX_LINES)
      : DEFAULT_LINES

    const content = tail(join(LOG_DIR, file), lines)
    return c.json({ name, file, lines, content })
  })

  return router
}
