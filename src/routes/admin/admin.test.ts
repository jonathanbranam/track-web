import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import { Hono } from 'hono'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { setupTestDb } from '../../test-utils/db'
import { setDb } from '../../db'
import { createSession } from '../../utils/session'
import { createAdminRouter } from './index'

// Avoid spawning the real deploy script.
vi.mock('../../lib/deploy', () => ({ runDeploy: vi.fn() }))

describe('admin routes', () => {
  const { db, userRepo } = setupTestDb()
  let app: Hono
  let adminCookie: string
  let nonAdminCookie: string
  let backupDir: string

  beforeAll(() => {
    backupDir = mkdtempSync(join(tmpdir(), 'admin-test-'))
    process.env.BACKUP_DIR = backupDir
    // user id 1 = admin (first inserted), id 2 = non-admin
    userRepo.upsert('admin@example.com', 'h1')
    userRepo.upsert('member@example.com', 'h2')
    adminCookie = `sid=${createSession(1)}`
    nonAdminCookie = `sid=${createSession(2)}`
    app = new Hono().route('/api/admin', createAdminRouter(userRepo))
  })

  beforeEach(() => setDb(db))

  afterAll(() => {
    delete process.env.BACKUP_DIR
    rmSync(backupDir, { recursive: true, force: true })
  })

  const req = (path: string, init: RequestInit = {}, cookie?: string) =>
    app.request(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(init.headers ?? {}) },
    })

  describe('requireAdmin', () => {
    it('401 without a session', async () => {
      expect((await req('/api/admin/users')).status).toBe(401)
    })
    it('403 for a non-admin user', async () => {
      expect((await req('/api/admin/users', {}, nonAdminCookie)).status).toBe(403)
    })
    it('200 for user 1', async () => {
      expect((await req('/api/admin/users', {}, adminCookie)).status).toBe(200)
    })
  })

  it('POST /deploy returns 202', async () => {
    const res = await req('/api/admin/deploy', { method: 'POST' }, adminCookie)
    expect(res.status).toBe(202)
  })

  describe('users', () => {
    it('creates, rejects duplicate, lists, changes password, and deletes', async () => {
      const create = await req('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com', password: 'pw', displayName: 'New' }),
      }, adminCookie)
      expect(create.status).toBe(201)
      const created = await create.json() as { id: number }

      const dup = await req('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com', password: 'pw' }),
      }, adminCookie)
      expect(dup.status).toBe(409)

      const list = await (await req('/api/admin/users', {}, adminCookie)).json() as { users: unknown[] }
      expect(list.users.length).toBeGreaterThanOrEqual(3)

      const pw = await req(`/api/admin/users/${created.id}/password`, {
        method: 'PUT', body: JSON.stringify({ password: 'newpw' }),
      }, adminCookie)
      expect(pw.status).toBe(200)

      expect((await req(`/api/admin/users/${created.id}`, { method: 'DELETE' }, adminCookie)).status).toBe(200)
    })

    it('refuses to delete the owner (id 1)', async () => {
      expect((await req('/api/admin/users/1', { method: 'DELETE' }, adminCookie)).status).toBe(400)
    })
  })

  describe('logs', () => {
    it('lists the four logs including the backup log', async () => {
      const body = await (await req('/api/admin/logs', {}, adminCookie)).json() as { logs: { key: string }[] }
      expect(body.logs.map(l => l.key).sort()).toEqual(['backup', 'deploy', 'error', 'output'])
    })
    it('returns a tail for a known log', async () => {
      const res = await req('/api/admin/logs/output', {}, adminCookie)
      expect(res.status).toBe(200)
    })
    it('tails the backup log, returning empty content when the file is absent', async () => {
      const res = await req('/api/admin/logs/backup', {}, adminCookie)
      expect(res.status).toBe(200)
      const body = await res.json() as { file: string; content: string }
      expect(body.file).toBe('export-push.log')
      expect(body.content).toBe('')
    })
    it('rejects an unknown log name', async () => {
      expect((await req('/api/admin/logs/passwd', {}, adminCookie)).status).toBe(404)
    })
  })

  describe('backups', () => {
    it('creates a timestamped backup and lists it', async () => {
      const create = await req('/api/admin/backups/timestamped', { method: 'POST' }, adminCookie)
      expect(create.status).toBe(200)
      const { folder } = await create.json() as { folder: string }
      const list = await (await req('/api/admin/backups/timestamped', {}, adminCookie)).json() as { backups: string[] }
      expect(list.backups).toContain(folder)
    })

    it('restore requires confirmation', async () => {
      const list = await (await req('/api/admin/backups/timestamped', {}, adminCookie)).json() as { backups: string[] }
      const name = list.backups[0]
      const noConfirm = await req(`/api/admin/backups/timestamped/${name}/restore`, { method: 'POST', body: '{}' }, adminCookie)
      expect(noConfirm.status).toBe(400)
      const confirmed = await req(`/api/admin/backups/timestamped/${name}/restore`, {
        method: 'POST', body: JSON.stringify({ confirm: true }),
      }, adminCookie)
      expect(confirmed.status).toBe(200)
    })

    it('rejects an unknown timestamped backup name', async () => {
      const res = await req('/api/admin/backups/timestamped/export-does-not-exist/restore', {
        method: 'POST', body: JSON.stringify({ confirm: true }),
      }, adminCookie)
      expect(res.status).toBe(404)
    })

    it('scheduled restore 404s when no scheduled backup exists', async () => {
      const res = await req('/api/admin/backups/scheduled/restore', {
        method: 'POST', body: JSON.stringify({ confirm: true }),
      }, adminCookie)
      expect(res.status).toBe(404)
    })
  })
})
