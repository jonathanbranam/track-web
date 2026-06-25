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

export async function deleteRoom(code: string): Promise<void> {
  const res = await fetch(`/api/games/rooms/${code}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
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

// ─── Unit definitions / scenarios (dungeon-tactics live tuning) ────────────────
// `Def` is the per-archetype JSON document; callers own the concrete UnitDef
// type. A scenario is a named, full set of archetype defs; play always loads the
// default scenario.

export interface Scenario {
  id: string
  name: string
  isDefault: boolean
}

// The default scenario's defs — the play path.
export async function fetchUnitDefs<Def>(
  gameSlug: string,
): Promise<{ scenarioId: string; unitDefs: Record<string, Def> }> {
  return fetchApi(`/api/games/${gameSlug}/unit-defs`)
}

export async function listScenarios(gameSlug: string): Promise<Scenario[]> {
  const data = await fetchApi<{ scenarios: Scenario[] }>(`/api/games/${gameSlug}/scenarios`)
  return data.scenarios
}

export async function fetchScenarioUnitDefs<Def>(
  gameSlug: string,
  scenarioId: string,
): Promise<Record<string, Def>> {
  const data = await fetchApi<{ scenarioId: string; unitDefs: Record<string, Def> }>(
    `/api/games/${gameSlug}/scenarios/${encodeURIComponent(scenarioId)}/unit-defs`,
  )
  return data.unitDefs
}

export async function createScenario(
  gameSlug: string,
  name: string,
  copyFrom?: string,
): Promise<Scenario> {
  return fetchApi<Scenario>(`/api/games/${gameSlug}/scenarios`, {
    method: 'POST',
    body: JSON.stringify({ name, ...(copyFrom ? { copyFrom } : {}) }),
  })
}

export async function putUnitDefs<Def>(
  gameSlug: string,
  scenarioId: string,
  defs: Record<string, Def>,
): Promise<void> {
  await fetchApi(`/api/games/${gameSlug}/scenarios/${encodeURIComponent(scenarioId)}/unit-defs`, {
    method: 'PUT',
    body: JSON.stringify(defs),
  })
}

export async function setDefaultScenario(gameSlug: string, scenarioId: string): Promise<Scenario> {
  return fetchApi<Scenario>(`/api/games/${gameSlug}/scenarios/${encodeURIComponent(scenarioId)}/default`, {
    method: 'PUT',
  })
}

// ─── Board content (dungeon-tactics serialized Region/Map/Encounter) ────────────
// Read-only play path. `Tree` is the per-caller content tree type; callers own
// the concrete Region/Map/Encounter shapes.

export async function fetchDefaultContent<Tree>(gameSlug: string): Promise<Tree> {
  return fetchApi<Tree>(`/api/games/${gameSlug}/content/default`)
}

export async function fetchRegionWithMaps<Region, Map>(
  gameSlug: string,
  regionId: string,
): Promise<{ region: Region; maps: Map[] }> {
  return fetchApi(`/api/games/${gameSlug}/content/regions/${encodeURIComponent(regionId)}`)
}

export async function fetchMapWithEncounters<Map, Encounter>(
  gameSlug: string,
  mapId: string,
): Promise<{ map: Map; encounters: Encounter[] }> {
  return fetchApi(`/api/games/${gameSlug}/content/maps/${encodeURIComponent(mapId)}`)
}
