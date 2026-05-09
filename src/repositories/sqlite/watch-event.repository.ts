import type Database from 'better-sqlite3'
import type {
  IWatchEventRepository,
  WatchEvent,
  WatchEventInvite,
  WatchEventCandidate,
  WatchEventVote,
  WatchEventSelection,
} from '../interfaces'

interface WatchEventRow {
  id: number
  title: string
  scheduled_date: string
  created_by_user_id: number
  created_at: string
  completed_at: string | null
}

interface WatchEventInviteRow {
  event_id: number
  user_id: number
  attendance: 'yes' | 'no' | 'maybe' | null
}

interface WatchEventCandidateRow {
  id: number
  event_id: number
  item_type: 'movie' | 'tv'
  movie_id: number | null
  series_id: number | null
  suggested_by_user_id: number
  suggested_at: string
}

interface WatchEventVoteRow {
  event_id: number
  candidate_id: number
  user_id: number
  vote: number
}

interface WatchEventSelectionRow {
  event_id: number
  candidate_id: number
  episode_mode: 'latest' | 'specific' | null
  season_from: number | null
  episode_from: number | null
  season_to: number | null
  episode_to: number | null
}

function toEvent(row: WatchEventRow): WatchEvent {
  return {
    id: row.id,
    title: row.title,
    scheduledDate: row.scheduled_date,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }
}

function toCandidate(row: WatchEventCandidateRow): WatchEventCandidate {
  return {
    id: row.id,
    eventId: row.event_id,
    itemType: row.item_type,
    movieId: row.movie_id,
    seriesId: row.series_id,
    suggestedByUserId: row.suggested_by_user_id,
    suggestedAt: row.suggested_at,
  }
}

function toSelection(row: WatchEventSelectionRow): WatchEventSelection {
  return {
    eventId: row.event_id,
    candidateId: row.candidate_id,
    episodeMode: row.episode_mode,
    seasonFrom: row.season_from,
    episodeFrom: row.episode_from,
    seasonTo: row.season_to,
    episodeTo: row.episode_to,
  }
}

export class SqliteWatchEventRepository implements IWatchEventRepository {
  constructor(private db: Database.Database) {}

