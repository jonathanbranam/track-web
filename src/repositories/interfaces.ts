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
