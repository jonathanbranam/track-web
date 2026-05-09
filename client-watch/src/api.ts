import { authApi } from '@repo/auth'

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, ...body }
  return body as T
}

// --- Types ---

export interface Tag { id: number; name: string; category: string }

export interface Movie {
  id: number
  title: string
  runtimeMinutes: number | null
  description: string | null
  streaming: string | null
  addedByUserId: number
  createdAt: string
  tags: Tag[]
}

export interface MovieSeries {
  id: number
  name: string
  entries: Array<{ movieId: number; position: number; title: string }>
}

export interface UserMovie {
  userId: number
  movieId: number
  state: 'unseen' | 'watched' | 'would_watch_again'
  rating: number | null
  addedAt: string
  movie: Movie
}

export interface TvSeries {
  id: number
  title: string
  streaming: string | null
  episodeRuntimeMinutes: number | null
  seasonCount: number | null
  description: string | null
  addedByUserId: number
  createdAt: string
  tags: Tag[]
}

export interface UserTvSeries {
  userId: number
  seriesId: number
  state: 'unseen' | 'watching' | 'watched' | 'would_watch_again'
  rating: number | null
  currentSeason: number | null
  currentEpisode: number | null
  addedAt: string
  series: TvSeries
}

export interface WatchEvent {
  id: number
  title: string
  scheduledDate: string
  createdByUserId: number
  createdAt: string
  completedAt: string | null
}

export interface WatchEventInvite {
  eventId: number
  userId: number
  attendance: 'yes' | 'no' | 'maybe' | null
  displayName: string
  email: string
}

export interface WatchEventVote {
  eventId: number
  candidateId: number
  userId: number
  vote: number
}

export interface WatchEventCandidate {
  id: number
  eventId: number
  itemType: 'movie' | 'tv'
  movieId: number | null
  seriesId: number | null
  suggestedByUserId: number
  suggestedAt: string
  votes: WatchEventVote[]
  movieTitle?: string
  seriesTitle?: string
}

export interface WatchEventSelection {
  eventId: number
  candidateId: number
  episodeMode: 'latest' | 'specific' | null
  seasonFrom: number | null
  episodeFrom: number | null
  seasonTo: number | null
  episodeTo: number | null
}

export interface WatchEventDetail {
  event: WatchEvent
  invites: WatchEventInvite[]
  candidates: WatchEventCandidate[]
  selection: WatchEventSelection | null
}

// --- API ---

