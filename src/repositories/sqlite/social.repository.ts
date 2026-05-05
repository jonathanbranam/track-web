import type Database from 'better-sqlite3'
import type {
  ISocialRepository,
  Connection,
  InviteCode,
  ConnectionRequest,
  ConnectionRequestWithUser,
  Group,
  GroupMember,
  SocialUser,
} from '../interfaces'

interface UserRow {
  id: number
  email: string
  display_name: string | null
}

interface ConnectionRow {
  user_id_a: number
  user_id_b: number
  connected_at: string
  id: number
  email: string
  display_name: string | null
}

interface InviteCodeRow {
  id: number
  code: string
  created_by_user_id: number
  created_at: string
  expires_at: string
  used_by_user_id: number | null
  used_at: string | null
}

interface ConnectionRequestRow {
  id: number
  from_user_id: number
  to_user_id: number
  created_at: string
  expires_at: string
  responded_at: string | null
  status: 'pending' | 'accepted' | 'declined'
}

interface ConnectionRequestWithUserRow extends ConnectionRequestRow {
  email: string
  display_name: string | null
}

interface GroupRow {
  id: number
  name: string
  description: string | null
  created_by_user_id: number
  created_at: string
}

interface GroupMemberRow {
  id: number
  email: string
  display_name: string | null
  is_connected: number
}

function normalizeIds(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a]
}

function toDisplayName(row: { email: string; display_name: string | null }): string {
  return row.display_name ?? row.email.split('@')[0]
}

function toSocialUser(row: UserRow): SocialUser {
  return { id: row.id, email: row.email, displayName: toDisplayName(row) }
}

function toInviteCode(row: InviteCodeRow): InviteCode {
  return {
    id: row.id,
    code: row.code,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    usedByUserId: row.used_by_user_id,
    usedAt: row.used_at,
  }
}

function toConnectionRequest(row: ConnectionRequestRow): ConnectionRequest {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    respondedAt: row.responded_at,
    status: row.status,
  }
}

function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  }
}

export class SqliteSocialRepository implements ISocialRepository {
  constructor(private db: Database.Database) {}

  // Connections

  getConnections(userId: number): Connection[] {
    const rows = this.db.prepare<number[]>(`
      SELECT uc.user_id_a, uc.user_id_b, uc.connected_at,
             u.id, u.email, u.display_name
      FROM user_connections uc
      JOIN users u ON u.id = CASE
        WHEN uc.user_id_a = ? THEN uc.user_id_b
        ELSE uc.user_id_a
      END
      WHERE uc.user_id_a = ? OR uc.user_id_b = ?
    `).all(userId, userId, userId) as ConnectionRow[]

    return rows.map(row => ({
      user: { id: row.id, email: row.email, displayName: toDisplayName(row) },
      connectedAt: row.connected_at,
    }))
  }

  isConnected(userA: number, userB: number): boolean {
    const [a, b] = normalizeIds(userA, userB)
    const row = this.db.prepare<[number, number]>(
      'SELECT 1 FROM user_connections WHERE user_id_a = ? AND user_id_b = ?'
    ).get(a, b)
    return row != null
  }

  createConnection(userA: number, userB: number): void {
    const [a, b] = normalizeIds(userA, userB)
    this.db.prepare<[number, number]>(
      'INSERT OR IGNORE INTO user_connections (user_id_a, user_id_b) VALUES (?, ?)'
    ).run(a, b)
  }

  deleteConnection(userA: number, userB: number): boolean {
    const [a, b] = normalizeIds(userA, userB)
    const result = this.db.prepare<[number, number]>(
      'DELETE FROM user_connections WHERE user_id_a = ? AND user_id_b = ?'
    ).run(a, b)
    return result.changes > 0
  }

  // Invite codes

  createInviteCode(userId: number, code: string, expiresAt: string): InviteCode {
    this.db.prepare<[string, number, string]>(
      'INSERT INTO user_invite_codes (code, created_by_user_id, expires_at) VALUES (?, ?, ?)'
    ).run(code, userId, expiresAt)

    const row = this.db.prepare<string>(
      'SELECT * FROM user_invite_codes WHERE code = ?'
    ).get(code) as InviteCodeRow
    return toInviteCode(row)
  }

  listInviteCodes(userId: number): InviteCode[] {
    const rows = this.db.prepare<number[]>(
      'SELECT * FROM user_invite_codes WHERE created_by_user_id = ? ORDER BY created_at DESC'
    ).all(userId) as InviteCodeRow[]
    return rows.map(toInviteCode)
  }

