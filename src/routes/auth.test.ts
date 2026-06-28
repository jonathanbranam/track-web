import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import { setupTestDb } from '../test-utils/db'
import { SqliteApiTokenRepository } from '../repositories/sqlite/apiToken.repository'
import { createAuthRouter } from './auth'
import { createSessionMiddleware } from '../middleware/auth'
import { hashSessionToken } from '../utils/session'
import { clearFailures } from '../utils/rate-limit'

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'testpassword'
const TEST_IP = 'unknown'

describe('auth routes', () => {
  const { db, userRepo, sessionRepo } = setupTestDb()
  let app: Hono

  beforeAll(async () => {
    const hash = await bcrypt.hash(TEST_PASSWORD, 4)
    userRepo.upsert(TEST_EMAIL, hash)
    const tokenRepo = new SqliteApiTokenRepository(db)
    const sessionMw = createSessionMiddleware(sessionRepo)
    app = new Hono().route('/', createAuthRouter(userRepo, tokenRepo, sessionRepo, sessionMw, sessionMw))
  })

  // Log in and return the raw sid cookie token.
  async function login(userAgent?: string): Promise<string> {
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(userAgent ? { 'User-Agent': userAgent } : {}) },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    })
    const setCookie = res.headers.get('set-cookie') ?? ''
    return setCookie.match(/sid=([^;]+)/)?.[1] ?? ''
  }

  beforeEach(() => {
    clearFailures(TEST_IP)
  })

  it('POST /login returns 200 and sets session cookie on correct credentials', async () => {
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)
    expect(res.headers.get('set-cookie')).toContain('sid=')
  })

  it('POST /login returns 401 on wrong password', async () => {
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: 'wrongpassword' }),
    })
    expect(res.status).toBe(401)
  })

  it('POST /login returns 401 on unknown email', async () => {
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unknown@example.com', password: TEST_PASSWORD }),
    })
    expect(res.status).toBe(401)
  })

  it('rate limiting: 6th failed login returns 429', async () => {
    for (let i = 0; i < 5; i++) {
      await app.request('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: 'wrong' }),
      })
    }
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: 'wrong' }),
    })
    expect(res.status).toBe(429)
  })

  it('POST /logout returns 200 and clears cookie', async () => {
    const loginRes = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    })
    const setCookie = loginRes.headers.get('set-cookie') ?? ''
    const sid = setCookie.match(/sid=([^;]+)/)?.[1] ?? ''

    const res = await app.request('/logout', {
      method: 'POST',
      headers: { Cookie: `sid=${sid}` },
    })
    expect(res.status).toBe(200)
    const clearedCookie = res.headers.get('set-cookie') ?? ''
    expect(clearedCookie).toContain('sid=')
    expect(clearedCookie.toLowerCase()).toMatch(/max-age=0|expires=.*1970/)
  })

  it('GET /me returns 200 with { userId } when session cookie is present', async () => {
    const loginRes = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    })
    const setCookie = loginRes.headers.get('set-cookie') ?? ''
    const sid = setCookie.match(/sid=([^;]+)/)?.[1] ?? ''

    const res = await app.request('/me', {
      headers: { Cookie: `sid=${sid}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { userId: number }
    expect(typeof body.userId).toBe('number')
  })

  it('GET /me returns 401 without session cookie', async () => {
    const res = await app.request('/me')
    expect(res.status).toBe(401)
  })

  it('login creates a session row storing the request User-Agent', async () => {
    const sid = await login('IntegrationTest/1.0')
    const row = sessionRepo.findByHash(hashSessionToken(sid))
    expect(row).not.toBeNull()
    expect(row!.userAgent).toBe('IntegrationTest/1.0')
  })

  it('logout invalidates only the current session; other sessions survive', async () => {
    const sidA = await login()
    const sidB = await login()

    // Log out session A.
    const out = await app.request('/logout', { method: 'POST', headers: { Cookie: `sid=${sidA}` } })
    expect(out.status).toBe(200)

    // A is now rejected; B still works.
    expect((await app.request('/me', { headers: { Cookie: `sid=${sidA}` } })).status).toBe(401)
    expect((await app.request('/me', { headers: { Cookie: `sid=${sidB}` } })).status).toBe(200)
  })

  it('GET /me returns 401 for an unknown/forged token', async () => {
    const res = await app.request('/me', { headers: { Cookie: 'sid=not-a-real-token' } })
    expect(res.status).toBe(401)
  })

  it('GET /me returns 401 when the session has expired', async () => {
    const sid = await login()
    // Force the row's expiry into the past.
    db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')
      .run('2000-01-01T00:00:00.000Z', hashSessionToken(sid))
    const res = await app.request('/me', { headers: { Cookie: `sid=${sid}` } })
    expect(res.status).toBe(401)
  })
})
