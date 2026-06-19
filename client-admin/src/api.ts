import { authApi } from '@repo/auth'

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, ...body } as { status: number; error?: string }
  return body as T
}

export interface BackupInfo {
  folder: string
  exportedAt: string
  totalRows: number
}

export const api = {
  auth: authApi,
  deploy: {
    trigger: () => fetchApi<void>('/api/deploy/trigger', { method: 'POST' }),
  },
  admin: {
    backup: () => fetchApi<{ folder: string }>('/api/admin/backup', { method: 'POST' }),
    backups: () => fetchApi<{ backups: BackupInfo[] }>('/api/admin/backups'),
    restore: (folder: string) =>
      fetchApi<{ message: string }>('/api/admin/restore', {
        method: 'POST',
        body: JSON.stringify({ folder }),
      }),
  },
}
