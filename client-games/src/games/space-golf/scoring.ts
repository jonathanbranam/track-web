import type { Tuning } from './physics'
import { starsCollected, type LevelRun } from './run'

/** Every term of a completed level's score, for the summary screen. */
export interface ScoreBreakdown {
  stars: number
  totalStars: number
  starPoints: number
  allStarsBonus: number
  hull: number
  hullPoints: number
  strokes: number
  strokeCost: number
  power: number
  powerCost: number
  /** Full-throttle seconds of nudging. */
  fuel: number
  fuelCost: number
  total: number
}

/**
 * stars × starPoints + all-stars bonus + hull × hullPoints
 *   − strokes × strokeCost − total power × powerCost − fuel used × fuelCost,
 *   floored at 0.
 */
export function scoreBreakdown(run: LevelRun, tuning: Tuning): ScoreBreakdown {
  const stars = starsCollected(run)
  const totalStars = run.collected.length
  const starPoints = stars * tuning.starPoints
  const allStarsBonus = totalStars > 0 && stars === totalStars ? tuning.allStarsBonus : 0
  const hullPoints = Math.round(run.hull) * tuning.hullPoints
  const strokeCost = run.strokes * tuning.strokeCost
  const powerCost = Math.round(run.powerUsed * tuning.powerCost)
  const fuelCost = Math.round(run.fuelUsed * tuning.fuelCost)
  const total = Math.max(0, starPoints + allStarsBonus + hullPoints - strokeCost - powerCost - fuelCost)
  return {
    stars,
    totalStars,
    starPoints,
    allStarsBonus,
    hull: Math.round(run.hull),
    hullPoints,
    strokes: run.strokes,
    strokeCost,
    power: run.powerUsed,
    powerCost,
    fuel: run.fuelUsed,
    fuelCost,
    total,
  }
}
