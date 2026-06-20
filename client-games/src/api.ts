export interface LeaderboardEntry {
  rank: number
  playerName: string
  score: number
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export async function submitScore(
  gameSlug: string,
  mode: string,
  level: string,
  score: number,
): Promise<void> {
  try {
    await fetchApi('/api/scores', {
      method: 'POST',
      body: JSON.stringify({ gameSlug, mode, level, score }),
    })
  } catch {
    // fire-and-forget — submission failure is silently ignored
  }
}

export async function fetchLeaderboard(
  gameSlug: string,
  mode: string,
  level: string,
  limit = 10,
): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({ game: gameSlug, mode, level, limit: String(limit) })
  const data = await fetchApi<{ leaderboard: LeaderboardEntry[] }>(`/api/scores/leaderboard?${params}`)
  return data.leaderboard
}
