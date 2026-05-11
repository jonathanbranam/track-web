import type Database from 'better-sqlite3'
import type { ITvRepository, TvSeries, UserTvSeries, Tag, RatingItem } from '../interfaces'

interface TvSeriesRow {
  id: number
  title: string
  streaming: string | null
  episode_runtime_minutes: number | null
  season_count: number | null
  release_year: number | null
  tmdb_id: number | null
  description: string | null
  added_by_user_id: number
  created_at: string
}

interface TagRow {
  id: number
  name: string
  category: string
}

interface UserTvSeriesRow {
  user_id: number
  series_id: number
  state: 'unseen' | 'watching' | 'watched' | 'would_watch_again'
  rating: number | null
  current_season: number | null
  current_episode: number | null
  added_at: string
}

function toTag(row: TagRow): Tag {
  return { id: row.id, name: row.name, category: row.category }
}

function toTvSeries(row: TvSeriesRow, tags: Tag[]): TvSeries {
  return {
    id: row.id,
    title: row.title,
    streaming: row.streaming,
    episodeRuntimeMinutes: row.episode_runtime_minutes,
    seasonCount: row.season_count,
    releaseYear: row.release_year,
    tmdbId: row.tmdb_id,
    description: row.description,
    addedByUserId: row.added_by_user_id,
    createdAt: row.created_at,
    tags,
  }
}

export class SqliteTvRepository implements ITvRepository {
  constructor(private db: Database.Database) {}

  private getTagsForSeries(seriesId: number): Tag[] {
    const rows = this.db.prepare(`
      SELECT t.id, t.name, t.category FROM tags t
      JOIN tv_series_tags tst ON tst.tag_id = t.id
      WHERE tst.series_id = ?
      ORDER BY t.name
    `).all(seriesId) as TagRow[]
    return rows.map(toTag)
  }

  private setSeriesTags(seriesId: number, tagIds: number[]): void {
    this.db.prepare(`DELETE FROM tv_series_tags WHERE series_id = ?`).run(seriesId)
    const insert = this.db.prepare(`INSERT OR IGNORE INTO tv_series_tags (series_id, tag_id) VALUES (?, ?)`)
    for (const tagId of tagIds) {
      insert.run(seriesId, tagId)
    }
  }

  listSeries(q?: string, tag?: string): TvSeries[] {
    let sql = `SELECT DISTINCT tv.* FROM tv_series tv`
    const params: (string | number)[] = []

    if (tag) {
      sql += ` JOIN tv_series_tags tst ON tst.series_id = tv.id JOIN tags t ON t.id = tst.tag_id AND t.name = ?`
      params.push(tag)
    }

    if (q) {
      sql += ` WHERE tv.title LIKE ?`
      params.push(`%${q}%`)
    }

    sql += ` ORDER BY tv.title`

    const rows = this.db.prepare(sql).all(...params) as TvSeriesRow[]
    return rows.map(r => toTvSeries(r, this.getTagsForSeries(r.id)))
  }

