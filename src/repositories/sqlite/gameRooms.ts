import type Database from 'better-sqlite3'
import type {
  IGameRoomRepository,
  GameRoomWithPlayers,
  GameRoomPlayerSummary,
  RoomStatus,
} from '../interfaces'

// 6-char code from A-Z (no O, I) plus 2-9 — 32 chars total
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

interface GameRoomRow {
  id: number
  room_code: string
  game_slug: string
  name: string
  host_user_id: number
  status: RoomStatus
  desired_players: number
  current_turn_user_id: number | null
  custom_details: string | null
  started_at: string | null
  created_at: string
  host_display_name: string | null
  host_email: string
}

interface PlayerRow {
  user_id: number
  join_order: number
  joined_at: string
  display_name: string | null
  email: string
}

function rowToRoom(row: GameRoomRow, players: PlayerRow[]): GameRoomWithPlayers {
  const hostDisplay = row.host_display_name ?? row.host_email.split('@')[0]
  return {
    id: row.id,
    roomCode: row.room_code,
    gameSlug: row.game_slug,
    name: row.name ?? '',
    status: row.status,
    desiredPlayers: row.desired_players,
    currentTurnUserId: row.current_turn_user_id,
    customDetails: row.custom_details ? JSON.parse(row.custom_details) : null,
    startedAt: row.started_at,
    createdAt: row.created_at,
    host: { id: row.host_user_id, displayName: hostDisplay },
    players: players.map(p => ({
      id: p.user_id,
      displayName: p.display_name ?? p.email.split('@')[0],
      joinOrder: p.join_order,
    } satisfies GameRoomPlayerSummary)),
  }
}

const ROOM_SELECT = `
  SELECT
    gr.id, gr.room_code, gr.game_slug, gr.name, gr.host_user_id, gr.status,
    gr.desired_players, gr.current_turn_user_id, gr.custom_details,
    gr.started_at, gr.created_at,
    u.display_name AS host_display_name, u.email AS host_email
  FROM game_rooms gr
  JOIN users u ON u.id = gr.host_user_id
`

export class SqliteGameRoomRepository implements IGameRoomRepository {
  constructor(private db: Database.Database) {}

  private getPlayers(roomId: number): PlayerRow[] {
    return this.db
      .prepare(
        `SELECT grp.user_id, grp.join_order, grp.joined_at, u.display_name, u.email
         FROM game_room_players grp
         JOIN users u ON u.id = grp.user_id
         WHERE grp.room_id = ?
         ORDER BY grp.join_order`
      )
      .all(roomId) as PlayerRow[]
  }

  roomCodeExists(code: string): boolean {
    const row = this.db
      .prepare('SELECT id FROM game_rooms WHERE room_code = ?')
      .get(code)
    return row != null
  }

  createRoom(input: {
    gameSlug: string
    hostUserId: number
    desiredPlayers: number
    name: string
    customDetails?: unknown | null
    roomCode: string
  }): GameRoomWithPlayers {
    return this.db.transaction(() => {
      const customDetailsJson = input.customDetails != null
        ? JSON.stringify(input.customDetails)
        : null
      const result = this.db
        .prepare(
          `INSERT INTO game_rooms (room_code, game_slug, host_user_id, desired_players, name, custom_details)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(input.roomCode, input.gameSlug, input.hostUserId, input.desiredPlayers, input.name, customDetailsJson)
      const roomId = Number(result.lastInsertRowid)
      this.db
        .prepare(
          `INSERT INTO game_room_players (room_id, user_id, join_order) VALUES (?, ?, 1)`
        )
        .run(roomId, input.hostUserId)
      return this.getRoomById(roomId)!
    })()
  }

  private getRoomById(id: number): GameRoomWithPlayers | null {
    const row = this.db
      .prepare(`${ROOM_SELECT} WHERE gr.id = ?`)
      .get(id) as GameRoomRow | undefined
    if (!row) return null
    return rowToRoom(row, this.getPlayers(id))
  }

  getRoom(code: string): GameRoomWithPlayers | null {
    const row = this.db
      .prepare(`${ROOM_SELECT} WHERE gr.room_code = ?`)
      .get(code) as GameRoomRow | undefined
    if (!row) return null
    return rowToRoom(row, this.getPlayers(row.id))
  }

  listRooms(gameSlug: string, statuses: RoomStatus[] = ['waiting', 'active', 'finished']): GameRoomWithPlayers[] {
    const placeholders = statuses.map(() => '?').join(',')
    const rows = this.db
      .prepare(
        `${ROOM_SELECT} WHERE gr.game_slug = ? AND gr.status IN (${placeholders})
         ORDER BY gr.created_at DESC`
      )
      .all(gameSlug, ...statuses) as GameRoomRow[]
    return rows.map(row => rowToRoom(row, this.getPlayers(row.id)))
  }

  addPlayer(roomId: number, userId: number, joinOrder: number): void {
    this.db
      .prepare(
        `INSERT INTO game_room_players (room_id, user_id, join_order) VALUES (?, ?, ?)`
      )
      .run(roomId, userId, joinOrder)
  }

  setStatus(roomId: number, status: RoomStatus): GameRoomWithPlayers {
    this.db
      .prepare('UPDATE game_rooms SET status = ? WHERE id = ?')
      .run(status, roomId)
    return this.getRoomById(roomId)!
  }

  setStarted(roomId: number, startedAt: string): GameRoomWithPlayers {
    this.db
      .prepare(
        `UPDATE game_rooms SET status = 'active', started_at = ?, current_turn_user_id = NULL WHERE id = ?`
      )
      .run(startedAt, roomId)
    return this.getRoomById(roomId)!
  }

  deleteRoom(code: string): void {
    const row = this.db
      .prepare('SELECT id FROM game_rooms WHERE room_code = ?')
      .get(code) as { id: number } | undefined
    if (!row) return
    this.db.prepare('DELETE FROM game_room_players WHERE room_id = ?').run(row.id)
    this.db.prepare('DELETE FROM game_rooms WHERE id = ?').run(row.id)
  }
}
