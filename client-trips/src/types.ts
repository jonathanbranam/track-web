export interface TripDay {
  id: number
  tripId: number
  date: string
  title: string
  body: string
  weather: string | null
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
