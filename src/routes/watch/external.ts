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
  readQueryCache,
  writeQueryCache,
  upsertTitleCache,
  loadTitleCache,
  readGenreCache,
  writeGenreCache,
} from '../../utils/tmdb'
import type { IMovieRepository, ITvRepository, ICastRepository, TitleCastEntry } from '../../repositories/interfaces'
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

function resolveGenres(item: Record<string, unknown>, genreMap: Record<number, string>): string[] {
  if (Array.isArray(item.genres)) {
    return (item.genres as Array<{ name: string }>).map(g => g.name)
  }
  if (Array.isArray(item.genre_ids)) {
    return (item.genre_ids as number[]).map(id => genreMap[id]).filter(Boolean) as string[]
  }
  return []
}

function normalizeMovieResult(genreMap: Record<number, string>, item: Record<string, unknown>): ExternalResult {
  return {
    tmdbId: item.id as number,
    title: (item.title ?? item.original_title ?? '') as string,
    releaseYear: extractReleaseYear((item.release_date ?? item.first_air_date) as string | undefined),
    runtimeMinutes: (item.runtime as number | null) ?? null,
    seasonCount: null,
    overview: (item.overview ?? '') as string,
    genres: applyGenreMap(resolveGenres(item, genreMap)),
    isDuplicate: false,
  }
}

function normalizeTvResult(genreMap: Record<number, string>, item: Record<string, unknown>): ExternalResult {
  return {
    tmdbId: item.id as number,
    title: (item.name ?? item.original_name ?? '') as string,
    releaseYear: extractReleaseYear((item.first_air_date) as string | undefined),
    runtimeMinutes: null,
    seasonCount: (item.number_of_seasons as number | null) ?? null,
    overview: (item.overview ?? '') as string,
    genres: applyGenreMap(resolveGenres(item, genreMap)),
    isDuplicate: false,
  }
}

async function fetchGenreMap(type: 'movie' | 'tv'): Promise<Record<number, string>> {
  const cached = readGenreCache(type)
  if (cached) return cached
  const endpoint = type === 'movie' ? '/3/genre/movie/list' : '/3/genre/tv/list'
  const data = await tmdbGet(endpoint) as { genres: Array<{ id: number; name: string }> }
  const map: Record<number, string> = {}
  for (const g of data.genres ?? []) map[g.id] = g.name
  writeGenreCache(type, map)
  return map
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

async function searchByTitle(type: 'movie' | 'tv', query: string, genreMap: Record<number, string>): Promise<ExternalResult[]> {
  const endpoint = type === 'movie' ? '/3/search/movie' : '/3/search/tv'
  const data = await tmdbGet(endpoint, { query }) as { results: Record<string, unknown>[] }
  const normalizer = (item: Record<string, unknown>) =>
    type === 'movie' ? normalizeMovieResult(genreMap, item) : normalizeTvResult(genreMap, item)
  return (data.results ?? []).slice(0, 50).map(normalizer)
}

async function searchByPerson(type: 'movie' | 'tv', query: string, genreMap: Record<number, string>): Promise<ExternalResult[]> {
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
  const normalizer = (item: Record<string, unknown>) =>
    type === 'movie' ? normalizeMovieResult(genreMap, item) : normalizeTvResult(genreMap, item)
  return sorted.map(({ item }) => normalizer(item))
}

async function storeCast(
  castRepo: ICastRepository,
  titleType: 'movie' | 'tv',
  titleId: number,
  tmdbId: number
): Promise<void> {
  const endpoint = titleType === 'movie'
    ? `/3/movie/${tmdbId}/credits`
    : `/3/tv/${tmdbId}/credits`
  const credits = await tmdbGet(endpoint) as {
    crew: Array<{ id: number; name: string; job: string }>
    cast: Array<{ id: number; name: string; order: number }>
  }

  const entries: TitleCastEntry[] = []

  const director = (credits.crew ?? []).find(c => c.job === 'Director')
  if (director) {
    const person = castRepo.upsertPerson(director.name, director.id)
    entries.push({ personId: person.id, role: 'director', billingOrder: 0 })
  }

  const topCast = [...(credits.cast ?? [])].sort((a, b) => a.order - b.order).slice(0, 30)
  for (const member of topCast) {
    const person = castRepo.upsertPerson(member.name, member.id)
    entries.push({ personId: person.id, role: 'cast', billingOrder: member.order })
  }

  castRepo.upsertTitleCast(titleType, titleId, entries)
}

export function createExternalRouter(movieRepo: IMovieRepository, tvRepo: ITvRepository, castRepo: ICastRepository) {
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

      let results: ExternalResult[] | null = null
      const cachedIds = readQueryCache(cacheKey)
      if (cachedIds) {
        results = loadTitleCache(cachedIds) as ExternalResult[]
      }

      if (!results) {
        const genreMap = await fetchGenreMap(type)
        results = mode === 'person'
          ? await searchByPerson(type, q, genreMap)
          : await searchByTitle(type, q, genreMap)
        for (const r of results) {
          upsertTitleCache(r.tmdbId, r)
        }
        writeQueryCache(cacheKey, results.map(r => r.tmdbId))
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

      // Fetch full TMDB details to get runtime (not available in search results)
      let runtimeMinutes = result.runtimeMinutes
      let episodeRuntimeMinutes: number | null = null
      let seasonCount = result.seasonCount
      try {
        if (type === 'movie') {
          const details = await tmdbGet(`/3/movie/${result.tmdbId}`) as { runtime?: number }
          if (typeof details.runtime === 'number') runtimeMinutes = details.runtime
        } else {
          const details = await tmdbGet(`/3/tv/${result.tmdbId}`) as {
            episode_run_time?: number[]
            number_of_seasons?: number
          }
          if (details.episode_run_time?.[0]) episodeRuntimeMinutes = details.episode_run_time[0]
          if (typeof details.number_of_seasons === 'number') seasonCount = details.number_of_seasons
        }
      } catch {
        // proceed with cached values
      }

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
          runtimeMinutes,
          tmdbId: result.tmdbId,
          description: result.overview || null,
          streaming: null,
          addedByUserId: userId,
          tagIds,
        })
        try {
          await storeCast(castRepo, 'movie', movie.id, result.tmdbId)
        } catch {
          // best-effort: credits failure does not fail the import
        }
        return c.json(movie, 201)
      } else {
        const series = tvRepo.createSeries({
          title: result.title,
          releaseYear: result.releaseYear,
          seasonCount,
          tmdbId: result.tmdbId,
          episodeRuntimeMinutes,
          description: result.overview || null,
          streaming: null,
          addedByUserId: userId,
          tagIds,
        })
        try {
          await storeCast(castRepo, 'tv', series.id, result.tmdbId)
        } catch {
          // best-effort: credits failure does not fail the import
        }
        return c.json(series, 201)
      }
    }
  )

  return router
}
