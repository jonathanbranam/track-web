import type Database from 'better-sqlite3'
import type { IMovieRepository, Movie, Tag, MovieSeries, UserMovie } from '../interfaces'

interface MovieRow {
  id: number
  title: string
  runtime_minutes: number | null
  release_year: number | null
  tmdb_id: number | null
  description: string | null
  streaming: string | null
  added_by_user_id: number
  created_at: string
}

interface TagRow {
  id: number
  name: string
  category: string
}

interface SeriesRow {
  id: number
  name: string
}

interface SeriesEntryRow {
  series_id: number
  movie_id: number
  position: number
  title: string
}

interface UserMovieRow {
  user_id: number
  movie_id: number
  state: 'unseen' | 'watched' | 'would_watch_again'
  rating: number | null
  added_at: string
}

function toMovie(row: MovieRow, tags: Tag[]): Movie {
  return {
    id: row.id,
    title: row.title,
    runtimeMinutes: row.runtime_minutes,
    releaseYear: row.release_year,
    tmdbId: row.tmdb_id,
    description: row.description,
    streaming: row.streaming,
    addedByUserId: row.added_by_user_id,
    createdAt: row.created_at,
    tags,
  }
}

function toTag(row: TagRow): Tag {
  return { id: row.id, name: row.name, category: row.category }
}

export class SqliteMovieRepository implements IMovieRepository {
  constructor(private db: Database.Database) {}

  listTags(): Tag[] {
    const rows = this.db.prepare(`SELECT id, name, category FROM tags WHERE category = 'genre' ORDER BY name`).all() as TagRow[]
    return rows.map(toTag)
  }

  createTag(name: string): Tag {
    const stmt = this.db.prepare(`INSERT INTO tags (name, category) VALUES (?, 'genre')`)
    const result = stmt.run(name)
    return { id: result.lastInsertRowid as number, name, category: 'genre' }
  }

  private getTagsForMovie(movieId: number): Tag[] {
    const rows = this.db.prepare(`
      SELECT t.id, t.name, t.category FROM tags t
      JOIN movie_tags mt ON mt.tag_id = t.id
      WHERE mt.movie_id = ?
      ORDER BY t.name
    `).all(movieId) as TagRow[]
    return rows.map(toTag)
  }

  private setMovieTags(movieId: number, tagIds: number[]): void {
    this.db.prepare(`DELETE FROM movie_tags WHERE movie_id = ?`).run(movieId)
    const insert = this.db.prepare(`INSERT OR IGNORE INTO movie_tags (movie_id, tag_id) VALUES (?, ?)`)
    for (const tagId of tagIds) {
      insert.run(movieId, tagId)
    }
  }

  listMovies(q?: string, tag?: string): Movie[] {
    let sql = `SELECT DISTINCT m.* FROM movies m`
    const params: (string | number)[] = []

    if (tag) {
      sql += ` JOIN movie_tags mt ON mt.movie_id = m.id JOIN tags t ON t.id = mt.tag_id AND t.name = ?`
      params.push(tag)
    }

    if (q) {
      sql += ` WHERE m.title LIKE ?`
      params.push(`%${q}%`)
    }

    sql += ` ORDER BY m.title`

    const rows = this.db.prepare(sql).all(...params) as MovieRow[]
    return rows.map(r => toMovie(r, this.getTagsForMovie(r.id)))
  }

  getMovie(id: number): Movie | null {
    const row = this.db.prepare(`SELECT * FROM movies WHERE id = ?`).get(id) as MovieRow | undefined
    if (!row) return null
    return toMovie(row, this.getTagsForMovie(id))
  }

