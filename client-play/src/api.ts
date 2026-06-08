import { authApi } from '@repo/auth'
import type { Trip, PuttRound, PuttScore, PuttMember } from './types'

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, ...(body as object) }
  return body as T
}

export const api = {
  auth: authApi,
  trips: {
    current: () => fetchApi<{ trip: Trip }>('/api/trips/current'),
  },
  putt: {
    rounds: (tripId: number) =>
      fetchApi<{ rounds: PuttRound[] }>(`/api/trips/${tripId}/putt/rounds`),
    createRound: (tripId: number, name = '') =>
      fetchApi<{ round: PuttRound }>(`/api/trips/${tripId}/putt/rounds`, {
        method: 'POST', body: JSON.stringify({ name }),
      }),
    deleteRound: (tripId: number, roundId: number) =>
      fetchApi<{ ok: boolean }>(`/api/trips/${tripId}/putt/rounds/${roundId}`, { method: 'DELETE' }),
    scores: (tripId: number, roundId: number) =>
      fetchApi<{ scores: PuttScore[]; members: PuttMember[] }>(`/api/trips/${tripId}/putt/rounds/${roundId}/scores`),
    setScore: (tripId: number, roundId: number, userId: number, hole: number, strokes: number) =>
      fetchApi<{ score: PuttScore }>(`/api/trips/${tripId}/putt/rounds/${roundId}/scores`, {
        method: 'PUT', body: JSON.stringify({ userId, hole, strokes }),
      }),
  },
}
