import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync),
  }
})

async function buildApp() {
  vi.resetModules()
  const { createVersionRouter } = await import('./version')
  return new Hono().route('/', createVersionRouter())
}

describe('GET /api/version', () => {
  it('returns version info when version.json is present', async () => {
    const fs = await import('fs')
    vi.mocked(fs.readFileSync).mockImplementation((path, ...args) => {
      if (typeof path === 'string' && path.endsWith('version.json')) {
        return JSON.stringify({ sha: 'abc1234', commitTime: '2025-01-01T00:00:00Z', buildTime: '2025-01-01T01:00:00Z' })
      }
      return (fs.readFileSync as (...a: unknown[]) => string)(path, ...args)
    })
    const app = await buildApp()
    const res = await app.request('/')
    expect(res.status).toBe(200)
    const body = await res.json() as { sha: string; commitTime: string; buildTime: string }
    expect(body.sha).toBe('abc1234')
    expect(body.commitTime).toBe('2025-01-01T00:00:00Z')
    expect(body.buildTime).toBe('2025-01-01T01:00:00Z')
  })

  it('returns fallback when version.json is missing', async () => {
    const fs = await import('fs')
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (typeof path === 'string' && path.endsWith('version.json')) {
        throw Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' })
      }
      throw new Error('unexpected readFileSync call')
    })
    const app = await buildApp()
    const res = await app.request('/')
    expect(res.status).toBe(200)
    const body = await res.json() as { sha: string; commitTime: unknown; buildTime: unknown }
    expect(body.sha).toBe('unknown')
    expect(body.commitTime).toBeNull()
    expect(body.buildTime).toBeNull()
  })

  it('allows unauthenticated access (no session cookie required)', async () => {
    const fs = await import('fs')
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (typeof path === 'string' && path.endsWith('version.json')) {
        return JSON.stringify({ sha: 'abc1234', commitTime: null, buildTime: null })
      }
      throw new Error('unexpected readFileSync call')
    })
    const app = await buildApp()
    const res = await app.request('/', { headers: {} })
    expect(res.status).toBe(200)
  })
})