export const api = {
  auth: authApi,

  tags: {
    list: () => fetchApi<Tag[]>('/api/watch/tags'),
    create: (name: string) => fetchApi<Tag>('/api/watch/tags', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  },

  movies: {
    list: (params?: { q?: string; tag?: string }) => {
      const qs = new URLSearchParams()
      if (params?.q) qs.set('q', params.q)
      if (params?.tag) qs.set('tag', params.tag)
      const q = qs.toString()
      return fetchApi<Movie[]>(`/api/watch/movies${q ? `?${q}` : ''}`)
    },
    get: (id: number) => fetchApi<Movie>(`/api/watch/movies/${id}`),
    create: (data: { title: string; runtimeMinutes?: number | null; description?: string | null; streaming?: string | null; tagIds?: number[] }) =>
      fetchApi<Movie>('/api/watch/movies', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<{ title: string; runtimeMinutes: number | null; description: string | null; streaming: string | null; tagIds: number[] }>) =>
      fetchApi<Movie>(`/api/watch/movies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    series: {
      list: () => fetchApi<MovieSeries[]>('/api/watch/movies/series'),
      create: (name: string) => fetchApi<MovieSeries>('/api/watch/movies/series', {
        method: 'POST', body: JSON.stringify({ name }),
      }),
      update: (id: number, data: { name?: string; entries?: Array<{ movieId: number; position: number }> }) =>
        fetchApi<MovieSeries>(`/api/watch/movies/series/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    },

    watchlist: {
      list: () => fetchApi<UserMovie[]>('/api/watch/movies/watchlist'),
      upsert: (movieId: number, data: { state: UserMovie['state']; rating?: number | null }) =>
        fetchApi<UserMovie>(`/api/watch/movies/watchlist/${movieId}`, { method: 'PUT', body: JSON.stringify(data) }),
      remove: (movieId: number) => fetchApi<{ ok: boolean }>(`/api/watch/movies/watchlist/${movieId}`, { method: 'DELETE' }),
    },
  },

  tv: {
    list: (params?: { q?: string; tag?: string }) => {
      const qs = new URLSearchParams()
      if (params?.q) qs.set('q', params.q)
      if (params?.tag) qs.set('tag', params.tag)
      const q = qs.toString()
      return fetchApi<TvSeries[]>(`/api/watch/tv${q ? `?${q}` : ''}`)
    },
    get: (id: number) => fetchApi<TvSeries>(`/api/watch/tv/${id}`),
    create: (data: { title: string; streaming?: string | null; episodeRuntimeMinutes?: number | null; seasonCount?: number | null; description?: string | null; tagIds?: number[] }) =>
      fetchApi<TvSeries>('/api/watch/tv', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<{ title: string; streaming: string | null; episodeRuntimeMinutes: number | null; seasonCount: number | null; description: string | null; tagIds: number[] }>) =>
      fetchApi<TvSeries>(`/api/watch/tv/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    watchlist: {
      list: () => fetchApi<UserTvSeries[]>('/api/watch/tv/watchlist'),
      upsert: (seriesId: number, data: { state: UserTvSeries['state']; rating?: number | null; currentSeason?: number | null; currentEpisode?: number | null }) =>
        fetchApi<UserTvSeries>(`/api/watch/tv/watchlist/${seriesId}`, { method: 'PUT', body: JSON.stringify(data) }),
      remove: (seriesId: number) => fetchApi<{ ok: boolean }>(`/api/watch/tv/watchlist/${seriesId}`, { method: 'DELETE' }),
    },
  },

  events: {
    list: () => fetchApi<WatchEvent[]>('/api/watch/events'),
    get: (id: number) => fetchApi<WatchEventDetail>(`/api/watch/events/${id}`),
    create: (data: { title: string; scheduledDate: string; invitees: Array<{ type: 'user'; userId: number } | { type: 'group'; groupId: number }> }) =>
      fetchApi<WatchEvent>('/api/watch/events', { method: 'POST', body: JSON.stringify(data) }),
    rsvp: (id: number, attendance: 'yes' | 'no' | 'maybe') =>
      fetchApi<{ ok: boolean }>(`/api/watch/events/${id}/attendance`, { method: 'PUT', body: JSON.stringify({ attendance }) }),
    addCandidate: (id: number, data: { movieId?: number; seriesId?: number }) =>
      fetchApi<WatchEventCandidate>(`/api/watch/events/${id}/candidates`, { method: 'POST', body: JSON.stringify(data) }),
    vote: (id: number, candidateId: number, vote: number) =>
      fetchApi<{ ok: boolean }>(`/api/watch/events/${id}/candidates/${candidateId}/vote`, { method: 'POST', body: JSON.stringify({ vote }) }),
    setSelection: (id: number, data: { candidateId: number; episodeMode?: 'latest' | 'specific' | null; seasonFrom?: number | null; episodeFrom?: number | null; seasonTo?: number | null; episodeTo?: number | null }) =>
      fetchApi<{ ok: boolean }>(`/api/watch/events/${id}/selection`, { method: 'PUT', body: JSON.stringify(data) }),
    complete: (id: number) =>
      fetchApi<{ ok: boolean }>(`/api/watch/events/${id}/complete`, { method: 'POST' }),
    addInvitees: (id: number, invitees: Array<{ type: 'user'; userId: number } | { type: 'group'; groupId: number }>) =>
      fetchApi<{ ok: boolean }>(`/api/watch/events/${id}/invitees`, { method: 'POST', body: JSON.stringify({ invitees }) }),
    removeInvitee: (id: number, userId: number) =>
      fetchApi<{ ok: boolean }>(`/api/watch/events/${id}/invitees/${userId}`, { method: 'DELETE' }),
  },
}
