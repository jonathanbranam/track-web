import { describe, it, expect } from 'vitest'
import { gameDefaultFor } from './gameDefaults'

describe('gameDefaultFor', () => {
  it('returns 3 rounds for Sushi Go and Tides of Time (case/space-insensitive)', () => {
    expect(gameDefaultFor('Sushi Go')).toEqual({ rounds: 3 })
    expect(gameDefaultFor('  sushi go ')).toEqual({ rounds: 3 })
    expect(gameDefaultFor('TIDES OF TIME')).toEqual({ rounds: 3 })
  })

  it('returns null for unknown games', () => {
    expect(gameDefaultFor('Uno')).toBeNull()
    expect(gameDefaultFor('')).toBeNull()
  })
})
