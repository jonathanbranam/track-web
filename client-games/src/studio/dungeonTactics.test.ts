import { describe, it, expect } from 'vitest'
import { DT_STUDIO_TOOLS } from './dungeonTactics'

// The DT studio hub is data-driven by DT_STUDIO_TOOLS. The Unit Designer and the
// Map editor are both available and route to their pages.
describe('DT_STUDIO_TOOLS', () => {
  it('lists the Unit Designer as available, routing to its page', () => {
    const designer = DT_STUDIO_TOOLS.find((t) => t.label === 'Unit Designer')
    expect(designer).toBeDefined()
    expect(designer?.status).toBe('available')
    expect(designer?.path).toBe('/studio/dungeon-tactics/unit-designer')
  })

  it('lists the Map editor as available, routing to the map list', () => {
    const mapEditor = DT_STUDIO_TOOLS.find((t) => t.label === 'Map editor')
    expect(mapEditor).toBeDefined()
    expect(mapEditor?.status).toBe('available')
    expect(mapEditor?.path).toBe('/studio/dungeon-tactics/maps')
  })
})
