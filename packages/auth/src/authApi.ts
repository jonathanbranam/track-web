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

export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<{ ok: boolean }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => fetchApi<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => fetchApi<{ userId: number }>('/api/auth/me'),
  forgot: () => fetchApi<{ message: string }>('/api/auth/forgot', { method: 'POST' }),
}
