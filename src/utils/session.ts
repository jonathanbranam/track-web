import { randomBytes } from 'crypto'

// In-memory session store: sessionId → userId
const sessions = new Map<string, number>()

export const SESSION_COOKIE = 'sid'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days in seconds

export function createSession(userId: number): string {
  const sessionId = randomBytes(32).toString('hex')
  sessions.set(sessionId, userId)
  return sessionId
}

export function getSession(sessionId: string): number | null {
  return sessions.get(sessionId) ?? null
}

export function destroySession(sessionId: string): void {
  sessions.delete(sessionId)
}
