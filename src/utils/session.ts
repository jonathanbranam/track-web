import { createHmac, timingSafeEqual } from 'crypto'
import type { Context } from 'hono'
import { getCookie, deleteCookie } from 'hono/cookie'
import { env } from '../env'

export const SESSION_COOKIE = 'sid'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days in seconds

export function createSession(userId: number, sessionNonce: string): string {
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toISOString()
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt, sessionNonce })).toString('base64url')
  const sig = createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function decodeSession(token: string): { userId: number; sessionNonce: string } | null {
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  const expectedSig = createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url')
  try {
    if (!timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expectedSig, 'base64url'))) return null
  } catch {
    return null
  }

  let parsed: { userId: number; expiresAt: string; sessionNonce: string }
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
  } catch {
    return null
  }

  if (new Date(parsed.expiresAt) <= new Date()) return null

  return { userId: parsed.userId, sessionNonce: parsed.sessionNonce }
}

// No-op: session state is in the signed cookie; revocation is done via nonce rotation.
export function destroySession(_sessionId: string): void {}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/', domain: env.isProd ? '.branam.us' : undefined })
}
