export interface User {
  id: number
  email: string
  passwordHash: string
  displayName: string | null
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
  findById(id: number): User | null
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

// Social types

export interface SocialUser {
  id: number
  email: string
  displayName: string
}

export interface Connection {
  user: SocialUser
  connectedAt: string
}

export interface InviteCode {
  id: number
  code: string
  createdByUserId: number
  createdAt: string
  expiresAt: string
  usedByUserId: number | null
  usedAt: string | null
}

export interface ConnectionRequest {
  id: number
  fromUserId: number
  toUserId: number
  createdAt: string
  expiresAt: string
  respondedAt: string | null
  status: 'pending' | 'accepted' | 'declined'
}

export interface ConnectionRequestWithUser extends ConnectionRequest {
  user: SocialUser
}

export interface Group {
  id: number
  name: string
  description: string | null
  createdByUserId: number
  createdAt: string
}

export interface GroupMember {
  id: number
  email: string
  displayName: string
  connected: boolean
}

export interface ISocialRepository {
  // Connections
  getConnections(userId: number): Connection[]
  isConnected(userA: number, userB: number): boolean
  createConnection(userA: number, userB: number): void
  deleteConnection(userA: number, userB: number): boolean

  // Invite codes
  createInviteCode(userId: number, code: string, expiresAt: string): InviteCode
  listInviteCodes(userId: number): InviteCode[]
  getInviteCodeByToken(code: string): InviteCode | null
  markCodeUsed(codeId: number, usedByUserId: number, usedAt: string): void
  deleteInviteCode(codeId: number): boolean

  // Connection requests
  createRequest(fromUserId: number, toUserId: number, expiresAt: string): ConnectionRequest
  getActiveRequest(fromUserId: number, toUserId: number): ConnectionRequest | null
  pruneStaleRequests(fromUserId: number, toUserId: number): void
  getPendingIncoming(userId: number): ConnectionRequestWithUser[]
  getSentRequests(userId: number): ConnectionRequestWithUser[]
  respondToRequest(requestId: number, status: 'accepted' | 'declined', respondedAt: string): ConnectionRequest | null

  // Groups
  createGroup(name: string, description: string | null, createdByUserId: number): Group
  getGroup(groupId: number): Group | null
  listGroupsForUser(userId: number): Group[]
  updateGroup(groupId: number, data: { name?: string; description?: string | null }): Group | null
  deleteGroup(groupId: number): void

  // Group membership
  addMember(groupId: number, userId: number): void
  removeMember(groupId: number, userId: number): void
  isMember(groupId: number, userId: number): boolean
  getMembersWithConnectionStatus(groupId: number, requestingUserId: number): GroupMember[]

  // User queries
  getConnectableUsers(userId: number): SocialUser[]
  getVisibleCoMembers(userId: number): SocialUser[]

  // Shared group check
  shareAGroup(userA: number, userB: number): boolean
}

// Watch app types

export interface Tag {
  id: number
  name: string
  category: string
}

export interface Movie {
  id: number
  title: string
  runtimeMinutes: number | null
  description: string | null
  streaming: string | null
  addedByUserId: number
  createdAt: string
  tags: Tag[]
}

export interface MovieSeries {
  id: number
  name: string
  entries: Array<{ movieId: number; position: number; title: string }>
}

export interface UserMovie {
  userId: number
  movieId: number
  state: 'unseen' | 'watched' | 'would_watch_again'
  rating: number | null
  addedAt: string
  movie: Movie
}

export interface TvSeries {
  id: number
  title: string
  streaming: string | null
  episodeRuntimeMinutes: number | null
  addedByUserId: number
  createdAt: string
  tags: Tag[]
}

export interface UserTvSeries {
  userId: number
  seriesId: number
  state: 'unseen' | 'watching' | 'watched' | 'would_watch_again'
  rating: number | null
  currentSeason: number | null
  currentEpisode: number | null
  addedAt: string
  series: TvSeries
}

export interface WatchEvent {
  id: number
  title: string
  scheduledDate: string
  createdByUserId: number
  createdAt: string
  completedAt: string | null
}

export interface WatchEventInvite {
  eventId: number
  userId: number
  attendance: 'yes' | 'no' | 'maybe' | null
}

export interface WatchEventCandidate {
  id: number
  eventId: number
  itemType: 'movie' | 'tv'
  movieId: number | null
  seriesId: number | null
  suggestedByUserId: number
  suggestedAt: string
}

export interface WatchEventVote {
  eventId: number
  candidateId: number
  userId: number
  vote: number
}

export interface WatchEventSelection {
  eventId: number
  candidateId: number
  episodeMode: 'latest' | 'specific' | null
  seasonFrom: number | null
  episodeFrom: number | null
  seasonTo: number | null
  episodeTo: number | null
}

export interface IMovieRepository {
  // Tags
  listTags(): Tag[]
  createTag(name: string): Tag

