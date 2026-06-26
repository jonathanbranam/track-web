import { describe, it, expect } from 'vitest'
import { STUDIO_GAMES } from './registry'

// The generic /studio hub is data-driven by STUDIO_GAMES. For this change it must
// list Dungeon Tactics linking to its hub.
describe('STUDIO_GAMES', () => {
  it('registers Dungeon Tactics linking to its studio hub', () => {
    const dt = STUDIO_GAMES.find((g) => g.slug === 'dungeon-tactics')
    expect(dt).toBeDefined()
    expect(dt?.name).toBe('Dungeon Tactics')
    expect(dt?.hubPath).toBe('/studio/dungeon-tactics')
  })

  it('has unique slugs and absolute hub paths', () => {
    const slugs = STUDIO_GAMES.map((g) => g.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const g of STUDIO_GAMES) expect(g.hubPath.startsWith('/studio/')).toBe(true)
  })
})
