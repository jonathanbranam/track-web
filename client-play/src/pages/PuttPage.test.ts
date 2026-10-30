import { describe, it, expect, vi } from 'vitest'

// The page module imports the auth package and the API wrapper; the helpers
// under test are pure, so stub both out.
vi.mock('@repo/auth', () => ({ useAuth: () => ({}) }))
vi.mock('../api', () => ({ api: {} }))

import { buildScoreMap, holesTotal } from './PuttPage'
import type { PuttScore } from '../types'

const score = (userId: number, hole: number, strokes: number): PuttScore =>
  ({ roundId: 1, userId, hole, strokes })

describe('buildScoreMap', () => {
  it('groups strokes by user then hole', () => {
    const map = buildScoreMap([score(1, 1, 3), score(1, 2, 4), score(2, 1, 5)])
    expect(map).toEqual({ 1: { 1: 3, 2: 4 }, 2: { 1: 5 } })
  })

  it('returns an empty map for no scores', () => {
    expect(buildScoreMap([])).toEqual({})
  })
})

describe('holesTotal', () => {
  const map = buildScoreMap([score(1, 1, 3), score(1, 2, 4), score(1, 10, 6)])

  it('sums only the holes that have a score', () => {
    // Hole 3 has no score and must not count, nor turn the total into NaN.
    expect(holesTotal(map, 1, [1, 2, 3])).toBe(7)
  })

  it('returns null when none of the holes has a score', () => {
    expect(holesTotal(map, 1, [5, 6, 7])).toBeNull()
  })

  it('returns null for a player with no scores at all', () => {
    expect(holesTotal(map, 99, [1, 2])).toBeNull()
  })

  it('keeps front and back nine separate', () => {
    const front = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    const back = [10, 11, 12, 13, 14, 15, 16, 17, 18]
    expect(holesTotal(map, 1, front)).toBe(7)
    expect(holesTotal(map, 1, back)).toBe(6)
    expect(holesTotal(map, 1, [...front, ...back])).toBe(13)
  })
})
