import type { Tuning } from './physics'

/**
 * The aim, as a pure model the scene drives with pointer events (design §7).
 *
 * - timed release: press anywhere, drag away to set power, let go to fire from
 *   wherever the ship is on the ring at that moment.
 * - planned release: drag along the ring to place a release marker, drag
 *   elsewhere to set power, fire with the Fire button.
 * - pause while aiming: the orbit freezes while a finger is down.
 * - shot: prograde (power only, the ship leaves along the orbit) or vector (the
 *   drag also sets the impulse direction — the way the finger moved).
 */

export type ReleaseMode = 'timed' | 'planned'
/** prograde: the drag sets power only. vector: it sets power and direction. */
export type ShotMode = 'prograde' | 'vector'

export interface AimSettings {
  shot: ShotMode
  release: ReleaseMode
  pause: boolean
  /** Slow the flight while a finger is down nudging. */
  slowMo: boolean
  /** Flight speed multiplier while slowed, 0.1..1. */
  slowMoSpeed: number
}

export const DEFAULT_SETTINGS: AimSettings = {
  shot: 'prograde',
  release: 'timed',
  pause: true,
  slowMo: true,
  slowMoSpeed: 0.35,
}

export interface Point {
  x: number
  y: number
}

export interface AimState {
  /** What the current press is dragging, or null with no finger down. */
  drag: 'power' | 'marker' | null
  /** Where a power drag began. */
  origin: Point | null
  power: number
  /** Planned mode: the release angle on the ring, radians. */
  marker: number | null
  /** Vector mode: unit direction of the impulse, from the press point toward the finger. */
  dir: Point | null
}

export const IDLE_AIM: AimState = { drag: null, origin: null, power: 0, marker: null, dir: null }

/** A press within this distance of the ring moves the planned-mode marker. */
export const MARKER_HIT = 24

/** The aim at the start of a new lie. Planned mode puts the marker on the ship. */
export function resetAim(settings: AimSettings, lieAngle: number): AimState {
  return settings.release === 'planned' ? { ...IDLE_AIM, marker: lieAngle } : IDLE_AIM
}

export function powerFromDrag(dist: number, tuning: Tuning): number {
  const span = tuning.powerFullDrag - tuning.powerDeadzone
  if (span <= 0) return dist >= tuning.powerDeadzone ? 1 : 0
  return Math.max(0, Math.min(1, (dist - tuning.powerDeadzone) / span))
}

/**
 * A finger goes down at `pt`. `ringDist` is its distance from the lie's ring
 * (|distance from the planet center − ring radius|); `angleAt` is its angle
 * around the planet.
 */
export function pressAim(state: AimState, settings: AimSettings, pt: Point, ringDist: number, angleAt: number): AimState {
  if (settings.release === 'planned' && ringDist <= MARKER_HIT) {
    return { ...state, drag: 'marker', origin: null, marker: angleAt }
  }
  return { ...state, drag: 'power', origin: pt, power: 0, dir: null }
}

export function moveAim(state: AimState, settings: AimSettings, pt: Point, angleAt: number, tuning: Tuning): AimState {
  if (state.drag === 'marker') return { ...state, marker: angleAt }
  if (state.drag === 'power' && state.origin) {
    const dx = pt.x - state.origin.x
    const dy = pt.y - state.origin.y
    const dist = Math.hypot(dx, dy)
    const power = powerFromDrag(dist, tuning)
    if (settings.shot !== 'vector') return { ...state, power }
    // Inside the deadzone the direction flails on tiny offsets: keep the last one.
    const dir = dist >= tuning.powerDeadzone ? { x: dx / dist, y: dy / dist } : state.dir
    return { ...state, power, dir }
  }
  return state
}

export type AimIntent = { kind: 'fire'; power: number; dir?: Point } | { kind: 'cancel' } | null

/** The finger comes up. In timed mode that fires (or cancels); in planned mode it just ends the drag. */
export function releaseAim(state: AimState, settings: AimSettings, tuning: Tuning): { state: AimState; intent: AimIntent } {
  if (state.drag === null) return { state, intent: null }
  if (settings.release === 'timed') {
    const intent: AimIntent =
      state.power >= tuning.minPower ? { kind: 'fire', power: state.power, ...shotDir(state, settings) } : { kind: 'cancel' }
    return { state: IDLE_AIM, intent }
  }
  return { state: { ...state, drag: null, origin: null }, intent: null }
}

/** With pause on, the orbit stands still while a finger is down. */
export function orbitFrozen(state: AimState, settings: AimSettings): boolean {
  return settings.pause && state.drag !== null
}

/** Planned mode: the Fire button is live once there is a marker and enough power. */
export function canFire(state: AimState, settings: AimSettings, tuning: Tuning): boolean {
  return settings.release === 'planned' && hasAim(state, settings, tuning)
}

/** The impulse direction a shot should carry: only in vector mode, and only once one is set. */
export function shotDir(state: AimState, settings: AimSettings): { dir?: Point } {
  return settings.shot === 'vector' && state.dir ? { dir: state.dir } : {}
}

/** Where the shot leaves the ring: the marker in planned mode, the ship's angle in timed mode. */
export function releaseAngle(state: AimState, settings: AimSettings, currentAngle: number): number {
  return settings.release === 'planned' && state.marker !== null ? state.marker : currentAngle
}

/** Whether there is an aim worth forecasting. */
export function hasAim(state: AimState, settings: AimSettings, tuning: Tuning): boolean {
  if (state.power < tuning.minPower) return false
  if (settings.shot === 'vector' && !state.dir) return false
  return settings.release === 'planned' ? state.marker !== null : state.drag === 'power'
}
