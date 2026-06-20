// Pure, render-free game logic for Ball Merge. Kept separate from the Phaser
// scene so the rules can be unit-tested without a canvas.

export interface BallSize {
  /** Discrete size index, 0 = smallest. */
  size: number
  /** Human-readable sport name. */
  label: string
  /** Render/physics radius in game units. For ellipse balls, this equals radiusX (the larger axis). */
  radius: number
  /** Semi-major (horizontal) axis for ellipse balls; absent means circular. */
  radiusX?: number
  /** Semi-minor (vertical) axis for ellipse balls; absent means circular. */
  radiusY?: number
  /** Fill color (Phaser hex int). */
  color: number
  /** Points awarded when two balls of this size merge into the next size up. */
  points: number
}

export const SIZES: BallSize[] = [
  { size:  0, label: 'Ping Pong',   radius:  12,                         color: 0xff6b35, points:  1 },
  { size:  1, label: 'Golf Ball',   radius:  15,                         color: 0xfafafa, points:  3 },
  { size:  2, label: 'Tennis',      radius:  20,                         color: 0xcfff04, points:  6 },
  { size:  3, label: 'Baseball',    radius:  27,                         color: 0xfef3c7, points: 10 },
  { size:  4, label: 'Softball',    radius:  36,                         color: 0xfde047, points: 15 },
  { size:  5, label: 'Volleyball',  radius:  48,                         color: 0x60a5fa, points: 21 },
  { size:  6, label: 'Soccer',      radius:  61,                         color: 0x1f2937, points: 28 },
  { size:  7, label: 'Basketball',  radius:  74,                         color: 0xe05d10, points: 36 },
  { size:  8, label: 'Football',    radius:  84, radiusX: 84, radiusY: 50, color: 0x78350f, points: 45 },
  { size:  9, label: 'Beach Ball',  radius:  96,                         color: 0xf43f5e, points: 55 },
  { size: 10, label: 'Yoga Ball',   radius: 110,                         color: 0x818cf8, points: 66 },
]

/** Largest size index; balls at this size do not merge further. */
export const MAX_SIZE = SIZES.length - 1

/** Only the smallest sizes (0..SPAWN_MAX_SIZE) can be dropped; larger are earned. */
export const SPAWN_MAX_SIZE = 4

export function sizeInfo(size: number): BallSize {
  const clamped = Math.max(0, Math.min(size, MAX_SIZE))
  return SIZES[clamped]
}

/** The size produced by merging two balls of `size`, or `null` at the max size. */
export function nextSize(size: number): number | null {
  return size >= MAX_SIZE ? null : size + 1
}

/** Points awarded for merging two balls of `size`. */
export function mergeScore(size: number): number {
  return sizeInfo(size).points
}

/** Pick a spawn size from the small end of the range. `rng` returns [0, 1). */
export function pickSpawnSize(rng: () => number = Math.random): number {
  return Math.floor(rng() * (SPAWN_MAX_SIZE + 1))
}

/**
 * A ball has fallen/overflowed outside the container when its top edge is above
 * the container's open top (`topLine`) and it has effectively stopped moving.
 * A ball still moving (e.g. mid-drop through the opening) does not count.
 */
export function isOverflow(
  ballTopEdgeY: number,
  topLine: number,
  speed: number,
  settleSpeed = 0.55,
): boolean {
  return ballTopEdgeY < topLine && speed < settleSpeed
}
