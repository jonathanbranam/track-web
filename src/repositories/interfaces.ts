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
  releaseYear: number | null
  tmdbId: number | null
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
  seasonCount: number | null
  releaseYear: number | null
  tmdbId: number | null
  description: string | null
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

export interface RatingItem {
  id: number
  mediaType: 'movie' | 'tv'
  title: string
  year: number | null
  streaming: string | null
  rating: number | null
  seen: boolean
  again: boolean
  watching: boolean
  season?: number | null
  episode?: number | null
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
    releaseYear?: number | null
    tmdbId?: number | null
    description?: string | null
    streaming?: string | null
    addedByUserId: number
    tagIds?: number[]
  }): Movie
  updateMovie(id: number, data: {
    title?: string
    runtimeMinutes?: number | null
    releaseYear?: number | null
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
  applyWatchedTransition(userId: number, movieId: number): void
  getMovieRatings(userId: number): RatingItem[]
  getUserMovieRating(userId: number, movieId: number): number | null
  setMovieRatingIfNull(userId: number, movieId: number, rating: number): void
}

export interface ITvRepository {
  // Catalog
  listSeries(q?: string, tag?: string): TvSeries[]
  getSeries(id: number): TvSeries | null
  createSeries(data: {
    title: string
    streaming?: string | null
    episodeRuntimeMinutes?: number | null
    seasonCount?: number | null
    releaseYear?: number | null
    tmdbId?: number | null
    description?: string | null
    addedByUserId: number
    tagIds?: number[]
  }): TvSeries
  updateSeries(id: number, data: {
    title?: string
    streaming?: string | null
    episodeRuntimeMinutes?: number | null
    seasonCount?: number | null
    releaseYear?: number | null
    description?: string | null
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
  applyWatchingTransition(userId: number, seriesId: number, seasonTo: number | null, episodeTo: number | null): void
  getTvRatings(userId: number): RatingItem[]
  getUserTvRating(userId: number, seriesId: number): number | null
  setTvRatingIfNull(userId: number, seriesId: number, rating: number): void
}

export interface IWatchEventRepository {
  listEvents(userId: number, filter?: 'active' | 'completed-recent'): WatchEvent[]
  getEvent(id: number): WatchEvent | null
  deleteEvent(id: number): void
  clearSelection(eventId: number): void
  reopenEvent(eventId: number): void
  patchEvent(id: number, data: { title?: string; scheduledDate?: string }): WatchEvent
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
  addInvitee(eventId: number, userId: number): void
  removeInvitee(eventId: number, userId: number): boolean

  // Candidates
  addCandidate(eventId: number, data: {
    itemType: 'movie' | 'tv'
    movieId?: number | null
    seriesId?: number | null
    suggestedByUserId: number
  }): WatchEventCandidate
  getCandidate(id: number): WatchEventCandidate | null
  removeCandidate(candidateId: number): void

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
  getAllInviteeUserIds(eventId: number): number[]
  getVotesForCandidate(candidateId: number): Array<{ userId: number; vote: number }>
}

export interface Person {
  id: number
  name: string
  tmdbPersonId: number
}

export interface TitleCastEntry {
  personId: number
  role: 'cast' | 'director'
  billingOrder: number
}

export interface CastMember {
  name: string
  tmdbPersonId: number
  role: 'cast' | 'director'
  billingOrder: number
}

// Trips app types

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

export interface CreateTripInput {
  userId: number
  name: string
  destination?: string | null
  departureNotes?: string | null
  returnNotes?: string | null
  nights?: number | null
  fullDays?: number | null
}

export interface UpdateTripInput {
  name?: string
  destination?: string | null
  departureNotes?: string | null
  returnNotes?: string | null
  nights?: number | null
  fullDays?: number | null
}

export interface ITripRepository {
  create(input: CreateTripInput): Trip
  list(userId: number): Trip[]
  findById(id: number): Trip | null
  findCurrent(userId: number): Trip | null
  setCurrent(userId: number, tripId: number): Trip | null
  update(id: number, data: UpdateTripInput): Trip | null
  delete(id: number): boolean
}

export interface ICastRepository {
  upsertPerson(name: string, tmdbPersonId: number): Person
  upsertTitleCast(titleType: 'movie' | 'tv', titleId: number, entries: TitleCastEntry[]): void
  listCast(titleType: 'movie' | 'tv', titleId: number): CastMember[]
}
