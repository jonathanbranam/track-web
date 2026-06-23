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

export const api = {
  updateDisplayName: (displayName: string) =>
    fetchApi<{ displayName: string }>('/api/users/me/display-name', {
      method: 'PUT',
      body: JSON.stringify({ displayName }),
    }),
  updatePassword: (currentPassword: string, newPassword: string) =>
    fetch('/api/users/me/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
}
