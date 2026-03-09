const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_FAILURES = 5

interface Record {
  count: number
  windowStart: number
}

const store = new Map<string, Record>()

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const rec = store.get(ip)

  if (!rec || now - rec.windowStart > WINDOW_MS) {
    return { allowed: true }
  }

  if (rec.count >= MAX_FAILURES) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - rec.windowStart) }
  }

  return { allowed: true }
}

export function recordFailure(ip: string): void {
  const now = Date.now()
  const rec = store.get(ip)

  if (!rec || now - rec.windowStart > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now })
  } else {
    rec.count++
  }
}

export function clearFailures(ip: string): void {
  store.delete(ip)
}
