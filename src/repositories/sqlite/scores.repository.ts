import type Database from 'better-sqlite3'
import type { IGameScoreRepository, GameScore, LeaderboardEntry, CreateGameScoreInput } from '../interfaces'

interface GameScoreRow {
  id: number
  user_id: number
  game_slug: string
  mode: string
  level: string
  score: number
  achieved_at: string
}

function rowToScore(row: GameScoreRow): GameScore {
  return {
    id: row.id,
    userId: row.user_id,
    gameSlug: row.game_slug,
    mode: row.mode,
    level: row.level,
    score: row.score,
    achievedAt: row.achieved_at,
  }
}

export class SqliteGameScoreRepository implements IGameScoreRepository {
  constructor(private db: Database.Database) {}

  submit(input: CreateGameScoreInput): GameScore {
    const result = this.db
      .prepare(
        `INSERT INTO game_scores (user_id, game_slug, mode, level, score, achieved_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(input.userId, input.gameSlug, input.mode, input.level, input.score, input.achievedAt)
    const row = this.db
      .prepare('SELECT * FROM game_scores WHERE id = ?')
      .get(Number(result.lastInsertRowid)) as GameScoreRow
    return rowToScore(row)
  }

  getLeaderboard(gameSlug: string, mode: string, level: string, limit: number): LeaderboardEntry[] {
    const cap = Math.min(limit, 50)
    const rows = this.db
      .prepare(
        `SELECT
           MAX(gs.score)                                       AS score,
           COALESCE(u.display_name, SUBSTR(u.email, 1, INSTR(u.email, '@') - 1)) AS player_name
         FROM game_scores gs
         JOIN users u ON u.id = gs.user_id
         WHERE gs.game_slug = ? AND gs.mode = ? AND gs.level = ?
         GROUP BY gs.user_id
         ORDER BY score DESC
         LIMIT ?`
      )
      .all(gameSlug, mode, level, cap) as Array<{ score: number; player_name: string }>
    return rows.map((row, i) => ({
      rank: i + 1,
      playerName: row.player_name,
      score: row.score,
    }))
  }
}
