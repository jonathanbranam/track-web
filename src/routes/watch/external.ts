import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { distance } from 'fastest-levenshtein'
import { env } from '../../env'
import {
  applyGenreMap,
  extractReleaseYear,
  normalizeTitle,
  getCacheKey,
  readCache,
  writeCache,
} from '../../utils/tmdb'
import type { IMovieRepository, ITvRepository } from '../../repositories/interfaces'
import type { AppEnv } from '../../types'

const TMDB_BASE = 'https://api.themoviedb.org'

export interface ExternalResult {
  tmdbId: number
  title: string
  releaseYear: number | null
  runtimeMinutes: number | null
  seasonCount: number | null
  overview: string
  genres: string[]
  isDuplicate: boolean
  localTitle?: string
}

async function tmdbGet(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const qs = new URLSearchParams(params).toString()
  const url = `${TMDB_BASE}${path}${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.TMDB_API_KEY}` },
  })
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${await res.text()}`)
  return res.json()
}

function normalizeMovieResult(item: Record<string, unknown>): ExternalResult {
  const genres = Array.isArray(item.genres)
    ? (item.genres as Array<{ name: string }>).map(g => g.name)
    : Array.isArray(item.genre_ids)
      ? []
      : []
  return {
    tmdbId: item.id as number,
    title: (item.title ?? item.original_title ?? '') as string,
    releaseYear: extractReleaseYear((item.release_date ?? item.first_air_date) as string | undefined),
    runtimeMinutes: (item.runtime as number | null) ?? null,
    seasonCount: null,
    overview: (item.overview ?? '') as string,
    genres: applyGenreMap(genres),
    isDuplicate: false,
  }
}

function normalizeTvResult(item: Record<string, unknown>): ExternalResult {
  const genres = Array.isArray(item.genres)
    ? (item.genres as Array<{ name: string }>).map(g => g.name)
    : []
  return {
    tmdbId: item.id as number,
    title: (item.name ?? item.original_name ?? '') as string,
    releaseYear: extractReleaseYear((item.first_air_date) as string | undefined),
    runtimeMinutes: null,
    seasonCount: (item.number_of_seasons as number | null) ?? null,
    overview: (item.overview ?? '') as string,
    genres: applyGenreMap(genres),
    isDuplicate: false,
  }
}

function applyDuplicateDetection(results: ExternalResult[], localTitles: string[]): ExternalResult[] {
  const normalizedLocals = localTitles.map(t => ({ raw: t, normalized: normalizeTitle(t) }))
  return results.map(r => {
    const normR = normalizeTitle(r.title)
    for (const local of normalizedLocals) {
      const longer = Math.max(normR.length, local.normalized.length)
      if (longer === 0) continue
      const d = distance(normR, local.normalized)
      if (d <= 0.15 * longer) {
        return { ...r, isDuplicate: true, localTitle: local.raw }
      }
    }
    return r
  })
}

async function searchByTitle(type: 'movie' | 'tv', query: string): Promise<ExternalResult[]> {
  const endpoint = type === 'movie' ? '/3/search/movie' : '/3/search/tv'
  const data = await tmdbGet(endpoint, { query }) as { results: Record<string, unknown>[] }
  const normalizer = type === 'movie' ? normalizeMovieResult : normalizeTvResult
  return (data.results ?? []).slice(0, 50).map(normalizer)
}

async function searchByPerson(type: 'movie' | 'tv', query: string): Promise<ExternalResult[]> {
  const personData = await tmdbGet('/3/search/person', { query }) as { results: Array<{ id: number }> }
  if (!personData.results?.length) return []
  const personId = personData.results[0].id

  const creditsEndpoint = type === 'movie'
    ? `/3/person/${personId}/movie_credits`
    : `/3/person/${personId}/tv_credits`
  const credits = await tmdbGet(creditsEndpoint) as {
    cast: Array<Record<string, unknown> & { id: number; order: number }>
    crew: Array<Record<string, unknown> & { id: number; job: string }>
  }

  const byId = new Map<number, { item: Record<string, unknown>; billing: number }>()

  for (const item of credits.crew ?? []) {
    if (item.job !== 'Director') continue
    const existing = byId.get(item.id)
    if (!existing || 0 < existing.billing) byId.set(item.id, { item, billing: 0 })
  }

  for (const item of credits.cast ?? []) {
    const billing = item.order
    const existing = byId.get(item.id)
    if (!existing || billing < existing.billing) byId.set(item.id, { item, billing })
  }

  const sorted = [...byId.values()].sort((a, b) => a.billing - b.billing).slice(0, 50)
  const normalizer = type === 'movie' ? normalizeMovieResult : normalizeTvResult
  return sorted.map(({ item }) => normalizer(item))
}

export function createExternalRouter(movieRepo: IMovieRepository, tvRepo: ITvRepository) {
  const router = new Hono<AppEnv>()

  // GET /api/watch/external/search
  router.get(
    '/search',
    zValidator('query', z.object({
      type: z.enum(['movie', 'tv']),
      q: z.string().min(1),
      person: z.string().optional(),
    })),
    async (c) => {
      if (!env.TMDB_API_KEY) {
        return c.json({ error: 'TMDB_API_KEY is not configured' }, 503)
      }

      const { type, q, person } = c.req.valid('query')
      const mode = person === 'true' ? 'person' : 'title'
      const cacheKey = getCacheKey(type, mode, q)

      let results = readCache(cacheKey) as ExternalResult[] | null

      if (!results) {
        results = mode === 'person'
          ? await searchByPerson(type, q)
          : await searchByTitle(type, q)
        writeCache(cacheKey, results)
      }

      const localTitles = type === 'movie'
        ? movieRepo.listMovies().map(m => m.title)
        : tvRepo.listSeries().map(s => s.title)

      const withDuplicates = applyDuplicateDetection(results, localTitles)
      return c.json(withDuplicates)
    }
  )

  // POST /api/watch/external/import
  router.post(
    '/import',
    zValidator('json', z.object({
      type: z.enum(['movie', 'tv']),
      result: z.object({
        tmdbId: z.number(),
        title: z.string().min(1),
        releaseYear: z.number().nullable(),
        runtimeMinutes: z.number().nullable(),
        seasonCount: z.number().nullable(),
        overview: z.string(),
        genres: z.array(z.string()),
        isDuplicate: z.boolean(),
        localTitle: z.string().optional(),
      }),
    })),
    async (c) => {
      if (!env.TMDB_API_KEY) {
        return c.json({ error: 'TMDB_API_KEY is not configured' }, 503)
      }

      const userId = c.get('userId')
      const { type, result } = c.req.valid('json')

      // Resolve genre names to tag IDs
      const existingTags = movieRepo.listTags()
      const tagMap = new Map<string, number>(existingTags.map(t => [t.name.toLowerCase(), t.id]))

      const tagIds: number[] = []
      for (const genre of result.genres) {
        const key = genre.toLowerCase()
        if (tagMap.has(key)) {
          tagIds.push(tagMap.get(key)!)
        } else {
          const newTag = movieRepo.createTag(genre)
          tagMap.set(key, newTag.id)
          tagIds.push(newTag.id)
        }
      }

      if (type === 'movie') {
        const movie = movieRepo.createMovie({
          title: result.title,
          releaseYear: result.releaseYear,
          runtimeMinutes: result.runtimeMinutes,
          description: result.overview || null,
          streaming: null,
          addedByUserId: userId,
          tagIds,
        })
        return c.json(movie, 201)
      } else {
        const series = tvRepo.createSeries({
          title: result.title,
          releaseYear: result.releaseYear,
          seasonCount: result.seasonCount,
          episodeRuntimeMinutes: null,
          description: result.overview || null,
          streaming: null,
          addedByUserId: userId,
          tagIds,
        })
        return c.json(series, 201)
      }
    }
  )

  return router
}
