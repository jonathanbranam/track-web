export interface Trip {
  id: number
  userId: number
  name: string
  destination: string | null
  departureNotes: string | null
  returnNotes: string | null
  nights: number | null
  fullDays: number | null
  isCurrent: boolean
  createdAt: string
}