  listEvents(userId: number): WatchEvent[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT we.* FROM watch_events we
      LEFT JOIN watch_event_invites wei ON wei.event_id = we.id
      WHERE we.created_by_user_id = ? OR wei.user_id = ?
      ORDER BY we.scheduled_date DESC
    `).all(userId, userId) as WatchEventRow[]
    return rows.map(toEvent)
  }

  getEvent(id: number): WatchEvent | null {
    const row = this.db.prepare(`SELECT * FROM watch_events WHERE id = ?`).get(id) as WatchEventRow | undefined
    return row ? toEvent(row) : null
  }

  createEvent(data: {
    title: string
    scheduledDate: string
    createdByUserId: number
    inviteeUserIds: number[]
  }): WatchEvent {
    const result = this.db.prepare(`
      INSERT INTO watch_events (title, scheduled_date, created_by_user_id)
      VALUES (?, ?, ?)
    `).run(data.title, data.scheduledDate, data.createdByUserId)

    const eventId = result.lastInsertRowid as number
    const insertInvite = this.db.prepare(`INSERT OR IGNORE INTO watch_event_invites (event_id, user_id) VALUES (?, ?)`)
    for (const userId of data.inviteeUserIds) {
      insertInvite.run(eventId, userId)
    }

    return this.getEvent(eventId)!
  }

  getEventDetail(id: number): {
    event: WatchEvent
    invites: Array<WatchEventInvite & { displayName: string; email: string }>
    candidates: Array<WatchEventCandidate & { votes: WatchEventVote[]; movieTitle?: string; seriesTitle?: string }>
    selection: WatchEventSelection | null
  } | null {
    const event = this.getEvent(id)
    if (!event) return null

    const inviteRows = this.db.prepare(`
      SELECT wei.event_id, wei.user_id, wei.attendance,
             u.email, COALESCE(u.display_name, SUBSTR(u.email, 1, INSTR(u.email, '@') - 1)) AS display_name
      FROM watch_event_invites wei
      JOIN users u ON u.id = wei.user_id
      WHERE wei.event_id = ?
    `).all(id) as Array<{ event_id: number; user_id: number; attendance: 'yes' | 'no' | 'maybe' | null; display_name: string; email: string }>

    const invites = inviteRows.map(r => ({
      eventId: r.event_id,
      userId: r.user_id,
      attendance: r.attendance,
      displayName: r.display_name,
      email: r.email,
    }))

    const candidateRows = this.db.prepare(`
      SELECT wec.*,
             m.title AS movie_title,
             tv.title AS series_title
      FROM watch_event_candidates wec
      LEFT JOIN movies m ON m.id = wec.movie_id
      LEFT JOIN tv_series tv ON tv.id = wec.series_id
      WHERE wec.event_id = ?
      ORDER BY wec.suggested_at
    `).all(id) as Array<WatchEventCandidateRow & { movie_title: string | null; series_title: string | null }>

    const candidates = candidateRows.map(c => {
      const votes = this.db.prepare(`
        SELECT * FROM watch_event_votes WHERE event_id = ? AND candidate_id = ?
      `).all(id, c.id) as WatchEventVoteRow[]
      return {
        ...toCandidate(c),
        votes: votes.map(v => ({
          eventId: v.event_id,
          candidateId: v.candidate_id,
          userId: v.user_id,
          vote: v.vote,
        })),
        movieTitle: c.movie_title ?? undefined,
        seriesTitle: c.series_title ?? undefined,
      }
    })

    const selRow = this.db.prepare(`SELECT * FROM watch_event_selection WHERE event_id = ?`).get(id) as WatchEventSelectionRow | undefined

    return { event, invites, candidates, selection: selRow ? toSelection(selRow) : null }
  }

  isInvited(eventId: number, userId: number): boolean {
    const row = this.db.prepare(`SELECT 1 FROM watch_event_invites WHERE event_id = ? AND user_id = ?`).get(eventId, userId)
    return !!row
  }

  upsertAttendance(eventId: number, userId: number, attendance: 'yes' | 'no' | 'maybe'): void {
    this.db.prepare(`
      UPDATE watch_event_invites SET attendance = ? WHERE event_id = ? AND user_id = ?
    `).run(attendance, eventId, userId)
  }

  addCandidate(eventId: number, data: {
    itemType: 'movie' | 'tv'
    movieId?: number | null
    seriesId?: number | null
    suggestedByUserId: number
  }): WatchEventCandidate {
    const result = this.db.prepare(`
      INSERT INTO watch_event_candidates (event_id, item_type, movie_id, series_id, suggested_by_user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(eventId, data.itemType, data.movieId ?? null, data.seriesId ?? null, data.suggestedByUserId)

    const row = this.db.prepare(`SELECT * FROM watch_event_candidates WHERE id = ?`).get(result.lastInsertRowid) as WatchEventCandidateRow
    return toCandidate(row)
  }

  getCandidate(id: number): WatchEventCandidate | null {
    const row = this.db.prepare(`SELECT * FROM watch_event_candidates WHERE id = ?`).get(id) as WatchEventCandidateRow | undefined
    return row ? toCandidate(row) : null
  }

  upsertVote(eventId: number, candidateId: number, userId: number, vote: number): void {
    this.db.prepare(`
      INSERT INTO watch_event_votes (event_id, candidate_id, user_id, vote)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (event_id, candidate_id, user_id) DO UPDATE SET vote = excluded.vote
    `).run(eventId, candidateId, userId, vote)
  }

  upsertSelection(eventId: number, data: {
    candidateId: number
    episodeMode?: 'latest' | 'specific' | null
    seasonFrom?: number | null
    episodeFrom?: number | null
    seasonTo?: number | null
    episodeTo?: number | null
  }): void {
    this.db.prepare(`
      INSERT INTO watch_event_selection (event_id, candidate_id, episode_mode, season_from, episode_from, season_to, episode_to)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (event_id) DO UPDATE SET
        candidate_id = excluded.candidate_id,
        episode_mode = excluded.episode_mode,
        season_from = excluded.season_from,
        episode_from = excluded.episode_from,
        season_to = excluded.season_to,
        episode_to = excluded.episode_to
    `).run(
      eventId,
      data.candidateId,
      data.episodeMode ?? null,
      data.seasonFrom ?? null,
      data.episodeFrom ?? null,
      data.seasonTo ?? null,
      data.episodeTo ?? null
    )
  }

  getSelection(eventId: number): WatchEventSelection | null {
    const row = this.db.prepare(`SELECT * FROM watch_event_selection WHERE event_id = ?`).get(eventId) as WatchEventSelectionRow | undefined
    return row ? toSelection(row) : null
  }

  completeEvent(eventId: number, completedAt: string): void {
    this.db.prepare(`UPDATE watch_events SET completed_at = ? WHERE id = ?`).run(completedAt, eventId)
  }

  getYesRsvpUserIds(eventId: number): number[] {
    const rows = this.db.prepare(`SELECT user_id FROM watch_event_invites WHERE event_id = ? AND attendance = 'yes'`).all(eventId) as { user_id: number }[]
    return rows.map(r => r.user_id)
  }

  getGroupMembers(groupId: number): number[] {
    const rows = this.db.prepare(`SELECT user_id FROM group_members WHERE group_id = ?`).all(groupId) as { user_id: number }[]
    return rows.map(r => r.user_id)
  }
}
