import { Hono } from 'hono'
import { readFileSync } from 'fs'
import { join } from 'path'

interface VersionInfo {
  sha: string
  commitTime: string | null
  buildTime: string | null
}

const fallback: VersionInfo = { sha: 'unknown', commitTime: null, buildTime: null }

function readVersion(): VersionInfo {
  try {
    const raw = readFileSync(join(process.cwd(), 'version.json'), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<VersionInfo>
    return {
      sha: typeof parsed.sha === 'string' ? parsed.sha : 'unknown',
      commitTime: typeof parsed.commitTime === 'string' ? parsed.commitTime : null,
      buildTime: typeof parsed.buildTime === 'string' ? parsed.buildTime : null,
    }
  } catch {
    return fallback
  }
}

export function createVersionRouter() {
  const app = new Hono()
  app.get('/', (c) => c.json(readVersion()))
  return app
}
