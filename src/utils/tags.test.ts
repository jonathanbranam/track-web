import { describe, it, expect } from 'vitest'
import { parseTags, normalizeDescription, tagsToString } from './tags'

describe('parseTags', () => {
  it('parses hash-prefix tags', () => {
    expect(parseTags('working on #backend today')).toEqual(['backend'])
  })

  it('parses colon-prefix tags', () => {
    expect(parseTags('fixed :bug in auth')).toEqual(['bug'])
  })

  it('parses hyphenated tags', () => {
    expect(parseTags('#yard-work done')).toEqual(['yard-work'])
  })

  it('deduplicates tags', () => {
    expect(parseTags('#work and more #work')).toEqual(['work'])
  })

  it('returns lowercase tags', () => {
    expect(parseTags('#Backend')).toEqual(['backend'])
  })

  it('ignores time strings like 10:00am', () => {
    expect(parseTags('meeting at 10:00am')).toEqual([])
  })

  it('ignores version strings like V1.2', () => {
    expect(parseTags('released V1.2')).toEqual([])
  })
})

describe('normalizeDescription', () => {
  it('rewrites colon-prefix to hash and lowercases', () => {
    expect(normalizeDescription('fixed :Bug in auth')).toBe('fixed #bug in auth')
  })

  it('lowercases hash tags', () => {
    expect(normalizeDescription('#Backend work')).toBe('#backend work')
  })

  it('leaves plain text unchanged', () => {
    expect(normalizeDescription('no tags here')).toBe('no tags here')
  })
})

describe('tagsToString', () => {
  it('joins tags as comma-separated string', () => {
    expect(tagsToString(['a', 'b', 'c'])).toBe('a,b,c')
  })

  it('returns empty string for empty array', () => {
    expect(tagsToString([])).toBe('')
  })
})
