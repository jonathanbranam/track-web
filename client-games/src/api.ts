export interface LeaderboardEntry {
  rank: number
  playerName: string
  score: number
}

export interface RoomPlayer {
  id: number
  displayName: string
  joinOrder: number
}

export interface GameRoom {
  id: number
  roomCode: string
  gameSlug: string
  name: string
  status: 'waiting' | 'active' | 'finished' | 'canceled'
  desiredPlayers: number
  currentTurnUserId: number | null
  customDetails: unknown | null
  startedAt: string | null
  createdAt: string
  host: { id: number; displayName: string }
  players: RoomPlayer[]
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

export async function listRooms(gameSlug: string): Promise<GameRoom[]> {
  return fetchApi<GameRoom[]>(`/api/games/rooms?slug=${encodeURIComponent(gameSlug)}`)
}

export async function getRoom(code: string): Promise<GameRoom> {
  return fetchApi<GameRoom>(`/api/games/rooms/${code}`)
}

export async function createRoom(gameSlug: string, desiredPlayers: number, name: string): Promise<GameRoom> {
  return fetchApi<GameRoom>('/api/games/rooms', {
    method: 'POST',
    body: JSON.stringify({ gameSlug, desiredPlayers, name }),
  })
}

export async function joinRoom(code: string): Promise<GameRoom> {
  return fetchApi<GameRoom>(`/api/games/rooms/${code}/join`, { method: 'POST' })
}

export async function startRoom(code: string): Promise<GameRoom> {
  return fetchApi<GameRoom>(`/api/games/rooms/${code}/start`, { method: 'POST' })
}

export async function cancelRoom(code: string): Promise<GameRoom> {
  return fetchApi<GameRoom>(`/api/games/rooms/${code}/cancel`, { method: 'POST' })
}

export async function endRoom(code: string): Promise<GameRoom> {
  return fetchApi<GameRoom>(`/api/games/rooms/${code}/end`, { method: 'POST' })
}

export async function submitScore(
  gameSlug: string,
  mode: string,
  level: string,
  score: number,
): Promise<void> {
  if (score <= 0) return
  try {
    await fetchApi('/api/scores', {
      method: 'POST',
      body: JSON.stringify({ gameSlug, mode, level, score }),
    })
  } catch {
    // submission failure is silently ignored
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
