import { createHash } from 'crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// --- Genre normalization ---

const GENRE_MAP: Record<string, string> = {
  'Science Fiction': 'Sci-Fi',
  'History': 'Historical',
  'Music': 'Musical',
  'Action & Adventure': 'Action',
  'Sci-Fi & Fantasy': 'Sci-Fi',
}

export function applyGenreMap(genres: string[]): string[] {
  return genres.map(g => GENRE_MAP[g] ?? g)
}

export function extractReleaseYear(dateStr: string | undefined): number | null {
  if (!dateStr || dateStr.length < 4) return null
  const year = parseInt(dateStr.slice(0, 4), 10)
  return isNaN(year) ? null : year
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/^(the |a |an )/, '')
    .replace(/[^a-z0-9]/g, '')
}

// --- File cache ---

const CACHE_DIR = join(process.cwd(), 'data', 'cache', 'external')
const TTL_MS = 7 * 24 * 60 * 60 * 1000

export function getCacheKey(type: string, mode: string, query: string): string {
  const normalized = `${type}:${mode}:${query.trim().toLowerCase()}`
  return createHash('sha1').update(normalized).digest('hex')
}

export function readCache(key: string): unknown[] | null {
  const path = join(CACHE_DIR, `${key}.json`)
  if (!existsSync(path)) return null
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8')) as { cachedAt: string; results: unknown[] }
    if (Date.now() - new Date(data.cachedAt).getTime() > TTL_MS) return null
    return data.results
  } catch {
    return null
  }
}

export function writeCache(key: string, results: unknown[]): void {
  mkdirSync(CACHE_DIR, { recursive: true })
  const path = join(CACHE_DIR, `${key}.json`)
  writeFileSync(path, JSON.stringify({ cachedAt: new Date().toISOString(), results }))
}
