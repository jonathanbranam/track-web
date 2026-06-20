// Container shape definitions for Ball Merge. Each level describes the interior
// boundary as a list of wall segments; BallMergeScene converts them to physics bodies.

export interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface LevelDef {
  id: string
  name: string
  difficulty?: 'hard' | 'danger'
  /** Wall boundary as connected line segments forming the closed container sides and floor. */
  segments: Segment[]
  /** Y coordinate of the open top / overflow line. */
  topY: number
  /** Y coordinate where the held ball is shown and dropped from. */
  dropY: number
  /** Leftmost X the drop position can reach (interior wall + ball radius handled by scene). */
  dropMinX: number
  /** Rightmost X the drop position can reach. */
  dropMaxX: number
}

// Canvas is 400 × 640. All coordinates are in logical game units.

const BOX: LevelDef = {
  id: 'box',
  name: 'Box',
  segments: [
    { x1: 48, y1: 150, x2: 48, y2: 600 },   // left wall
    { x1: 352, y1: 150, x2: 352, y2: 600 },  // right wall
    { x1: 48, y1: 600, x2: 352, y2: 600 },   // floor
  ],
  topY: 150,
  dropY: 92,
  dropMinX: 62,
  dropMaxX: 338,
}

// U-shaped bowl: straight upper walls then 5-segment curve at the base.
// Balls roll toward center.
const BOWL: LevelDef = {
  id: 'bowl',
  name: 'Bowl',
  segments: [
    // left wall (straight)
    { x1: 48, y1: 150, x2: 48, y2: 460 },
    // left curve
    { x1: 48, y1: 460, x2: 66, y2: 520 },
    { x1: 66, y1: 520, x2: 100, y2: 567 },
    { x1: 100, y1: 567, x2: 152, y2: 594 },
    // floor (short flat section)
    { x1: 152, y1: 594, x2: 248, y2: 594 },
    // right curve
    { x1: 248, y1: 594, x2: 300, y2: 567 },
    { x1: 300, y1: 567, x2: 334, y2: 520 },
    { x1: 334, y1: 520, x2: 352, y2: 460 },
    // right wall (straight)
    { x1: 352, y1: 460, x2: 352, y2: 150 },
  ],
  topY: 150,
  dropY: 92,
  dropMinX: 62,
  dropMaxX: 338,
}

// Vase: wide flared mouth at the top, narrowing to a 120px neck (the overflow line),
// then expanding to a wide belly, then narrowing to a base.
// Balls must pass through the narrow neck into the belly; large merged balls can't exit.
const VASE: LevelDef = {
  id: 'vase',
  name: 'Vase',
  difficulty: 'hard',
  segments: [
    // left: wide mouth → neck → belly → base
    { x1: 80, y1: 150, x2: 140, y2: 210 },
    { x1: 140, y1: 210, x2: 60, y2: 340 },
    { x1: 60, y1: 340, x2: 62, y2: 470 },
    { x1: 62, y1: 470, x2: 100, y2: 568 },
    { x1: 100, y1: 568, x2: 130, y2: 600 },
    // floor
    { x1: 130, y1: 600, x2: 270, y2: 600 },
    // right: mirror
    { x1: 270, y1: 600, x2: 300, y2: 568 },
    { x1: 300, y1: 568, x2: 338, y2: 470 },
    { x1: 338, y1: 470, x2: 340, y2: 340 },
    { x1: 340, y1: 340, x2: 260, y2: 210 },
    { x1: 260, y1: 210, x2: 320, y2: 150 },
  ],
  topY: 150,
  dropY: 92,
  dropMinX: 80,
  dropMaxX: 320,
}

// Cauldron: dramatically wide flared top (340px), curving inward to a rounded base.
// The very wide opening makes it easy to drop balls in but the container fills fast.
// Long drop distance adds difficulty.
const CAULDRON: LevelDef = {
  id: 'cauldron',
  name: 'Cauldron',
  difficulty: 'hard',
  segments: [
    // left: very wide flared top → curves to waist → rounds to base
    { x1: 30, y1: 150, x2: 80, y2: 350 },
    { x1: 80, y1: 350, x2: 72, y2: 500 },
    { x1: 72, y1: 500, x2: 90, y2: 600 },
    // floor
    { x1: 90, y1: 600, x2: 310, y2: 600 },
    // right: mirror
    { x1: 310, y1: 600, x2: 328, y2: 500 },
    { x1: 328, y1: 500, x2: 320, y2: 350 },
    { x1: 320, y1: 350, x2: 370, y2: 150 },
  ],
  topY: 150,
  dropY: 50,
  dropMinX: 44,
  dropMaxX: 356,
}

