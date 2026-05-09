import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '../../db'
import { SqliteUserRepository } from './user.repository'
import { SqliteWatchEventRepository } from './watch-event.repository'
import { SqliteMovieRepository } from './movie.repository'

function setupDb() {
  const db = new Database(':memory:')
  migrate(db)
  const userRepo = new SqliteUserRepository(db)
  const movieRepo = new SqliteMovieRepository(db)
  const eventRepo = new SqliteWatchEventRepository(db)
  return { db, userRepo, movieRepo, eventRepo }
}

describe('SqliteWatchEventRepository.removeCandidate', () => {
  let env: ReturnType<typeof setupDb>
  let userId: number
  let eventId: number
  let movieId: number

  beforeEach(() => {
    env = setupDb()
    env.userRepo.upsert('a@test.com', 'hash')
    const user = env.userRepo.findByEmail('a@test.com')!
    userId = user.id

    const event = env.eventRepo.createEvent({
      title: 'Test Night',
      scheduledDate: '2026-06-01',
      createdByUserId: userId,
      inviteeUserIds: [],
    })
    eventId = event.id

    const movie = env.movieRepo.createMovie({ title: 'Film A', addedByUserId: userId })
    movieId = movie.id
  })

  it('deletes the candidate row', () => {
    const candidate = env.eventRepo.addCandidate(eventId, {
      itemType: 'movie',
      movieId,
      suggestedByUserId: userId,
    })

    env.eventRepo.removeCandidate(candidate.id)

    expect(env.eventRepo.getCandidate(candidate.id)).toBeNull()
  })

  it('deletes associated votes', () => {
    const candidate = env.eventRepo.addCandidate(eventId, {
      itemType: 'movie',
      movieId,
      suggestedByUserId: userId,
    })
    env.eventRepo.upsertVote(eventId, candidate.id, userId, 2)

    env.eventRepo.removeCandidate(candidate.id)

    const detail = env.eventRepo.getEventDetail(eventId)!
    expect(detail.candidates).toHaveLength(0)
  })

  it('clears the selection when the removed candidate is selected', () => {
    const candidate = env.eventRepo.addCandidate(eventId, {
      itemType: 'movie',
      movieId,
      suggestedByUserId: userId,
    })
    env.eventRepo.upsertSelection(eventId, { candidateId: candidate.id })

    env.eventRepo.removeCandidate(candidate.id)

    expect(env.eventRepo.getSelection(eventId)).toBeNull()
  })

  it('does not affect a different candidate or its selection', () => {
    const movie2 = env.movieRepo.createMovie({ title: 'Film B', addedByUserId: userId })
    const c1 = env.eventRepo.addCandidate(eventId, { itemType: 'movie', movieId, suggestedByUserId: userId })
    const c2 = env.eventRepo.addCandidate(eventId, { itemType: 'movie', movieId: movie2.id, suggestedByUserId: userId })
    env.eventRepo.upsertSelection(eventId, { candidateId: c2.id })

    env.eventRepo.removeCandidate(c1.id)

    expect(env.eventRepo.getCandidate(c2.id)).not.toBeNull()
    expect(env.eventRepo.getSelection(eventId)?.candidateId).toBe(c2.id)
  })
})
