import { randomBytes, createHash } from 'crypto'
import type { Context } from 'hono'
import { deleteCookie } from 'hono/cookie'
import { env } from '../env'

export const SESSION_COOKIE = 'sid'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days in seconds

// Mint a high-entropy opaque session token. The raw value is set as the cookie;
// only its sha256 hash is persisted in the sessions table (mirroring api_tokens).
export function mintSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashSessionToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/', domain: env.isProd ? '.branam.us' : undefined })
}
