import { authApi } from '@repo/auth'
import type {
  Trip, PuttRound, PuttScore, PuttMember,
  ScoreGame, ConnectedUser, NewPlayer,
} from './types'

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
  social: {
    connectable: () => fetchApi<ConnectedUser[]>('/api/social/users/connectable'),
  },
  gameNames: {
    list: () => fetchApi<{ names: string[] }>('/api/play/game-names'),
  },
  scoreGames: {
    list: () => fetchApi<{ games: ScoreGame[] }>('/api/play/score-games'),
    get: (id: number) =>
      fetchApi<{ game: ScoreGame }>(`/api/play/score-games/${id}`),
    create: (name: string, targetRounds: number | null, players: NewPlayer[]) =>
      fetchApi<{ game: ScoreGame }>('/api/play/score-games', {
        method: 'POST', body: JSON.stringify({ name, targetRounds, players }),
      }),
    putRound: (id: number, roundNumber: number, scores: { playerId: number; value: number }[]) =>
      fetchApi<{ game: ScoreGame }>(`/api/play/score-games/${id}/rounds/${roundNumber}`, {
        method: 'PUT', body: JSON.stringify({ scores }),
      }),
    deleteRound: (id: number, roundNumber: number) =>
      fetchApi<{ game: ScoreGame }>(`/api/play/score-games/${id}/rounds/${roundNumber}`, {
        method: 'DELETE',
      }),
    complete: (id: number) =>
      fetchApi<{ game: ScoreGame }>(`/api/play/score-games/${id}/complete`, {
        method: 'POST', body: JSON.stringify({}),
      }),
    delete: (id: number) =>
      fetchApi<{ ok: boolean }>(`/api/play/score-games/${id}`, { method: 'DELETE' }),
  },
}
