export interface PackingItem {
  id: number
  tripId: number
  section: string
  text: string
  position: number
  userId: number | null
}

export interface TripDay {
  id: number
  tripId: number
  date: string
  title: string
  body: string
  weather: string | null
}

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
  destination: string | null
  departureNotes: string | null
  returnNotes: string | null
  nights: number | null
  fullDays: number | null
  startDate: string | null
  endDate: string | null
  infoMarkdown: string | null
  isCurrent: boolean
  createdAt: string
}
