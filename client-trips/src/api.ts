import { authApi } from '@repo/auth'
import type { Trip, TripDay, PackingItem, PuttRound, PuttScore, PuttMember } from './types'

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
  social: {
    connections: () => fetchApi<Array<{ user: { id: number; displayName: string; email: string } }>>('/api/social/connections'),
  },
  trips: {
    current: () => fetchApi<{ trip: Trip }>('/api/trips/current'),
    list: () => fetchApi<{ trips: Trip[] }>('/api/trips'),
    create: (data: { name: string; destination?: string | null; departureNotes?: string | null; returnNotes?: string | null; nights?: number | null; fullDays?: number | null }) =>
      fetchApi<{ trip: Trip }>('/api/trips', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { name?: string; destination?: string | null; departureNotes?: string | null; returnNotes?: string | null; nights?: number | null; fullDays?: number | null }) =>
      fetchApi<{ trip: Trip }>(`/api/trips/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    setCurrent: (id: number) =>
      fetchApi<{ trip: Trip }>(`/api/trips/${id}/set-current`, { method: 'PUT' }),
    delete: (id: number) =>
      fetchApi<void>(`/api/trips/${id}`, { method: 'DELETE' }),
    days: (tripId: number) =>
      fetchApi<{ days: TripDay[] }>(`/api/trips/${tripId}/days`),
    packingItems: (tripId: number) =>
      fetchApi<{ items: PackingItem[] }>(`/api/trips/${tripId}/packing/items`),
    packingState: (tripId: number) =>
      fetchApi<{ state: Record<number, boolean> }>(`/api/trips/${tripId}/packing/state`),
    setPackingState: (tripId: number, itemId: number, checked: boolean) =>
      fetchApi<{ ok: boolean }>(`/api/trips/${tripId}/packing/state`, {
        method: 'PUT',
        body: JSON.stringify({ itemId, checked }),
      }),
    packingSummary: (tripId: number) =>
      fetchApi<{ members: Array<{ userId: number; checked: number; total: number }> }>(`/api/trips/${tripId}/packing/summary`),
    createPackingItem: (tripId: number, text: string, userId?: number, section = '') =>
      fetchApi<{ item: PackingItem }>(`/api/trips/${tripId}/packing/items`, {
        method: 'POST',
        body: JSON.stringify({ text, section, position: 0, ...(userId !== undefined && { userId }) }),
      }),
    deletePackingItem: (tripId: number, itemId: number) =>
      fetchApi<void>(`/api/trips/${tripId}/packing/items/${itemId}`, { method: 'DELETE' }),
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
