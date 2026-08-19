import { describe, it, expect } from 'vitest'
import { isInGame, hidesUserChip } from './nav'

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

// The chip-visibility rule is narrower than the nav rule: the map editor keeps its
// bottom nav but loses the chip, because the chip is fixed to the same top-right
// corner as the editor's Save button and would otherwise intercept its clicks.
describe('hidesUserChip', () => {
  it('hides the chip in-game, like the nav', () => {
    expect(hidesUserChip('/game/dungeon-tactics-solo')).toBe(true)
    expect(hidesUserChip('/game/prototypes')).toBe(true)
  })

  it('hides the chip on the map editor, whose Save button shares that corner', () => {
    expect(hidesUserChip('/studio/dungeon-tactics/maps/default')).toBe(true)
    expect(hidesUserChip('/studio/dungeon-tactics/maps/some-other-map')).toBe(true)
  })

  it('keeps the chip on studio routes with nothing in that corner', () => {
    expect(hidesUserChip('/studio')).toBe(false)
    expect(hidesUserChip('/studio/dungeon-tactics')).toBe(false)
    expect(hidesUserChip('/studio/dungeon-tactics/unit-designer')).toBe(false)
    // The map *list* is not the editor — no Save button, so the chip stays.
    expect(hidesUserChip('/studio/dungeon-tactics/maps')).toBe(false)
  })

  it('keeps the chip on the home route', () => {
    expect(hidesUserChip('/')).toBe(false)
  })
})
