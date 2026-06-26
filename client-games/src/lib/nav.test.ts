import { describe, it, expect } from 'vitest'
import { isInGame } from './nav'

// The nav-visibility rule: hidden in-game (under /game/…), shown everywhere else —
// crucially on the new /studio routes, which sit outside the /game namespace
// precisely so the two-tab nav stays visible there.
describe('isInGame', () => {
  it('is true for in-game routes', () => {
    expect(isInGame('/game/dungeon-tactics-solo')).toBe(true)
    expect(isInGame('/game/prototypes')).toBe(true)
    expect(isInGame('/game/foo/lobby')).toBe(true)
  })

  it('is false for studio routes so the nav stays visible', () => {
    expect(isInGame('/studio')).toBe(false)
    expect(isInGame('/studio/dungeon-tactics')).toBe(false)
    expect(isInGame('/studio/dungeon-tactics/unit-designer')).toBe(false)
  })

  it('is false for the home route', () => {
    expect(isInGame('/')).toBe(false)
  })
})
