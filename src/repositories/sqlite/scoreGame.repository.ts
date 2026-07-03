import type Database from 'better-sqlite3'
import type {
  IScoreGameRepository,
  ScoreGame,
  ScoreGameDetail,
  ScorePlayer,
  ScoreRoundScore,
  CreateScoreGameInput,
} from '../interfaces'

interface ScoreGameRow {
  id: number
  user_id: number
  name: string
  target_rounds: number | null
  status: string
  created_at: string
  completed_at: string | null
}

interface ScorePlayerRow {
  id: number
  game_id: number
  user_id: number | null
  name: string
  position: number
}

interface ScoreRoundScoreRow {
  player_id: number
  round_number: number
  value: number
}

function rowToGame(row: ScoreGameRow): ScoreGame {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    targetRounds: row.target_rounds,
    status: row.status === 'completed' ? 'completed' : 'active',
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }
}

function rowToPlayer(row: ScorePlayerRow): ScorePlayer {
  return {
    id: row.id,
    gameId: row.game_id,
    userId: row.user_id,
    name: row.name,
    position: row.position,
  }
}

function rowToScore(row: ScoreRoundScoreRow): ScoreRoundScore {
  return {
    playerId: row.player_id,
    roundNumber: row.round_number,
    value: row.value,
  }
}

function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

export class SqliteScoreGameRepository implements IScoreGameRepository {
  constructor(private db: Database.Database) {}

  listGameNames(): string[] {
    const rows = this.db
      .prepare('SELECT name FROM score_game_names ORDER BY name COLLATE NOCASE ASC')
      .all() as { name: string }[]
    return rows.map(r => r.name)
  }

  rememberGameName(name: string): void {
    const trimmed = name.trim()
    if (!trimmed) return
    this.db
      .prepare('INSERT INTO score_game_names (name, name_key) VALUES (?, ?) ON CONFLICT(name_key) DO NOTHING')
      .run(trimmed, nameKey(trimmed))
  }

  createGame(input: CreateScoreGameInput): ScoreGameDetail {
    const create = this.db.transaction((data: CreateScoreGameInput): number => {
      const result = this.db
        .prepare(
          `INSERT INTO score_games (user_id, name, target_rounds, status, created_at)
           VALUES (?, ?, ?, 'active', datetime('now'))`
        )
        .run(data.userId, data.name, data.targetRounds ?? null)
      const gameId = Number(result.lastInsertRowid)

      const insertPlayer = this.db.prepare(
        'INSERT INTO score_players (game_id, user_id, name, position) VALUES (?, ?, ?, ?)'
      )
      data.players.forEach((p, i) => {
        insertPlayer.run(gameId, p.userId ?? null, p.name, i)
      })

      this.rememberGameName(data.name)
      return gameId
    })

    const gameId = create(input)
    return this.getGame(gameId, input.userId)!
  }

  private buildDetail(game: ScoreGame): ScoreGameDetail {
    const players = (
      this.db
        .prepare('SELECT id, game_id, user_id, name, position FROM score_players WHERE game_id = ? ORDER BY position ASC')
        .all(game.id) as ScorePlayerRow[]
    ).map(rowToPlayer)

    const scores = (
      this.db
        .prepare('SELECT player_id, round_number, value FROM score_round_scores WHERE game_id = ? ORDER BY round_number ASC, player_id ASC')
        .all(game.id) as ScoreRoundScoreRow[]
    ).map(rowToScore)

    return { ...game, players, scores }
  }

  getGame(id: number, userId: number): ScoreGameDetail | null {
    const row = this.db
      .prepare('SELECT id, user_id, name, target_rounds, status, created_at, completed_at FROM score_games WHERE id = ? AND user_id = ?')
      .get(id, userId) as ScoreGameRow | undefined
    return row ? this.buildDetail(rowToGame(row)) : null
  }

  listGames(userId: number): ScoreGameDetail[] {
    const rows = this.db
      .prepare(
        `SELECT id, user_id, name, target_rounds, status, created_at, completed_at
         FROM score_games WHERE user_id = ?
         ORDER BY (status = 'active') DESC,
                  CASE WHEN status = 'active' THEN created_at END ASC,
                  completed_at DESC`
      )
      .all(userId) as ScoreGameRow[]
    return rows.map(row => this.buildDetail(rowToGame(row)))
  }

  upsertRound(
    gameId: number,
    userId: number,
    roundNumber: number,
    scores: { playerId: number; value: number }[]
  ): ScoreGameDetail | null {
    if (!this.getGame(gameId, userId)) return null

    const replace = this.db.transaction(() => {
      this.db
        .prepare('DELETE FROM score_round_scores WHERE game_id = ? AND round_number = ?')
        .run(gameId, roundNumber)
      const insert = this.db.prepare(
        'INSERT INTO score_round_scores (game_id, player_id, round_number, value) VALUES (?, ?, ?, ?)'
      )
      for (const s of scores) {
        insert.run(gameId, s.playerId, roundNumber, s.value)
      }
    })
    replace()

    return this.getGame(gameId, userId)
  }

  deleteRound(gameId: number, userId: number, roundNumber: number): ScoreGameDetail | null {
    if (!this.getGame(gameId, userId)) return null
    this.db
      .prepare('DELETE FROM score_round_scores WHERE game_id = ? AND round_number = ?')
      .run(gameId, roundNumber)
    return this.getGame(gameId, userId)
  }

  completeGame(gameId: number, userId: number): ScoreGameDetail | null {
    if (!this.getGame(gameId, userId)) return null
    this.db
      .prepare(`UPDATE score_games SET status = 'completed', completed_at = datetime('now') WHERE id = ? AND user_id = ?`)
      .run(gameId, userId)
    return this.getGame(gameId, userId)
  }
}
