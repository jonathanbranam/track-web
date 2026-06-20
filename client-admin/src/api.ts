async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* non-JSON body */
    }
    throw new Error(message)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export interface UserSummary {
  id: number
  email: string
  displayName: string | null
  createdAt: string
}

export interface LogMeta {
  key: string
  file: string
  exists: boolean
  size: number
  modifiedAt: string | null
}

export interface ApiToken {
  id: number
  label: string
  createdAt: string
  expiresAt: string
}

export interface VersionInfo {
  sha: string
  commitTime: string | null
  buildTime: string | null
}

export const api = {
  deploy: () => req<void>('/api/admin/deploy', { method: 'POST' }),
  version: () => req<VersionInfo>('/api/version'),

  backups: {
    runScheduled: () => req<{ folder: string; pushed: boolean }>('/api/admin/backups/scheduled', { method: 'POST' }),
    restoreScheduled: () =>
      req<{ restored: boolean }>('/api/admin/backups/scheduled/restore', {
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      }),
    runTimestamped: () => req<{ folder: string }>('/api/admin/backups/timestamped', { method: 'POST' }),
    listTimestamped: () => req<{ backups: string[] }>('/api/admin/backups/timestamped'),
    restoreTimestamped: (name: string) =>
      req<{ restored: boolean }>(`/api/admin/backups/timestamped/${encodeURIComponent(name)}/restore`, {
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      }),
  },

  users: {
    list: () => req<{ users: UserSummary[] }>('/api/admin/users'),
    create: (email: string, password: string, displayName?: string) =>
      req<UserSummary>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      }),
    remove: (id: number) => req<void>(`/api/admin/users/${id}`, { method: 'DELETE' }),
    setPassword: (id: number, password: string) =>
      req<void>(`/api/admin/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
  },

  logs: {
    list: () => req<{ logs: LogMeta[] }>('/api/admin/logs'),
    tail: (name: string, lines = 200) =>
      req<{ name: string; content: string }>(`/api/admin/logs/${name}?lines=${lines}`),
  },

  tokens: {
    list: () => req<ApiToken[]>('/api/auth/tokens'),
    create: (label: string, days: number) =>
      req<{ id: number; label: string; expiresAt: string; token: string }>('/api/auth/tokens', {
        method: 'POST',
        body: JSON.stringify({ label, days }),
      }),
    revoke: (id: number) => req<void>(`/api/auth/tokens/${id}`, { method: 'DELETE' }),
  },
}
