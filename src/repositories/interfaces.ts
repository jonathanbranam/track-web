export interface User {
  id: number
  email: string
  passwordHash: string
  displayName: string | null
  sessionNonce: string
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

export interface UserSummary {
  id: number
  email: string
  displayName: string | null
  createdAt: string
}

export interface IUserRepository {
  findByEmail(email: string): User | null
  findById(id: number): User | null
  upsert(email: string, passwordHash: string): User
  listAll(): UserSummary[]
  createUser(email: string, passwordHash: string, displayName: string | null): UserSummary
  deleteUser(id: number): boolean
  /** Updates password hash and rotates session_nonce atomically, invalidating all active sessions. */
  updatePassword(id: number, passwordHash: string): boolean
  updateDisplayName(id: number, displayName: string): boolean
  rotateSessionNonce(id: number): boolean
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

export interface TripMember {
  userId: number
  role: string
  joinedAt: string
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
  researchMarkdown: string | null
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
  startDate?: string | null
  endDate?: string | null
  infoMarkdown?: string | null
  researchMarkdown?: string | null
}

export interface UpdateTripInput {
  name?: string
  destination?: string | null
  departureNotes?: string | null
  returnNotes?: string | null
  nights?: number | null
  fullDays?: number | null
  startDate?: string | null
  endDate?: string | null
  infoMarkdown?: string | null
  researchMarkdown?: string | null
}

export interface TripDay {
  id: number
  tripId: number
  date: string       // YYYY-MM-DD
  title: string
  body: string       // markdown
  weather: string | null
}

export interface ITripDayRepository {
  listByTrip(tripId: number): TripDay[]
  upsertDay(tripId: number, date: string, data: { title?: string; body?: string; weather?: string | null }): TripDay
  generateDays(tripId: number, startDate: string, endDate: string): void
}

export interface PackingItem {
  id: number
  tripId: number
  section: string
  text: string
  position: number
  userId: number | null
}

export interface PackingMemberSummary {
  userId: number
  checked: number
  total: number
}

export interface IPackingStateRepository {
  getState(tripId: number, userId: number): Record<number, boolean>
  setState(itemId: number, userId: number, checked: boolean): void
  getSummary(tripId: number): PackingMemberSummary[]
}

export interface IPackingItemRepository {
  listByTrip(tripId: number, requestingUserId: number): PackingItem[]
  create(tripId: number, data: { section: string; text: string; position: number; userId?: number | null }): PackingItem
  update(id: number, data: { section?: string; text?: string; position?: number; userId?: number | null }): PackingItem | null
  delete(id: number): boolean
  bulkReplace(tripId: number, items: Array<{ id?: number; section: string; text: string; position: number; userId?: number | null }>): PackingItem[]
}

export interface ITripRepository {
  create(input: CreateTripInput): Trip
  list(userId: number): Trip[]
  findById(id: number): Trip | null
  findCurrent(userId: number): Trip | null
  setCurrent(userId: number, tripId: number): Trip | null
  update(id: number, data: UpdateTripInput): Trip | null
  delete(id: number): boolean

  // Membership
  isMember(tripId: number, userId: number): boolean
  getMemberRole(tripId: number, userId: number): string | null
  listMembers(tripId: number): TripMember[]
  addMember(tripId: number, userId: number, role?: string): TripMember
  removeMember(tripId: number, userId: number): boolean
}

export interface ApiToken {
  id: number
  userId: number
  tokenHash: string
  label: string
  expiresAt: string  // ISO UTC
  createdAt: string
}

export interface IApiTokenRepository {
  create(input: { userId: number; tokenHash: string; label: string; expiresAt: string }): ApiToken
  findByHash(tokenHash: string): ApiToken | null
  listByUser(userId: number): ApiToken[]
  deleteById(id: number, userId: number): boolean
}

export interface ICastRepository {
  upsertPerson(name: string, tmdbPersonId: number): Person
  upsertTitleCast(titleType: 'movie' | 'tv', titleId: number, entries: TitleCastEntry[]): void
  listCast(titleType: 'movie' | 'tv', titleId: number): CastMember[]
}

// Game lobby (multiplayer rooms)

export type RoomStatus = 'waiting' | 'active' | 'finished' | 'canceled'

export interface GameRoomPlayerSummary {
  id: number
  displayName: string
  joinOrder: number
}

export interface GameRoomWithPlayers {
  id: number
  roomCode: string
  gameSlug: string
  name: string
  status: RoomStatus
  desiredPlayers: number
  currentTurnUserId: number | null
  customDetails: unknown | null
  startedAt: string | null
  createdAt: string
  host: { id: number; displayName: string }
  players: GameRoomPlayerSummary[]
}

export interface IGameRoomRepository {
  createRoom(input: {
    gameSlug: string
    hostUserId: number
    desiredPlayers: number
    name: string
    customDetails?: unknown | null
    roomCode: string
  }): GameRoomWithPlayers
  listRooms(gameSlug: string, statuses?: RoomStatus[]): GameRoomWithPlayers[]
  getRoom(code: string): GameRoomWithPlayers | null
  addPlayer(roomId: number, userId: number, joinOrder: number): void
  setStatus(roomId: number, status: RoomStatus): GameRoomWithPlayers
  setStarted(roomId: number, startedAt: string): GameRoomWithPlayers
  roomCodeExists(code: string): boolean
  deleteRoom(code: string): void
}

// Putt-putt tracker

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

export interface IPuttRepository {
  listRounds(tripId: number): PuttRound[]
  createRound(tripId: number, name: string, createdBy: number): PuttRound
  findRound(id: number): PuttRound | null
  deleteRound(id: number): boolean
  listMembers(tripId: number): PuttMember[]
  getScores(roundId: number): PuttScore[]
  upsertScore(roundId: number, userId: number, hole: number, strokes: number): PuttScore
}

// Games leaderboard

export interface GameScore {
  id: number
  userId: number
  gameSlug: string
  mode: string
  level: string
  score: number
  achievedAt: string  // ISO UTC
}

export interface LeaderboardEntry {
  rank: number
  playerName: string
  score: number
}

export interface CreateGameScoreInput {
  userId: number
  gameSlug: string
  mode: string
  level: string
  score: number
  achievedAt: string  // ISO UTC
}

export interface IGameScoreRepository {
  submit(input: CreateGameScoreInput): GameScore
  getLeaderboard(gameSlug: string, mode: string, level: string, limit: number): LeaderboardEntry[]
}

// Per-game unit-definition scenarios (dungeon-tactics live tuning)

export interface GameScenario {
  id: string
  name: string
  isDefault: boolean
}

export interface IGameScenarioRepository {
  /** All scenarios for a game, default first then by creation order. */
  list(gameSlug: string): GameScenario[]
  /**
   * Create a named scenario whose defs are copied from `copyFromScenarioId`
   * (defaults to the current default scenario). The new scenario is NOT made
   * default. Returns the created scenario.
   */
  create(gameSlug: string, name: string, copyFromScenarioId?: string): GameScenario
  getDefault(gameSlug: string): GameScenario | null
  /**
   * Mark `scenarioId` as the default, clearing the prior default in one
   * transaction so exactly one remains. Returns the scenario, or null if it
   * does not exist.
   */
  setDefault(gameSlug: string, scenarioId: string): GameScenario | null
  exists(gameSlug: string, scenarioId: string): boolean
}

export interface IGameUnitDefRepository {
  /** Every archetype's def for a scenario, keyed by archetype. */
  getAll(gameSlug: string, scenarioId: string): Record<string, unknown>
  get(gameSlug: string, scenarioId: string, archetype: string): unknown | null
  /** Upsert one archetype's def (refreshing updated_at), leaving others intact. */
  upsert(gameSlug: string, scenarioId: string, archetype: string, def: unknown): void
  /**
   * When the game has no scenarios, create a `default` scenario (is_default = 1)
   * and seed its archetype rows from the bundled defaults. Never overwrites an
   * existing scenario.
   */
  seedDefaultIfEmpty(gameSlug: string, defaults: Record<string, unknown>): void
}

// Dungeon-tactics serialized board content (Region → Map → Encounter). The
// payloads are the validated def_json blobs; the repo returns them already
// parsed. Concrete shapes (Region / GameMap / Encounter) live in the server
// content schema module; the repo treats them opaquely as `unknown`.

export interface ContentRegion {
  id: string
  name: string
  theme: string
  order: number
  terrainTypes: string[]
}

export interface IGameContentRepository {
  /** All regions, ordered by sort_order then id. */
  listRegions(): unknown[]
  /** A region plus its ordered maps, or null if the region is unknown. */
  getRegionWithMaps(regionId: string): { region: unknown; maps: unknown[] } | null
  /** A map plus its ordered encounters, or null if the map is unknown. */
  getMapWithEncounters(mapId: string): { map: unknown; encounters: unknown[] } | null
  /**
   * The default play tree: the first region (lowest sort_order), its first map,
   * and that map's first encounter. Null when the store is empty.
   */
  getDefault(): { region: unknown; map: unknown; encounter: unknown } | null
  /**
   * Seed one Region/Map/Encounter from the bundled content when the store is
   * empty. Validates each entity through the Zod schemas before persisting and
   * never overwrites existing content.
   */
  seedDefaultIfEmpty(content: { region: unknown; map: unknown; encounter: unknown }): void
  /**
   * Create a map in `regionId`. Validates the body against the region's terrain
   * enum, assigns the next `sort_order` and a stable de-duplicated `map_id`, and
   * returns the stored map. Throws `ContentError('not-found')` when the region is
   * unknown and `ContentError('validation')` when the body fails schema/terrain
   * checks; nothing is persisted on failure.
   */
  createMap(regionId: string, map: unknown): unknown
  /**
   * Replace an existing map's authored content wholesale (size/terrain/objects/
   * spawn zones + name/order) from the validated body, keeping its id and region.
   * Throws `ContentError('not-found')` when the map is unknown and
   * `ContentError('validation')` on schema/terrain failure.
   */
  updateMap(mapId: string, map: unknown): unknown
  /**
   * Delete a map and cascade to its encounters. Throws `ContentError('not-found')`
   * when the map is unknown and `ContentError('conflict')` when it is the last
   * remaining map in its region (so `getDefault()` never returns null).
   */
  deleteMap(mapId: string): void
}
