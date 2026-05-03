export interface TimeEntry {
  id: number
  userId: number
  description: string
  tags: string          // comma-separated, e.g. "home,maintenance"
  startedAt: string     // ISO UTC
  endedAt: string | null
  createdAt: string
}
