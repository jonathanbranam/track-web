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

// --- Two-level file cache ---

const CACHE_BASE = join(process.cwd(), 'data', 'cache', 'external')
const QUERIES_DIR = join(CACHE_BASE, 'queries')
const TITLES_DIR = join(CACHE_BASE, 'titles')
const TTL_MS = 7 * 24 * 60 * 60 * 1000
const GENRES_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function getCacheKey(type: string, mode: string, query: string): string {
  const normalized = `${type}:${mode}:${query.trim().toLowerCase()}`
  return createHash('sha1').update(normalized).digest('hex')
}

export function readQueryCache(key: string): number[] | null {
  const path = join(QUERIES_DIR, `${key}.json`)
  if (!existsSync(path)) return null
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8')) as { cachedAt: string; ids: number[] }
    if (Date.now() - new Date(data.cachedAt).getTime() > TTL_MS) return null
    return data.ids
  } catch {
    return null
  }
}

export function writeQueryCache(key: string, ids: number[]): void {
  mkdirSync(QUERIES_DIR, { recursive: true })
  writeFileSync(join(QUERIES_DIR, `${key}.json`), JSON.stringify({ cachedAt: new Date().toISOString(), ids }))
}

export function upsertTitleCache(tmdbId: number, data: unknown): void {
  mkdirSync(TITLES_DIR, { recursive: true })
  writeFileSync(join(TITLES_DIR, `${tmdbId}.json`), JSON.stringify({ updatedAt: new Date().toISOString(), data }))
}

export function loadTitleCache(ids: number[]): unknown[] {
  return ids.flatMap(id => {
    const path = join(TITLES_DIR, `${id}.json`)
    if (!existsSync(path)) return []
    try {
      const file = JSON.parse(readFileSync(path, 'utf-8')) as { data: unknown }
      return [file.data]
    } catch {
      return []
    }
  })
}

export function readGenreCache(type: 'movie' | 'tv'): Record<number, string> | null {
  const path = join(CACHE_BASE, `genres-${type}.json`)
  if (!existsSync(path)) return null
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8')) as { cachedAt: string; genres: Record<number, string> }
    if (Date.now() - new Date(data.cachedAt).getTime() > GENRES_TTL_MS) return null
    return data.genres
  } catch {
    return null
  }
}

export function writeGenreCache(type: 'movie' | 'tv', genres: Record<number, string>): void {
  mkdirSync(CACHE_BASE, { recursive: true })
  writeFileSync(join(CACHE_BASE, `genres-${type}.json`), JSON.stringify({ cachedAt: new Date().toISOString(), genres }))
}
