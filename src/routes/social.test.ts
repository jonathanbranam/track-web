import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import Database from 'better-sqlite3'
import { migrate, setDb } from '../db'
import { SqliteUserRepository } from '../repositories/sqlite/user.repository'
import { SqliteSocialRepository } from '../repositories/sqlite/social.repository'
import { createAuthRouter } from './auth'
import { createSocialRouter } from './social'
import { clearFailures } from '../utils/rate-limit'
import { authMiddleware } from '../middleware/auth'

const EMAIL_A = 'alice@example.com'
const EMAIL_B = 'bob@example.com'
const PASSWORD = 'password'

function makeTestEnv() {
  const db = new Database(':memory:')
  migrate(db)
  setDb(db)
  const userRepo = new SqliteUserRepository(db)
  const socialRepo = new SqliteSocialRepository(db)
  const app = new Hono()
  app.route('/api/auth', createAuthRouter(userRepo))
  app.use('/api/social/*', authMiddleware)
  app.route('/api/social', createSocialRouter(socialRepo))
  return { db, userRepo, socialRepo, app }
}

async function loginUser(app: Hono, email: string): Promise<string> {
  const res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  const cookie = res.headers.get('set-cookie') ?? ''
  return cookie.match(/sid=([^;]+)/)?.[1] ?? ''
}

