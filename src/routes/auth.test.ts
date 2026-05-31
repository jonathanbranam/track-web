import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import { setupTestDb } from '../test-utils/db'
import { SqliteApiTokenRepository } from '../repositories/sqlite/apiToken.repository'
import { createAuthRouter } from './auth'
import { sessionMiddleware } from '../middleware/auth'
import { clearFailures } from '../utils/rate-limit'

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'testpassword'
const TEST_IP = 'unknown'

describe('auth routes', () => {
  const { db, userRepo } = setupTestDb()
  let app: Hono

  beforeAll(async () => {
    const hash = await bcrypt.hash(TEST_PASSWORD, 4)
    userRepo.upsert(TEST_EMAIL, hash)
    const tokenRepo = new SqliteApiTokenRepository(db)
    app = new Hono().route('/', createAuthRouter(userRepo, tokenRepo, sessionMiddleware, sessionMiddleware))
  })

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
})
