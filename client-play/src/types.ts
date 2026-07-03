export interface PuttRound {
  id: number
  tripId: number
  name: string
  createdBy: number
  createdAt: string
}

export interface PuttScore {
  roundId: number
  userId: number
  hole: number
  strokes: number
}

export interface PuttMember {
  userId: number
  displayName: string
  role: string
}

export interface Trip {
  id: number
  userId: number
  name: string
  isCurrent: boolean
}

// ── Score tracker ──

export interface ConnectedUser {
  id: number
  email: string
  displayName: string
}

export interface ScorePlayer {
  id: number
  gameId: number
  userId: number | null
  name: string
  position: number
}

export interface ScoreRoundScore {
  playerId: number
  roundNumber: number
  value: number
}

export interface ScoreGame {
  id: number
  userId: number
  name: string
  targetRounds: number | null // null = unlimited
  status: 'active' | 'completed'
  createdAt: string
  completedAt: string | null
  players: ScorePlayer[]
  scores: ScoreRoundScore[]
}

export interface NewPlayer {
  userId?: number | null
  name: string
}