  getSeries(id: number): TvSeries | null {
    const row = this.db.prepare(`SELECT * FROM tv_series WHERE id = ?`).get(id) as TvSeriesRow | undefined
    if (!row) return null
    return toTvSeries(row, this.getTagsForSeries(id))
  }

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
  }): TvSeries {
    const result = this.db.prepare(`
      INSERT INTO tv_series (title, streaming, episode_runtime_minutes, season_count, release_year, tmdb_id, description, added_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.title, data.streaming ?? null, data.episodeRuntimeMinutes ?? null, data.seasonCount ?? null, data.releaseYear ?? null, data.tmdbId ?? null, data.description ?? null, data.addedByUserId)

    const id = result.lastInsertRowid as number
    if (data.tagIds?.length) {
      this.setSeriesTags(id, data.tagIds)
    }
    return this.getSeries(id)!
  }

  updateSeries(id: number, data: {
    title?: string
    streaming?: string | null
    episodeRuntimeMinutes?: number | null
    seasonCount?: number | null
    releaseYear?: number | null
    description?: string | null
    tagIds?: number[]
  }): TvSeries | null {
    const existing = this.db.prepare(`SELECT * FROM tv_series WHERE id = ?`).get(id) as TvSeriesRow | undefined
    if (!existing) return null

    this.db.prepare(`
      UPDATE tv_series SET
        title = ?,
        streaming = ?,
        episode_runtime_minutes = ?,
        season_count = ?,
        release_year = ?,
        description = ?
      WHERE id = ?
    `).run(
      data.title ?? existing.title,
      'streaming' in data ? data.streaming : existing.streaming,
      'episodeRuntimeMinutes' in data ? data.episodeRuntimeMinutes : existing.episode_runtime_minutes,
      'seasonCount' in data ? data.seasonCount : existing.season_count,
      'releaseYear' in data ? data.releaseYear : existing.release_year,
      'description' in data ? data.description : existing.description,
      id
    )

    if (data.tagIds !== undefined) {
      this.setSeriesTags(id, data.tagIds)
    }

    return this.getSeries(id)!
  }

  getWatchlist(userId: number): UserTvSeries[] {
    const rows = this.db.prepare(`SELECT * FROM user_tv_series WHERE user_id = ? ORDER BY added_at DESC`).all(userId) as UserTvSeriesRow[]
    return rows.map(r => ({
      userId: r.user_id,
      seriesId: r.series_id,
      state: r.state,
      rating: r.rating,
      currentSeason: r.current_season,
      currentEpisode: r.current_episode,
      addedAt: r.added_at,
      series: this.getSeries(r.series_id)!,
    }))
  }

  upsertWatchlistEntry(userId: number, seriesId: number, data: {
    state: 'unseen' | 'watching' | 'watched' | 'would_watch_again'
    rating?: number | null
    currentSeason?: number | null
    currentEpisode?: number | null
  }): UserTvSeries {
    const existing = this.db.prepare(`SELECT * FROM user_tv_series WHERE user_id = ? AND series_id = ?`).get(userId, seriesId) as UserTvSeriesRow | undefined

    if (existing) {
      this.db.prepare(`
        UPDATE user_tv_series SET
          state = ?,
          rating = ?,
          current_season = ?,
          current_episode = ?
        WHERE user_id = ? AND series_id = ?
      `).run(
        data.state,
        'rating' in data ? data.rating : existing.rating,
        'currentSeason' in data ? data.currentSeason : existing.current_season,
        'currentEpisode' in data ? data.currentEpisode : existing.current_episode,
        userId,
        seriesId
      )
    } else {
      this.db.prepare(`
        INSERT INTO user_tv_series (user_id, series_id, state, rating, current_season, current_episode)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, seriesId, data.state, data.rating ?? null, data.currentSeason ?? null, data.currentEpisode ?? null)
    }

    const row = this.db.prepare(`SELECT * FROM user_tv_series WHERE user_id = ? AND series_id = ?`).get(userId, seriesId) as UserTvSeriesRow
    return {
      userId: row.user_id,
      seriesId: row.series_id,
      state: row.state,
      rating: row.rating,
      currentSeason: row.current_season,
      currentEpisode: row.current_episode,
      addedAt: row.added_at,
      series: this.getSeries(seriesId)!,
    }
  }

  deleteWatchlistEntry(userId: number, seriesId: number): boolean {
    const result = this.db.prepare(`DELETE FROM user_tv_series WHERE user_id = ? AND series_id = ?`).run(userId, seriesId)
    return result.changes > 0
  }

  getTvRatings(userId: number): RatingItem[] {
    const rows = this.db.prepare(`
      SELECT uts.series_id AS id, tv.title, tv.release_year AS year, tv.streaming,
             uts.rating, uts.state, uts.current_season AS season, uts.current_episode AS episode
      FROM user_tv_series uts
      JOIN tv_series tv ON tv.id = uts.series_id
      WHERE uts.user_id = ?
    `).all(userId) as Array<{ id: number; title: string; year: number | null; streaming: string | null; rating: number | null; state: string; season: number | null; episode: number | null }>
    return rows.map(r => ({
      id: r.id,
      mediaType: 'tv' as const,
      title: r.title,
      year: r.year,
      streaming: r.streaming,
      rating: r.rating,
      seen: r.state === 'watched' || r.state === 'would_watch_again',
      again: r.state === 'would_watch_again',
      watching: r.state === 'watching',
      season: r.season,
      episode: r.episode,
    }))
  }

  getUserTvRating(userId: number, seriesId: number): number | null {
    const row = this.db.prepare(`SELECT rating FROM user_tv_series WHERE user_id = ? AND series_id = ?`).get(userId, seriesId) as { rating: number | null } | undefined
    return row?.rating ?? null
  }

  setTvRatingIfNull(userId: number, seriesId: number, rating: number): void {
    this.db.prepare(`
      UPDATE user_tv_series SET rating = ? WHERE user_id = ? AND series_id = ? AND rating IS NULL
    `).run(rating, userId, seriesId)
  }

  applyWatchingTransition(userId: number, seriesId: number, seasonTo: number | null, episodeTo: number | null): void {
    const existing = this.db.prepare(`SELECT * FROM user_tv_series WHERE user_id = ? AND series_id = ?`).get(userId, seriesId) as UserTvSeriesRow | undefined

    if (!existing) {
      this.db.prepare(`
        INSERT INTO user_tv_series (user_id, series_id, state, current_season, current_episode)
        VALUES (?, ?, 'watching', ?, ?)
      `).run(userId, seriesId, seasonTo, episodeTo)
      return
    }

    // Update state: unseen → watching; watching/watched/would_watch_again unchanged
    if (existing.state === 'unseen') {
      this.db.prepare(`UPDATE user_tv_series SET state = 'watching' WHERE user_id = ? AND series_id = ?`).run(userId, seriesId)
    }

    // Advance episode progress if specific mode
    if (seasonTo !== null && episodeTo !== null) {
      const currentSeason = existing.current_season ?? 0
      const currentEpisode = existing.current_episode ?? 0
      const isAhead = seasonTo > currentSeason || (seasonTo === currentSeason && episodeTo > currentEpisode)
      if (isAhead) {
        this.db.prepare(`
          UPDATE user_tv_series SET current_season = ?, current_episode = ? WHERE user_id = ? AND series_id = ?
        `).run(seasonTo, episodeTo, userId, seriesId)
      }
    }
  }
}
