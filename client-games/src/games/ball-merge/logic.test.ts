import { describe, it, expect } from 'vitest'
import {
  SIZES,
  MAX_SIZE,
  SPAWN_MAX_SIZE,
  sizeInfo,
  nextSize,
  mergeScore,
  pickSpawnSize,
  isOverflow,
} from './logic'

describe('nextSize', () => {
  it('returns the next size up for non-max sizes', () => {
    expect(nextSize(0)).toBe(1)
    expect(nextSize(MAX_SIZE - 1)).toBe(MAX_SIZE)
  })

  it('returns null at the largest size (no further merge)', () => {
    expect(nextSize(MAX_SIZE)).toBeNull()
  })
})

describe('mergeScore', () => {
  it('matches the points table for each size', () => {
    for (const s of SIZES) {
      expect(mergeScore(s.size)).toBe(s.points)
    }
  })

  it('larger merges are worth more', () => {
    expect(mergeScore(0)).toBeLessThan(mergeScore(MAX_SIZE))
  })
})

describe('pickSpawnSize', () => {
  it('only ever returns small sizes within the spawn range', () => {
    let calls = 0
    // Deterministic rng cycling across [0, 1) so we cover the full range.
    const rng = () => {
      const v = (calls % 100) / 100
      calls++
      return v
    }
    for (let i = 0; i < 100; i++) {
      const size = pickSpawnSize(rng)
      expect(size).toBeGreaterThanOrEqual(0)
      expect(size).toBeLessThanOrEqual(SPAWN_MAX_SIZE)
      expect(size).toBeLessThan(MAX_SIZE) // never spawns a large ball
    }
  })

  it('rng near 0 yields the smallest, near 1 yields SPAWN_MAX_SIZE', () => {
    expect(pickSpawnSize(() => 0)).toBe(0)
    expect(pickSpawnSize(() => 0.999)).toBe(SPAWN_MAX_SIZE)
  })
})

describe('isOverflow', () => {
  const topLine = 150

  it('reports overflow when a slow ball rests above the opening', () => {
    expect(isOverflow(140, topLine, 0.1)).toBe(true)
  })

  it('does not report overflow for a fast-moving ball above the line (mid-drop)', () => {
    expect(isOverflow(140, topLine, 5)).toBe(false)
  })

  it('does not report overflow for a ball below the opening', () => {
    expect(isOverflow(160, topLine, 0.1)).toBe(false)
  })

  it('respects the settle-speed threshold boundary', () => {
    expect(isOverflow(140, topLine, 0.54, 0.55)).toBe(true)
    expect(isOverflow(140, topLine, 0.55, 0.55)).toBe(false)
  })
})

describe('sizeInfo', () => {
  it('clamps out-of-range sizes', () => {
    expect(sizeInfo(-3)).toBe(SIZES[0])
    expect(sizeInfo(999)).toBe(SIZES[MAX_SIZE])
  })
})
