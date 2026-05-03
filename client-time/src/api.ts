import type { TimeEntry } from './types'
import { authApi } from '@repo/auth'

interface ApiError {
  status: number
  error?: string
  message?: string
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, ...body } as ApiError
  return body as T
}

export const api = {
  auth: authApi,
  entries: {
    running: () => fetchApi<{ entry: TimeEntry | null }>('/api/time/entries/running'),
    list: (date?: string) =>
      fetchApi<{ entries: TimeEntry[] }>(
        `/api/time/entries${date ? `?date=${encodeURIComponent(date)}` : ''}`
      ),
    create: (description: string, startedAt: string) =>
      fetchApi<{ entry: TimeEntry }>('/api/time/entries', {
        method: 'POST',
        body: JSON.stringify({ description, startedAt }),
      }),
    update: (id: number, data: { description?: string; startedAt?: string; endedAt?: string }) =>
      fetchApi<{ entry: TimeEntry }>(`/api/time/entries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      fetchApi<void>(`/api/time/entries/${id}`, { method: 'DELETE' }),
  },
}
