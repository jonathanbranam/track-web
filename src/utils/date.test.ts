import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getDayBounds, getTodayDateString } from './date'

describe('getDayBounds', () => {
  it('returns correct UTC window for an EDT day (2024-06-15, UTC-4)', () => {
    const { startUtc, endUtc } = getDayBounds('2024-06-15')
    // 4am EDT = 8am UTC
    expect(startUtc).toBe('2024-06-15T08:00:00.000Z')
    expect(endUtc).toBe('2024-06-16T08:00:00.000Z')
  })

  it('returns correct UTC window for an EST day (2024-01-15, UTC-5)', () => {
    const { startUtc, endUtc } = getDayBounds('2024-01-15')
    // 4am EST = 9am UTC
    expect(startUtc).toBe('2024-01-15T09:00:00.000Z')
    expect(endUtc).toBe('2024-01-16T09:00:00.000Z')
  })
})

describe('getTodayDateString', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns previous calendar day before 4am ET', () => {
    // 2:00am EDT on 2024-06-15 = 06:00 UTC
    vi.setSystemTime(new Date('2024-06-15T06:00:00.000Z'))
    expect(getTodayDateString()).toBe('2024-06-14')
  })

  it('returns current calendar day at or after 4am ET', () => {
    // 6:00am EDT on 2024-06-15 = 10:00 UTC
    vi.setSystemTime(new Date('2024-06-15T10:00:00.000Z'))
    expect(getTodayDateString()).toBe('2024-06-15')
  })
})