// Test tube: narrow (~140px interior), tall, with a semicircular base (6 segments).
// Very constrained; balls stack vertically and overflow comes quickly.
const TEST_TUBE: LevelDef = {
  id: 'test-tube',
  name: 'Test Tube',
  difficulty: 'danger',
  segments: [
    // left wall (straight)
    { x1: 130, y1: 150, x2: 130, y2: 510 },
    // semicircle base (6 segments)
    { x1: 130, y1: 510, x2: 140, y2: 552 },
    { x1: 140, y1: 552, x2: 163, y2: 584 },
    { x1: 163, y1: 584, x2: 200, y2: 598 },
    { x1: 200, y1: 598, x2: 237, y2: 584 },
    { x1: 237, y1: 584, x2: 260, y2: 552 },
    { x1: 260, y1: 552, x2: 270, y2: 510 },
    // right wall (straight)
    { x1: 270, y1: 510, x2: 270, y2: 150 },
  ],
  topY: 150,
  dropY: 92,
  dropMinX: 144,
  dropMaxX: 256,
}

// Diamond: pointed base (nearly), widest at mid-height, straight slanted walls.
// Balls fan outward as the stack rises; unusual stacking dynamics.
const DIAMOND: LevelDef = {
  id: 'diamond',
  name: 'Diamond',
  difficulty: 'danger',
  segments: [
    // left wall: wide at top → narrow at mid → wide at bottom
    { x1: 56, y1: 150, x2: 120, y2: 380 },
    { x1: 120, y1: 380, x2: 172, y2: 590 },
    // tiny flat bottom (prevents a perfect point that traps balls)
    { x1: 172, y1: 590, x2: 228, y2: 590 },
    // right wall: mirror
    { x1: 228, y1: 590, x2: 280, y2: 380 },
    { x1: 280, y1: 380, x2: 344, y2: 150 },
  ],
  topY: 150,
  dropY: 92,
  dropMinX: 70,
  dropMaxX: 330,
}

// Hex: hexagonal interior with sharp angled sides — no curves.
// Geometric shape; angled walls create predictable slide paths.
const HEX: LevelDef = {
  id: 'hex',
  name: 'Hexagon',
  difficulty: 'hard',
  segments: [
    // top-left angled wall
    { x1: 100, y1: 150, x2: 56, y2: 290 },
    // left wall (vertical)
    { x1: 56, y1: 290, x2: 56, y2: 460 },
    // bottom-left angled wall
    { x1: 56, y1: 460, x2: 130, y2: 600 },
    // floor
    { x1: 130, y1: 600, x2: 270, y2: 600 },
    // bottom-right angled wall
    { x1: 270, y1: 600, x2: 344, y2: 460 },
    // right wall (vertical)
    { x1: 344, y1: 460, x2: 344, y2: 290 },
    // top-right angled wall
    { x1: 344, y1: 290, x2: 300, y2: 150 },
  ],
  topY: 150,
  dropY: 92,
  dropMinX: 70,
  dropMaxX: 330,
}

// Pit: very wide and shallow. Overflow arrives fast; long drop distance adds chaos.
// The widest level — most horizontal room but least vertical buffer and balls arrive
// with high momentum from the elevated drop position.
const PIT: LevelDef = {
  id: 'pit',
  name: 'Pit',
  segments: [
    { x1: 20, y1: 220, x2: 20, y2: 600 },   // left wall
    { x1: 380, y1: 220, x2: 380, y2: 600 },  // right wall
    { x1: 20, y1: 600, x2: 380, y2: 600 },   // floor
  ],
  topY: 220,
  dropY: 40,
  dropMinX: 34,
  dropMaxX: 366,
}

export const LEVELS: LevelDef[] = [BOX, BOWL, VASE, CAULDRON, TEST_TUBE, DIAMOND, HEX, PIT]

export function findLevel(id: string): LevelDef {
  return LEVELS.find((l) => l.id === id) ?? BOX
}
