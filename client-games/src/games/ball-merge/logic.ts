// Pure, render-free game logic for Ball Merge. Kept separate from the Phaser
// scene so the rules can be unit-tested without a canvas.

export interface BallSize {
  /** Discrete size index, 0 = smallest. */
  size: number
  /** Render/physics radius in game units. */
  radius: number
  /** Fill color (Phaser hex int). */
  color: number
  /** Points awarded when two balls of this size merge into the next size up. */
  points: number
}

export const SIZES: BallSize[] = [
  { size: 0, radius: 14, color: 0xef4444, points: 1 },
  { size: 1, radius: 20, color: 0xf97316, points: 3 },
  { size: 2, radius: 27, color: 0xeab308, points: 6 },
  { size: 3, radius: 36, color: 0x22c55e, points: 10 },
  { size: 4, radius: 47, color: 0x06b6d4, points: 15 },
  { size: 5, radius: 60, color: 0x6366f1, points: 21 },
  { size: 6, radius: 75, color: 0xa855f7, points: 28 },
]

/** Largest size index; balls at this size do not merge further. */
export const MAX_SIZE = SIZES.length - 1

/** Only the smallest sizes (0..SPAWN_MAX_SIZE) can be dropped; larger are earned. */
export const SPAWN_MAX_SIZE = 2

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