  getInviteCodeByToken(code: string): InviteCode | null {
    const row = this.db.prepare<string[]>(
      'SELECT * FROM user_invite_codes WHERE code = ?'
    ).get(code) as InviteCodeRow | undefined
    return row ? toInviteCode(row) : null
  }

  markCodeUsed(codeId: number, usedByUserId: number, usedAt: string): void {
    this.db.prepare<[number, string, number]>(
      'UPDATE user_invite_codes SET used_by_user_id = ?, used_at = ? WHERE id = ?'
    ).run(usedByUserId, usedAt, codeId)
  }

  deleteInviteCode(codeId: number): boolean {
    const result = this.db.prepare<number[]>(
      'DELETE FROM user_invite_codes WHERE id = ?'
    ).run(codeId)
    return result.changes > 0
  }

  // Connection requests

  createRequest(fromUserId: number, toUserId: number, expiresAt: string): ConnectionRequest {
    const result = this.db.prepare<[number, number, string]>(
      'INSERT INTO user_connection_requests (from_user_id, to_user_id, expires_at) VALUES (?, ?, ?)'
    ).run(fromUserId, toUserId, expiresAt)

    const row = this.db.prepare<number[]>(
      'SELECT * FROM user_connection_requests WHERE id = ?'
    ).get(result.lastInsertRowid as number) as ConnectionRequestRow
    return toConnectionRequest(row)
  }

  getActiveRequest(fromUserId: number, toUserId: number): ConnectionRequest | null {
    const now = new Date().toISOString()
    const row = this.db.prepare<[number, number, string]>(`
      SELECT * FROM user_connection_requests
      WHERE from_user_id = ? AND to_user_id = ?
        AND status = 'pending' AND expires_at > ?
      LIMIT 1
    `).get(fromUserId, toUserId, now) as ConnectionRequestRow | undefined
    return row ? toConnectionRequest(row) : null
  }

  pruneStaleRequests(fromUserId: number, toUserId: number): void {
    const now = new Date().toISOString()
    this.db.prepare<[number, number, string]>(`
      DELETE FROM user_connection_requests
      WHERE from_user_id = ? AND to_user_id = ?
        AND (expires_at <= ? OR status IN ('declined'))
    `).run(fromUserId, toUserId, now)
  }

  getPendingIncoming(userId: number): ConnectionRequestWithUser[] {
    const now = new Date().toISOString()
    const rows = this.db.prepare<[number, string]>(`
      SELECT ucr.*, u.email, u.display_name
      FROM user_connection_requests ucr
      JOIN users u ON u.id = ucr.from_user_id
      WHERE ucr.to_user_id = ? AND ucr.status = 'pending' AND ucr.expires_at > ?
      ORDER BY ucr.created_at DESC
    `).all(userId, now) as ConnectionRequestWithUserRow[]

    return rows.map(row => ({
      ...toConnectionRequest(row),
      user: { id: row.from_user_id, email: row.email, displayName: toDisplayName(row) },
    }))
  }

  getSentRequests(userId: number): ConnectionRequestWithUser[] {
    const now = new Date().toISOString()
    const rows = this.db.prepare<[number, string]>(`
      SELECT ucr.*, u.email, u.display_name
      FROM user_connection_requests ucr
      JOIN users u ON u.id = ucr.to_user_id
      WHERE ucr.from_user_id = ? AND ucr.status != 'accepted' AND ucr.expires_at > ?
      ORDER BY ucr.created_at DESC
    `).all(userId, now) as ConnectionRequestWithUserRow[]

    return rows.map(row => ({
      ...toConnectionRequest(row),
      // Decline is hidden from sender — reported as pending
      status: row.status === 'declined' ? 'pending' : row.status,
      user: { id: row.to_user_id, email: row.email, displayName: toDisplayName(row) },
    }))
  }

  respondToRequest(requestId: number, status: 'accepted' | 'declined', respondedAt: string): ConnectionRequest | null {
    this.db.prepare<[string, string, number]>(
      'UPDATE user_connection_requests SET status = ?, responded_at = ? WHERE id = ?'
    ).run(status, respondedAt, requestId)

    const row = this.db.prepare<number[]>(
      'SELECT * FROM user_connection_requests WHERE id = ?'
    ).get(requestId) as ConnectionRequestRow | undefined
    return row ? toConnectionRequest(row) : null
  }

  // Groups

