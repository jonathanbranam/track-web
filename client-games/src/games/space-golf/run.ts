import type { Level } from './levels'
import type { Tuning } from './physics'
import type { Lie, ShotInput, ShotResult } from './shot'

/**
 * The state of one attempt at a level, and the rules for what a shot does to
 * it. Pure, so out-of-bounds penalties and star reverts are tested without Phaser.
 */

export const START_HULL = 100

export type RunStatus = 'playing' | 'complete' | 'destroyed'

export interface LevelRun {
  lie: Lie
  hull: number
  strokes: number
  /** Per star: collected yet. */
  collected: boolean[]
  /** Sum of every fired shot's power. */
  powerUsed: number
  /** Full-throttle seconds of nudging, over every flight. */
  fuelUsed: number
  status: RunStatus
}

export function startRun(level: Level): LevelRun {
  return {
    lie: { planet: level.tee.planet, angle: (level.tee.angleDeg * Math.PI) / 180, dir: level.tee.dir },
    hull: START_HULL,
    strokes: 0,
    collected: level.stars.map(() => false),
    powerUsed: 0,
    fuelUsed: 0,
    status: 'playing',
  }
}

/** What applyShot needs from a flight — a simulated ShotResult, or a live flight's summary. */
export type FlightSummary = Pick<ShotResult, 'outcome' | 'stars' | 'finalHull' | 'fuelUsed'>

/**
 * The run after a fired shot resolves. A cancelled aim never reaches here. Fuel,
 * like hull, stays spent whatever the outcome.
 */
export function applyShot(run: LevelRun, shot: ShotInput, result: FlightSummary, tuning: Tuning): LevelRun {
  const next: LevelRun = {
    ...run,
    strokes: run.strokes + 1,
    powerUsed: run.powerUsed + shot.power,
    fuelUsed: run.fuelUsed + result.fuelUsed,
    hull: result.finalHull,
  }
  const withStars = () => {
    const c = run.collected.slice()
    for (const i of result.stars) c[i] = true
    return c
  }
  const outcome = result.outcome ?? { kind: 'adrift' as const }

  switch (outcome.kind) {
    case 'lock':
      return { ...next, lie: outcome.lie, collected: withStars() }
    case 'wormhole':
      return { ...next, collected: withStars(), status: 'complete' }
    case 'destroyed':
      return { ...next, hull: 0, collected: withStars(), status: 'destroyed' }
    case 'out-of-bounds':
    case 'adrift': {
      // The shot didn't count: back to where it left, its stars go back, plus a
      // penalty stroke. Hull lost on the way stays lost.
      const penalty = outcome.kind === 'out-of-bounds' ? tuning.obHullPenalty : 0
      const hull = Math.max(0, result.finalHull - penalty)
      return {
        ...next,
        strokes: next.strokes + 1,
        lie: { ...run.lie, angle: shot.angle },
        collected: run.collected.slice(),
        hull,
        status: hull <= 0 ? 'destroyed' : 'playing',
      }
    }
  }
}

export function starsCollected(run: LevelRun): number {
  return run.collected.filter(Boolean).length
}
