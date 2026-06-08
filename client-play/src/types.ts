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
