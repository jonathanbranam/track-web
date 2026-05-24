import { describe, expect, it } from 'vitest'
import { CATALOG_RESULT_CAP, excludeDuplicates, excludeRated, filterByTitle, isSignificant } from './search'

describe('isSignificant', () => {
  it('is true once ≥ 3 significant chars remain', () => {
    expect(isSignificant('godfather')).toBe(true)
    expect(isSignificant('abc')).toBe(true)
  })

  it('strips leading articles before counting', () => {
    expect(isSignificant('the g')).toBe(false)
    expect(isSignificant('a go')).toBe(false)
    expect(isSignificant('an ax')).toBe(false)
    expect(isSignificant('the godfather')).toBe(true)
  })

  it('strips all spaces before counting', () => {
    expect(isSignificant('a b')).toBe(false)
    expect(isSignificant('  x y  ')).toBe(false)
    expect(isSignificant('x y z')).toBe(true)
  })

  it('is false for short queries', () => {
    expect(isSignificant('')).toBe(false)
    expect(isSignificant('ab')).toBe(false)
  })
})

describe('filterByTitle', () => {
  const items = [
    { id: 1, title: 'The Matrix' },
    { id: 2, title: 'Inception' },
    { id: 3, title: 'matrix reloaded' },
  ]

  it('matches case-insensitively on title', () => {
    expect(filterByTitle(items, 'MATRIX').map(i => i.id)).toEqual([1, 3])
  })

  it('returns all items for an empty/whitespace query', () => {
    expect(filterByTitle(items, '')).toHaveLength(3)
    expect(filterByTitle(items, '   ')).toHaveLength(3)
  })

  it('returns no items when nothing matches', () => {
    expect(filterByTitle(items, 'zzz')).toEqual([])
  })
})

describe('excludeRated', () => {
  it('drops results already rated by id + mediaType', () => {
    const rated = [{ id: 1, mediaType: 'movie' as const }, { id: 5, mediaType: 'tv' as const }]
    const results = [
      { id: 1, mediaType: 'movie' as const, title: 'A' },
      { id: 1, mediaType: 'tv' as const, title: 'B' },
      { id: 5, mediaType: 'tv' as const, title: 'C' },
      { id: 9, mediaType: 'movie' as const, title: 'D' },
    ]
    expect(excludeRated(results, rated).map(r => r.title)).toEqual(['B', 'D'])
  })
})

describe('excludeDuplicates', () => {
  it('drops results flagged isDuplicate', () => {
    const results = [
      { tmdbId: 1, isDuplicate: false },
      { tmdbId: 2, isDuplicate: true },
      { tmdbId: 3, isDuplicate: false },
    ]
    expect(excludeDuplicates(results).map(r => r.tmdbId)).toEqual([1, 3])
  })
})

describe('CATALOG_RESULT_CAP', () => {
  it('is within the documented 10–15 range', () => {
    expect(CATALOG_RESULT_CAP).toBeGreaterThanOrEqual(10)
    expect(CATALOG_RESULT_CAP).toBeLessThanOrEqual(15)
  })
})
