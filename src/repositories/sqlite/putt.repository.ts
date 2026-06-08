import type Database from 'better-sqlite3'
import type { IPuttRepository, PuttRound, PuttScore, PuttMember } from '../interfaces'

interface PuttRoundRow {
  id: number
  trip_id: number
  name: string
  created_by: number
  created_at: string
}

interface PuttScoreRow {
  round_id: number
  user_id: number
  hole: number
  strokes: number
}

interface PuttMemberRow {
  user_id: number
  display_name: string | null
  email: string
  role: string
}

function rowToRound(row: PuttRoundRow): PuttRound {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

function rowToScore(row: PuttScoreRow): PuttScore {
  return {
    roundId: row.round_id,
    userId: row.user_id,
    hole: row.hole,
    strokes: row.strokes,
  }
}

function rowToMember(row: PuttMemberRow): PuttMember {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? row.email,
    role: row.role,
  }
}

export class SqlitePuttRepository implements IPuttRepository {
  constructor(private db: Database.Database) {}

  listRounds(tripId: number): PuttRound[] {
    const rows = this.db
      .prepare('SELECT id, trip_id, name, created_by, created_at FROM putt_rounds WHERE trip_id = ? ORDER BY created_at ASC')
      .all(tripId) as PuttRoundRow[]
    return rows.map(rowToRound)
  }

  createRound(tripId: number, name: string, createdBy: number): PuttRound {
    const result = this.db
      .prepare(`INSERT INTO putt_rounds (trip_id, name, created_by, created_at) VALUES (?, ?, ?, datetime('now'))`)
      .run(tripId, name, createdBy)
    const row = this.db
      .prepare('SELECT id, trip_id, name, created_by, created_at FROM putt_rounds WHERE id = ?')
      .get(result.lastInsertRowid) as PuttRoundRow
    return rowToRound(row)
  }

  findRound(id: number): PuttRound | null {
    const row = this.db
      .prepare('SELECT id, trip_id, name, created_by, created_at FROM putt_rounds WHERE id = ?')
      .get(id) as PuttRoundRow | undefined
    return row ? rowToRound(row) : null
  }

  deleteRound(id: number): boolean {
    const result = this.db.prepare('DELETE FROM putt_rounds WHERE id = ?').run(id)
    return result.changes > 0
  }

  listMembers(tripId: number): PuttMember[] {
    const rows = this.db
      .prepare(`
        SELECT tm.user_id, tm.role, u.display_name, u.email
        FROM trip_members tm
        JOIN users u ON u.id = tm.user_id
        WHERE tm.trip_id = ?
        ORDER BY tm.joined_at ASC
      `)
      .all(tripId) as PuttMemberRow[]
    return rows.map(rowToMember)
  }

  getScores(roundId: number): PuttScore[] {
    const rows = this.db
      .prepare('SELECT round_id, user_id, hole, strokes FROM putt_scores WHERE round_id = ? ORDER BY user_id ASC, hole ASC')
      .all(roundId) as PuttScoreRow[]
    return rows.map(rowToScore)
  }

  upsertScore(roundId: number, userId: number, hole: number, strokes: number): PuttScore {
    this.db
      .prepare(`
        INSERT INTO putt_scores (round_id, user_id, hole, strokes)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (round_id, user_id, hole) DO UPDATE SET strokes = excluded.strokes
      `)
      .run(roundId, userId, hole, strokes)
    const row = this.db
      .prepare('SELECT round_id, user_id, hole, strokes FROM putt_scores WHERE round_id = ? AND user_id = ? AND hole = ?')
      .get(roundId, userId, hole) as PuttScoreRow
    return rowToScore(row)
  }
}
