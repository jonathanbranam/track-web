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

// --- Person filmography sort ---

// Five sort modes. Change TMDB_PERSON_SORT env var and restart the server to switch.
//   billing    — ascending billing order (original behaviour)
//   harmonic   — descending harmonic mean of normalised vote_average × popularity
//   decay      — harmonic mean × billing decay multiplier  (default, Option A)
//   three-way  — three-way harmonic mean including normalised billing  (Option B)
//   geometric  — weighted geometric mean vote^0.5 × pop^0.3 × billing^0.2  (Option C)

export type PersonSortMode = 'billing' | 'harmonic' | 'decay' | 'three-way' | 'geometric'

const VALID_SORT_MODES = new Set<string>(['billing', 'harmonic', 'decay', 'three-way', 'geometric'])
const DEFAULT_SORT_MODE: PersonSortMode = 'decay'

// Decay constant for 'decay' mode: billing 0→×1.0, billing 20→×0.5, billing 88→×0.19
const DECAY_K = 0.05

// Weights for 'geometric' mode (must sum to 1)
const GEO_VOTE = 0.5
const GEO_POP  = 0.3
const GEO_BILL = 0.2

const FLOOR = 0.001

export function getPersonSortMode(): PersonSortMode {
  const raw = process.env.TMDB_PERSON_SORT ?? DEFAULT_SORT_MODE
  return (VALID_SORT_MODES.has(raw) ? raw : DEFAULT_SORT_MODE) as PersonSortMode
}

export interface PersonCreditEntry {
  item: Record<string, unknown>
  billing: number
}

function hm2(a: number, b: number): number {
  return 2 / (1 / Math.max(a, FLOOR) + 1 / Math.max(b, FLOOR))
}

function hm3(a: number, b: number, c: number): number {
  return 3 / (1 / Math.max(a, FLOOR) + 1 / Math.max(b, FLOOR) + 1 / Math.max(c, FLOOR))
}

export function sortPersonCredits(entries: PersonCreditEntry[]): PersonCreditEntry[] {
  const mode = getPersonSortMode()

  if (mode === 'billing') {
    return [...entries].sort((a, b) => a.billing - b.billing)
  }

  const maxPop = Math.max(...entries.map(e => (e.item.popularity as number | undefined) ?? 0), FLOOR)

  type Scored = { entry: PersonCreditEntry; score: number }
  const scored: Scored[] = entries.map(e => {
    const normVote = ((e.item.vote_average as number | undefined) ?? 0) / 10
    const normPop  = ((e.item.popularity  as number | undefined) ?? 0) / maxPop
    const normBill = 1 / (1 + e.billing)

    let score: number
    switch (mode) {
      case 'harmonic':
        score = hm2(normVote, normPop)
        break
      case 'decay':
        score = hm2(normVote, normPop) * (1 / (1 + DECAY_K * e.billing))
        break
      case 'three-way':
        score = hm3(normVote, normPop, normBill)
        break
      case 'geometric':
        score = Math.pow(Math.max(normVote, FLOOR), GEO_VOTE) *
                Math.pow(Math.max(normPop,  FLOOR), GEO_POP)  *
                Math.pow(Math.max(normBill, FLOOR), GEO_BILL)
        break
    }

    return { entry: e, score: score! }
  })

  return scored.sort((a, b) => b.score - a.score).map(s => s.entry)
}