  // Catalog
  listMovies(q?: string, tag?: string): Movie[]
  getMovie(id: number): Movie | null
  createMovie(data: {
    title: string
    runtimeMinutes?: number | null
    description?: string | null
    streaming?: string | null
    addedByUserId: number
    tagIds?: number[]
  }): Movie
  updateMovie(id: number, data: {
    title?: string
    runtimeMinutes?: number | null
    description?: string | null
    streaming?: string | null
    tagIds?: number[]
  }): Movie | null

  // Series
  listSeries(): MovieSeries[]
  createSeries(name: string): MovieSeries
  updateSeries(id: number, data: {
    name?: string
    entries?: Array<{ movieId: number; position: number }>
  }): MovieSeries | null

  // Watchlist
  getWatchlist(userId: number): UserMovie[]
  upsertWatchlistEntry(userId: number, movieId: number, data: {
    state: 'unseen' | 'watched' | 'would_watch_again'
    rating?: number | null
  }): UserMovie
  deleteWatchlistEntry(userId: number, movieId: number): boolean
  seedWatchlistRating(userId: number, movieId: number, vote: number): void
  applyWatchedTransition(userId: number, movieId: number): void
}

export interface ITvRepository {
  // Catalog
  listSeries(q?: string, tag?: string): TvSeries[]
  getSeries(id: number): TvSeries | null
  createSeries(data: {
    title: string
    streaming?: string | null
    episodeRuntimeMinutes?: number | null
    addedByUserId: number
    tagIds?: number[]
  }): TvSeries
  updateSeries(id: number, data: {
    title?: string
    streaming?: string | null
    episodeRuntimeMinutes?: number | null
    tagIds?: number[]
  }): TvSeries | null

  // Watchlist
  getWatchlist(userId: number): UserTvSeries[]
  upsertWatchlistEntry(userId: number, seriesId: number, data: {
    state: 'unseen' | 'watching' | 'watched' | 'would_watch_again'
    rating?: number | null
    currentSeason?: number | null
    currentEpisode?: number | null
  }): UserTvSeries
  deleteWatchlistEntry(userId: number, seriesId: number): boolean
  seedWatchlistRating(userId: number, seriesId: number, vote: number): void
  applyWatchingTransition(userId: number, seriesId: number, seasonTo: number | null, episodeTo: number | null): void
}

export interface IWatchEventRepository {
  listEvents(userId: number): WatchEvent[]
  getEvent(id: number): WatchEvent | null
  createEvent(data: {
    title: string
    scheduledDate: string
    createdByUserId: number
    inviteeUserIds: number[]
  }): WatchEvent
  getEventDetail(id: number): {
    event: WatchEvent
    invites: Array<WatchEventInvite & { displayName: string; email: string }>
    candidates: Array<WatchEventCandidate & { votes: WatchEventVote[]; movieTitle?: string; seriesTitle?: string }>
    selection: WatchEventSelection | null
  } | null

  // Invites
  isInvited(eventId: number, userId: number): boolean
  upsertAttendance(eventId: number, userId: number, attendance: 'yes' | 'no' | 'maybe'): void

  // Candidates
  addCandidate(eventId: number, data: {
    itemType: 'movie' | 'tv'
    movieId?: number | null
    seriesId?: number | null
    suggestedByUserId: number
  }): WatchEventCandidate
  getCandidate(id: number): WatchEventCandidate | null

  // Votes
  upsertVote(eventId: number, candidateId: number, userId: number, vote: number): void

  // Selection
  upsertSelection(eventId: number, data: {
    candidateId: number
    episodeMode?: 'latest' | 'specific' | null
    seasonFrom?: number | null
    episodeFrom?: number | null
    seasonTo?: number | null
    episodeTo?: number | null
  }): void
  getSelection(eventId: number): WatchEventSelection | null

  // Completion
  completeEvent(eventId: number, completedAt: string): void
  getYesRsvpUserIds(eventId: number): number[]
  getGroupMembers(groupId: number): number[]
}