  createMovie(data: {
    title: string
    runtimeMinutes?: number | null
    releaseYear?: number | null
    tmdbId?: number | null
    description?: string | null
    streaming?: string | null
    addedByUserId: number
    tagIds?: number[]
  }): Movie {
    const result = this.db.prepare(`
      INSERT INTO movies (title, runtime_minutes, release_year, tmdb_id, description, streaming, added_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.title, data.runtimeMinutes ?? null, data.releaseYear ?? null, data.tmdbId ?? null, data.description ?? null, data.streaming ?? null, data.addedByUserId)

    const id = result.lastInsertRowid as number
    if (data.tagIds?.length) {
      this.setMovieTags(id, data.tagIds)
    }
    return this.getMovie(id)!
  }

  updateMovie(id: number, data: {
    title?: string
    runtimeMinutes?: number | null
    releaseYear?: number | null
    description?: string | null
    streaming?: string | null
    tagIds?: number[]
  }): Movie | null {
    const existing = this.db.prepare(`SELECT * FROM movies WHERE id = ?`).get(id) as MovieRow | undefined
    if (!existing) return null

    this.db.prepare(`
      UPDATE movies SET
        title = ?,
        runtime_minutes = ?,
        release_year = ?,
        description = ?,
        streaming = ?
      WHERE id = ?
    `).run(
      data.title ?? existing.title,
      'runtimeMinutes' in data ? data.runtimeMinutes : existing.runtime_minutes,
      'releaseYear' in data ? data.releaseYear : existing.release_year,
      'description' in data ? data.description : existing.description,
      'streaming' in data ? data.streaming : existing.streaming,
      id
    )

    if (data.tagIds !== undefined) {
      this.setMovieTags(id, data.tagIds)
    }

    return this.getMovie(id)!
  }

  listSeries(): MovieSeries[] {
    const series = this.db.prepare(`SELECT * FROM movie_series ORDER BY name`).all() as SeriesRow[]
    return series.map(s => {
      const entries = this.db.prepare(`
        SELECT mse.series_id, mse.movie_id, mse.position, m.title
        FROM movie_series_entries mse
        JOIN movies m ON m.id = mse.movie_id
        WHERE mse.series_id = ?
        ORDER BY mse.position
      `).all(s.id) as SeriesEntryRow[]
      return {
        id: s.id,
        name: s.name,
        entries: entries.map(e => ({ movieId: e.movie_id, position: e.position, title: e.title })),
      }
    })
  }

  createSeries(name: string): MovieSeries {
    const result = this.db.prepare(`INSERT INTO movie_series (name) VALUES (?)`).run(name)
    return { id: result.lastInsertRowid as number, name, entries: [] }
  }

  updateSeries(id: number, data: { name?: string; entries?: Array<{ movieId: number; position: number }> }): MovieSeries | null {
    const existing = this.db.prepare(`SELECT * FROM movie_series WHERE id = ?`).get(id) as SeriesRow | undefined
    if (!existing) return null

    if (data.name) {
      this.db.prepare(`UPDATE movie_series SET name = ? WHERE id = ?`).run(data.name, id)
    }

    if (data.entries !== undefined) {
      this.db.prepare(`DELETE FROM movie_series_entries WHERE series_id = ?`).run(id)
      const insert = this.db.prepare(`INSERT INTO movie_series_entries (series_id, movie_id, position) VALUES (?, ?, ?)`)
      for (const e of data.entries) {
        insert.run(id, e.movieId, e.position)
      }
    }

    const updated = this.db.prepare(`SELECT * FROM movie_series WHERE id = ?`).get(id) as SeriesRow
    const entries = this.db.prepare(`
      SELECT mse.series_id, mse.movie_id, mse.position, m.title
      FROM movie_series_entries mse
      JOIN movies m ON m.id = mse.movie_id
      WHERE mse.series_id = ?
      ORDER BY mse.position
    `).all(id) as SeriesEntryRow[]

    return {
      id: updated.id,
      name: updated.name,
      entries: entries.map(e => ({ movieId: e.movie_id, position: e.position, title: e.title })),
    }
  }

  getWatchlist(userId: number): UserMovie[] {
    const rows = this.db.prepare(`SELECT * FROM user_movies WHERE user_id = ? ORDER BY added_at DESC`).all(userId) as UserMovieRow[]
    return rows.map(r => ({
      userId: r.user_id,
      movieId: r.movie_id,
      state: r.state,
      rating: r.rating,
      addedAt: r.added_at,
      movie: this.getMovie(r.movie_id)!,
    }))
  }

  upsertWatchlistEntry(userId: number, movieId: number, data: {
    state: 'unseen' | 'watched' | 'would_watch_again'
    rating?: number | null
  }): UserMovie {
    this.db.prepare(`
      INSERT INTO user_movies (user_id, movie_id, state, rating)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (user_id, movie_id) DO UPDATE SET
        state = excluded.state,
        rating = COALESCE(excluded.rating, rating)
    `).run(userId, movieId, data.state, data.rating ?? null)

    const row = this.db.prepare(`SELECT * FROM user_movies WHERE user_id = ? AND movie_id = ?`).get(userId, movieId) as UserMovieRow
    return {
      userId: row.user_id,
      movieId: row.movie_id,
      state: row.state,
      rating: row.rating,
      addedAt: row.added_at,
      movie: this.getMovie(movieId)!,
    }
  }

  deleteWatchlistEntry(userId: number, movieId: number): boolean {
    const result = this.db.prepare(`DELETE FROM user_movies WHERE user_id = ? AND movie_id = ?`).run(userId, movieId)
    return result.changes > 0
  }

  seedWatchlistRating(userId: number, movieId: number, vote: number): void {
    this.db.prepare(`
      INSERT INTO user_movies (user_id, movie_id, state, rating)
      VALUES (?, ?, 'unseen', ?)
      ON CONFLICT (user_id, movie_id) DO UPDATE SET
        rating = CASE WHEN rating IS NULL THEN excluded.rating ELSE rating END
    `).run(userId, movieId, vote)
  }

  applyWatchedTransition(userId: number, movieId: number): void {
    this.db.prepare(`
      INSERT INTO user_movies (user_id, movie_id, state, rating)
      VALUES (?, ?, 'watched', NULL)
      ON CONFLICT (user_id, movie_id) DO UPDATE SET
        state = CASE
          WHEN state = 'unseen' THEN 'watched'
          ELSE state
        END
    `).run(userId, movieId)
  }
}
