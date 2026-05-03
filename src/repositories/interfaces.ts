export interface User {
  id: number
  email: string
  passwordHash: string
}

export interface TimeEntry {
  id: number
  userId: number
  appId: string
  description: string
  tags: string
  startedAt: string   // ISO UTC
  endedAt: string | null  // ISO UTC, null = running
  createdAt: string
}

export interface CreateEntryInput {
  userId: number
  appId: string
  description: string
  tags: string
  startedAt: string
}

export interface IUserRepository {
  findByEmail(email: string): User | null
  upsert(email: string, passwordHash: string): User
}

export interface IEntryRepository {
  create(input: CreateEntryInput): TimeEntry
  findById(id: number): TimeEntry | null
  getRunning(userId: number): TimeEntry | null
  getLatestEnded(userId: number): TimeEntry | null
  update(id: number, data: { startedAt?: string; endedAt?: string; description?: string; tags?: string }): TimeEntry | null
  delete(id: number): boolean
  listByDay(userId: number, startUtc: string, endUtc: string): TimeEntry[]
  getPreviousEntry(userId: number, entryId: number): TimeEntry | null
  getNextEntry(userId: number, entryId: number): TimeEntry | null
}
