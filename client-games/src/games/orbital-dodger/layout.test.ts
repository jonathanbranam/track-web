import { describe, it, expect } from 'vitest'
import { panelInset, PANEL_W } from './layout'

// The game's own aspect: 400 × 720.
const GW = 400
const GH = 720
const drawnWidth = (w: number, h: number) => Math.min(w, (h * GW) / GH)

describe('panelInset', () => {
  it('insets by the full panel width when the game fits beside the panel', () => {
    // 1440 × 900 → game drawn 500 wide, 940 free.
    expect(panelInset(1440, 900, GW, GH)).toBe(PANEL_W)
  })

  it('insets only by the free space when there is some but not enough (game flush left)', () => {
    // 700 × 900 → game drawn 500 wide, 200 free.
    expect(panelInset(700, 900, GW, GH)).toBe(200)
  })

  it('does not move the game on a phone the game already fills', () => {
    // 390 × 844 → width-limited, drawn 390 wide, nothing free.
    expect(panelInset(390, 844, GW, GH)).toBe(0)
  })

  it('never shrinks the drawn game', () => {
    for (const [w, h] of [[1440, 900], [700, 900], [390, 844], [820, 1180], [1024, 600], [600, 1200]]) {
      const inset = panelInset(w, h, GW, GH)
      expect(drawnWidth(w - inset, h)).toBeCloseTo(drawnWidth(w, h), 6)
    }
  })

  it('returns 0 for an unmeasured container', () => {
    expect(panelInset(0, 0, GW, GH)).toBe(0)
  })
})
