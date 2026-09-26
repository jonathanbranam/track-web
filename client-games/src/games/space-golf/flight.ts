import type { Course } from './levels'
import type { Tuning } from './physics'
import {
  startFlight,
  stepFlight,
  type FlightState,
  type Lie,
  type Outcome,
  type ShotEvent,
  type ShotInput,
  type SimOptions,
  type Thrust,
} from './shot'

/**
 * A flight played live, a step at a time, so nudges can act on it. It runs the
 * same stepFlight as the forecast, so with no thrust it flies exactly the
 * forecast path. How many steps a frame buys (flight speed, slow motion) only
 * changes how fast it plays, never where it goes.
 */
export interface LiveFlight {
  shot: ShotInput
  state: FlightState
  /** Fractional steps owed to the next frame. */
  budget: number
  /** The last two points, for drawing between steps. */
  prev: { x: number; y: number }
  point: { x: number; y: number }
  hull: number
  /** Stars collected on this flight, in order. */
  stars: number[]
  outcome: Outcome | null
}

export function startLive(course: Course, lie: Lie, shot: ShotInput, opts: SimOptions, tuning: Tuning): LiveFlight {
  const state = startFlight(course, lie, shot, opts, tuning)
  const at = { x: state.x, y: state.y }
  return { shot, state, budget: 0, prev: at, point: at, hull: state.hull, stars: [], outcome: null }
}

/**
 * Advance by `steps` (fractional) simulation steps under `thrust`, stopping at
 * the outcome. Returns the events produced, in order.
 */
export function advanceLive(course: Course, f: LiveFlight, steps: number, thrust: Thrust | null, tuning: Tuning): ShotEvent[] {
  const events: ShotEvent[] = []
  f.budget += steps
  while (f.budget >= 1 && !f.outcome) {
    f.budget -= 1
    const r = stepFlight(course, f.state, thrust, tuning)
    f.prev = f.point
    f.point = { x: r.x, y: r.y }
    f.hull = r.hull
    for (const e of r.events) {
      events.push(e)
      if (e.kind === 'star') f.stars.push(e.star)
    }
    f.outcome = r.outcome
  }
  return events
}
