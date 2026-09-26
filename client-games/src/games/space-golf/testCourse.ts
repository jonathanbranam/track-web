import type { Level } from './levels'

/** A minimal level for tests: one planet near the bottom of a tall bounce course. */
export function testLevel(over: Partial<Level> = {}): Level {
  return {
    id: 'test',
    name: 'Test',
    blurb: '',
    height: 2000,
    sides: 'bounce',
    tee: { planet: 0, angleDeg: 0, dir: -1 },
    planets: [{ x: 200, y: 1700, r: 40, color: 0 }],
    stars: [],
    // Far off to the side at the very top, so it rarely matters.
    wormhole: { x: 30, y: 30, r: 10 },
    pieces: [],
    ...over,
  }
}