  createGroup(name: string, description: string | null, createdByUserId: number): Group {
    const result = this.db.prepare<[string, string | null, number]>(
      'INSERT INTO groups (name, description, created_by_user_id) VALUES (?, ?, ?)'
    ).run(name, description, createdByUserId)

    const row = this.db.prepare<number[]>(
      'SELECT * FROM groups WHERE id = ?'
    ).get(result.lastInsertRowid as number) as GroupRow
    return toGroup(row)
  }

  getGroup(groupId: number): Group | null {
    const row = this.db.prepare<number[]>(
      'SELECT * FROM groups WHERE id = ?'
    ).get(groupId) as GroupRow | undefined
    return row ? toGroup(row) : null
  }

  listGroupsForUser(userId: number): Group[] {
    const rows = this.db.prepare<number[]>(`
      SELECT g.* FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = ?
      ORDER BY g.created_at DESC
    `).all(userId) as GroupRow[]
    return rows.map(toGroup)
  }

  updateGroup(groupId: number, data: { name?: string; description?: string | null }): Group | null {
    if (data.name !== undefined) {
      this.db.prepare<[string, number]>(
        'UPDATE groups SET name = ? WHERE id = ?'
      ).run(data.name, groupId)
    }
    if (data.description !== undefined) {
      this.db.prepare<[string | null, number]>(
        'UPDATE groups SET description = ? WHERE id = ?'
      ).run(data.description, groupId)
    }
    return this.getGroup(groupId)
  }

  deleteGroup(groupId: number): void {
    this.db.prepare<number[]>('DELETE FROM group_members WHERE group_id = ?').run(groupId)
    this.db.prepare<number[]>('DELETE FROM groups WHERE id = ?').run(groupId)
  }

  // Group membership

  addMember(groupId: number, userId: number): void {
    this.db.prepare<[number, number]>(
      'INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)'
    ).run(groupId, userId)
  }

  removeMember(groupId: number, userId: number): void {
    this.db.prepare<[number, number]>(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?'
    ).run(groupId, userId)
  }

  isMember(groupId: number, userId: number): boolean {
    const row = this.db.prepare<[number, number]>(
      'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?'
    ).get(groupId, userId)
    return row != null
  }

  getMembersWithConnectionStatus(groupId: number, requestingUserId: number): GroupMember[] {
    const rows = this.db.prepare<[number, number, number]>(`
      SELECT u.id, u.email, u.display_name,
        CASE WHEN (
          SELECT 1 FROM user_connections
          WHERE (user_id_a = MIN(u.id, ?) AND user_id_b = MAX(u.id, ?))
        ) IS NOT NULL THEN 1 ELSE 0 END AS is_connected
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ?
      ORDER BY u.email
    `).all(requestingUserId, requestingUserId, groupId) as GroupMemberRow[]

    return rows.map(row => ({
      id: row.id,
      email: row.email,
      displayName: toDisplayName(row),
      connected: row.is_connected === 1,
    }))
  }

  // User queries

  getConnectableUsers(userId: number): SocialUser[] {
    const rows = this.db.prepare<[number, number, number]>(`
      SELECT u.id, u.email, u.display_name
      FROM user_connections uc
      JOIN users u ON u.id = CASE
        WHEN uc.user_id_a = ? THEN uc.user_id_b
        ELSE uc.user_id_a
      END
      WHERE uc.user_id_a = ? OR uc.user_id_b = ?
      ORDER BY u.email
    `).all(userId, userId, userId) as UserRow[]
    return rows.map(toSocialUser)
  }

  getVisibleCoMembers(userId: number): SocialUser[] {
    const rows = this.db.prepare<[number, number, number, number]>(`
      SELECT DISTINCT u.id, u.email, u.display_name
      FROM group_members gm1
      JOIN group_members gm2 ON gm2.group_id = gm1.group_id AND gm2.user_id != ?
      JOIN users u ON u.id = gm2.user_id
      WHERE gm1.user_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM user_connections
          WHERE user_id_a = MIN(u.id, ?) AND user_id_b = MAX(u.id, ?)
        )
      ORDER BY u.email
    `).all(userId, userId, userId, userId) as UserRow[]
    return rows.map(toSocialUser)
  }

  shareAGroup(userA: number, userB: number): boolean {
    const row = this.db.prepare<[number, number]>(`
      SELECT 1 FROM group_members gm1
      JOIN group_members gm2 ON gm2.group_id = gm1.group_id
      WHERE gm1.user_id = ? AND gm2.user_id = ?
      LIMIT 1
    `).get(userA, userB)
    return row != null
  }
}
