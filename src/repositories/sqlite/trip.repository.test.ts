import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '../../db'
import { SqliteUserRepository } from './user.repository'
import { SqliteTripRepository } from './trip.repository'
import { SqliteTripDayRepository } from './trip-day.repository'

function setupDb() {
  const db = new Database(':memory:')
  migrate(db)
  const userRepo = new SqliteUserRepository(db)
  const dayRepo = new SqliteTripDayRepository(db)
  const tripRepo = new SqliteTripRepository(db, dayRepo)
  return { db, userRepo, tripRepo }
}

describe('SqliteTripRepository researchMarkdown', () => {
  let env: ReturnType<typeof setupDb>
  let userId: number

  beforeEach(() => {
    env = setupDb()
    env.userRepo.upsert('a@test.com', 'hash')
    userId = env.userRepo.findByEmail('a@test.com')!.id
  })

  it('persists researchMarkdown on create and returns it on the current trip', () => {
    const trip = env.tripRepo.create({
      userId,
      name: 'Beach Trip',
      researchMarkdown: '## Airports\nDetails here',
    })
    expect(trip.researchMarkdown).toBe('## Airports\nDetails here')

    env.tripRepo.setCurrent(userId, trip.id)
    const current = env.tripRepo.findCurrent(userId)
    expect(current?.researchMarkdown).toBe('## Airports\nDetails here')
  })

  it('persists researchMarkdown on update', () => {
    const trip = env.tripRepo.create({ userId, name: 'Mountain Trip' })
    expect(trip.researchMarkdown).toBeNull()

    const updated = env.tripRepo.update(trip.id, { researchMarkdown: '## Transit\nTake the train' })
    expect(updated?.researchMarkdown).toBe('## Transit\nTake the train')
  })

  it('returns null researchMarkdown for a trip without research content', () => {
    const trip = env.tripRepo.create({ userId, name: 'City Trip' })
    expect(trip.researchMarkdown).toBeNull()

    const found = env.tripRepo.findById(trip.id)
    expect(found?.researchMarkdown).toBeNull()
  })
})