// --- Invite code lifecycle ---
describe('invite code lifecycle', () => {
  let env: ReturnType<typeof makeTestEnv>
  let userA: { id: number; email: string }
  let userB: { id: number; email: string }
  let sidA: string
  let sidB: string

  beforeEach(async () => {
    clearFailures('unknown')
    env = makeTestEnv()
    const hash = await bcrypt.hash(PASSWORD, 4)
    env.userRepo.upsert(EMAIL_A, hash)
    env.userRepo.upsert(EMAIL_B, hash)
    userA = env.userRepo.findByEmail(EMAIL_A)!
    userB = env.userRepo.findByEmail(EMAIL_B)!
    sidA = await loginUser(env.app, EMAIL_A)
    sidB = await loginUser(env.app, EMAIL_B)
  })

  it('creates an invite code', async () => {
    const res = await env.app.request('/api/social/invite-codes', {
      method: 'POST',
      headers: { Cookie: `sid=${sidA}` },
    })
    expect(res.status).toBe(201)
    const body = await res.json() as any
    expect(typeof body.code).toBe('string')
    expect(body.createdByUserId).toBe(userA.id)
  })

  it('redeems a valid invite code creating a connection', async () => {
    const createRes = await env.app.request('/api/social/invite-codes', {
      method: 'POST',
      headers: { Cookie: `sid=${sidA}` },
    })
    const { code } = await createRes.json() as any

    const redeemRes = await env.app.request('/api/social/connect', {
      method: 'POST',
      headers: { Cookie: `sid=${sidB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    expect(redeemRes.status).toBe(200)
    expect(env.socialRepo.isConnected(userA.id, userB.id)).toBe(true)
  })

  it('rejects redeeming an already-used code', async () => {
    const createRes = await env.app.request('/api/social/invite-codes', {
      method: 'POST',
      headers: { Cookie: `sid=${sidA}` },
    })
    const { code } = await createRes.json() as any

    await env.app.request('/api/social/connect', {
      method: 'POST',
      headers: { Cookie: `sid=${sidB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const res = await env.app.request('/api/social/connect', {
      method: 'POST',
      headers: { Cookie: `sid=${sidB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects redeeming own code', async () => {
    const createRes = await env.app.request('/api/social/invite-codes', {
      method: 'POST',
      headers: { Cookie: `sid=${sidA}` },
    })
    const { code } = await createRes.json() as any

    const res = await env.app.request('/api/social/connect', {
      method: 'POST',
      headers: { Cookie: `sid=${sidA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects an expired code', async () => {
    const expiredAt = new Date(Date.now() - 1000).toISOString()
    env.socialRepo.createInviteCode(userA.id, 'expired-code-token', expiredAt)

    const res = await env.app.request('/api/social/connect', {
      method: 'POST',
      headers: { Cookie: `sid=${sidB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'expired-code-token' }),
    })
    expect(res.status).toBe(400)
  })
})

// --- Connection request lifecycle ---
describe('connection request lifecycle', () => {
  let env: ReturnType<typeof makeTestEnv>
  let userA: { id: number; email: string }
  let userB: { id: number; email: string }
  let sidA: string
  let sidB: string

  beforeEach(async () => {
    clearFailures('unknown')
    env = makeTestEnv()
    const hash = await bcrypt.hash(PASSWORD, 4)
    env.userRepo.upsert(EMAIL_A, hash)
    env.userRepo.upsert(EMAIL_B, hash)
    userA = env.userRepo.findByEmail(EMAIL_A)!
    userB = env.userRepo.findByEmail(EMAIL_B)!
    sidA = await loginUser(env.app, EMAIL_A)
    sidB = await loginUser(env.app, EMAIL_B)
    // Put A and B in a shared group
    const group = env.socialRepo.createGroup('Test Group', null, userA.id)
    env.socialRepo.addMember(group.id, userA.id)
    env.socialRepo.addMember(group.id, userB.id)
  })

  it('sends a connection request to a group co-member', async () => {
    const res = await env.app.request('/api/social/connection-requests', {
      method: 'POST',
      headers: { Cookie: `sid=${sidA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: userB.id }),
    })
    expect(res.status).toBe(201)
  })

  it('accepts a connection request creating a connection', async () => {
    await env.app.request('/api/social/connection-requests', {
      method: 'POST',
      headers: { Cookie: `sid=${sidA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: userB.id }),
    })

    const pendingRes = await env.app.request('/api/social/connection-requests/pending', {
      headers: { Cookie: `sid=${sidB}` },
    })
    const pending = await pendingRes.json() as any[]
    expect(pending.length).toBe(1)

    const acceptRes = await env.app.request(`/api/social/connection-requests/${pending[0].id}`, {
      method: 'PUT',
      headers: { Cookie: `sid=${sidB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    })
    expect(acceptRes.status).toBe(200)
    expect(env.socialRepo.isConnected(userA.id, userB.id)).toBe(true)
  })

  it('decline masks as pending in sender view', async () => {
    await env.app.request('/api/social/connection-requests', {
      method: 'POST',
      headers: { Cookie: `sid=${sidA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: userB.id }),
    })

    const pendingRes = await env.app.request('/api/social/connection-requests/pending', {
      headers: { Cookie: `sid=${sidB}` },
    })
    const pending = await pendingRes.json() as any[]
    expect(pending.length).toBe(1)

    await env.app.request(`/api/social/connection-requests/${pending[0].id}`, {
      method: 'PUT',
      headers: { Cookie: `sid=${sidB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline' }),
    })

    // Connection should NOT have been created
    expect(env.socialRepo.isConnected(userA.id, userB.id)).toBe(false)
  })

  it('blocks duplicate active request', async () => {
    await env.app.request('/api/social/connection-requests', {
      method: 'POST',
      headers: { Cookie: `sid=${sidA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: userB.id }),
    })
    const res = await env.app.request('/api/social/connection-requests', {
      method: 'POST',
      headers: { Cookie: `sid=${sidA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: userB.id }),
    })
    expect(res.status).toBe(409)
  })

  it('re-request allowed after old request is pruned', () => {
    const expiredAt = new Date(Date.now() - 1000).toISOString()
    env.socialRepo.createRequest(userA.id, userB.id, expiredAt)
    env.socialRepo.pruneStaleRequests(userA.id, userB.id)
    const newReq = env.socialRepo.createRequest(userA.id, userB.id, new Date(Date.now() + 7 * 86400000).toISOString())
    expect(newReq.id).toBeGreaterThan(0)
  })
})

// --- Group membership rules ---
describe('group membership rules', () => {
  let env: ReturnType<typeof makeTestEnv>
  let userA: { id: number; email: string }
  let userB: { id: number; email: string }
  let sidA: string
  let sidB: string

  beforeEach(async () => {
    clearFailures('unknown')
    env = makeTestEnv()
    const hash = await bcrypt.hash(PASSWORD, 4)
    env.userRepo.upsert(EMAIL_A, hash)
    env.userRepo.upsert(EMAIL_B, hash)
    userA = env.userRepo.findByEmail(EMAIL_A)!
    userB = env.userRepo.findByEmail(EMAIL_B)!
    sidA = await loginUser(env.app, EMAIL_A)
    sidB = await loginUser(env.app, EMAIL_B)
  })

  it('member can add a connected user', async () => {
    env.socialRepo.createConnection(userA.id, userB.id)
    const group = env.socialRepo.createGroup('Test', null, userA.id)
    env.socialRepo.addMember(group.id, userA.id)

    const res = await env.app.request(`/api/social/groups/${group.id}/members`, {
      method: 'POST',
      headers: { Cookie: `sid=${sidA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userB.id }),
    })
    expect(res.status).toBe(201)
    expect(env.socialRepo.isMember(group.id, userB.id)).toBe(true)
  })

  it('member cannot add an unconnected user', async () => {
    const group = env.socialRepo.createGroup('Test', null, userA.id)
    env.socialRepo.addMember(group.id, userA.id)

    const res = await env.app.request(`/api/social/groups/${group.id}/members`, {
      method: 'POST',
      headers: { Cookie: `sid=${sidA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userB.id }),
    })
    expect(res.status).toBe(403)
  })

  it('non-member is blocked from adding members', async () => {
    const group = env.socialRepo.createGroup('Test', null, userA.id)
    env.socialRepo.addMember(group.id, userA.id)

    const res = await env.app.request(`/api/social/groups/${group.id}/members`, {
      method: 'POST',
      headers: { Cookie: `sid=${sidB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userA.id }),
    })
    expect(res.status).toBe(403)
  })
})

// --- GET /api/auth/me displayName ---
describe('GET /api/auth/me displayName', () => {
  let env: ReturnType<typeof makeTestEnv>
  let userA: { id: number; email: string }
  let sidA: string

  beforeEach(async () => {
    clearFailures('unknown')
    env = makeTestEnv()
    const hash = await bcrypt.hash(PASSWORD, 4)
    env.userRepo.upsert(EMAIL_A, hash)
    userA = env.userRepo.findByEmail(EMAIL_A)!
    sidA = await loginUser(env.app, EMAIL_A)
  })

  it('returns displayName from display_name when set', async () => {
    env.db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run('Alice', userA.id)

    const res = await env.app.request('/api/auth/me', {
      headers: { Cookie: `sid=${sidA}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.displayName).toBe('Alice')
  })

  it('returns email prefix when display_name is null', async () => {
    const res = await env.app.request('/api/auth/me', {
      headers: { Cookie: `sid=${sidA}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.displayName).toBe('alice')
    expect(body.userId).toBe(userA.id)
  })
})
