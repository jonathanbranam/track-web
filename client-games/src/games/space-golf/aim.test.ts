import { describe, it, expect } from 'vitest'
import {
  IDLE_AIM,
  MARKER_HIT,
  canFire,
  hasAim,
  moveAim,
  orbitFrozen,
  powerFromDrag,
  pressAim,
  releaseAim,
  releaseAngle,
  resetAim,
  type AimSettings,
} from './aim'
import { DEFAULT_TUNING } from './physics'

const T = DEFAULT_TUNING
const timed: AimSettings = { release: 'timed', pause: false }
const timedPause: AimSettings = { release: 'timed', pause: true }
const planned: AimSettings = { release: 'planned', pause: false }
const plannedPause: AimSettings = { release: 'planned', pause: true }

const far = T.powerFullDrag + 10

describe('powerFromDrag', () => {
  it('is 0 inside the deadzone, 1 at full drag, linear between', () => {
    expect(powerFromDrag(T.powerDeadzone - 1, T)).toBe(0)
    expect(powerFromDrag(T.powerFullDrag, T)).toBe(1)
    expect(powerFromDrag(far, T)).toBe(1)
    expect(powerFromDrag((T.powerDeadzone + T.powerFullDrag) / 2, T)).toBeCloseTo(0.5)
  })
})

describe('timed release', () => {
  it('press, drag and let go fires with the dragged power', () => {
    let s = pressAim(IDLE_AIM, timed, { x: 100, y: 100 }, 200, 0)
    s = moveAim(s, { x: 100, y: 100 + far }, 0, T)
    expect(hasAim(s, timed, T)).toBe(true)
    const r = releaseAim(s, timed, T)
    expect(r.intent).toEqual({ kind: 'fire', power: 1 })
    expect(r.state).toEqual(IDLE_AIM)
  })

  it('dragging back to the start and letting go cancels', () => {
    let s = pressAim(IDLE_AIM, timed, { x: 100, y: 100 }, 200, 0)
    s = moveAim(s, { x: 100, y: 100 + far }, 0, T)
    s = moveAim(s, { x: 102, y: 101 }, 0, T)
    expect(releaseAim(s, timed, T).intent).toEqual({ kind: 'cancel' })
  })

  it('fires from the ship’s current angle, not a marker', () => {
    const s = { ...IDLE_AIM, marker: 2 }
    expect(releaseAngle(s, timed, 0.7)).toBe(0.7)
  })

  it('a press near the ring is still a power drag', () => {
    const s = pressAim(IDLE_AIM, timed, { x: 0, y: 0 }, 0, 1)
    expect(s.drag).toBe('power')
  })

  it('pause off: the orbit never freezes; pause on: it freezes only while pressed', () => {
    const pressed = pressAim(IDLE_AIM, timedPause, { x: 0, y: 0 }, 200, 0)
    expect(orbitFrozen(pressed, timed)).toBe(false)
    expect(orbitFrozen(IDLE_AIM, timedPause)).toBe(false)
    expect(orbitFrozen(pressed, timedPause)).toBe(true)
    expect(orbitFrozen(releaseAim(pressed, timedPause, T).state, timedPause)).toBe(false)
  })
})

describe('planned release', () => {
  it('starts with the marker on the ship', () => {
    expect(resetAim(planned, 1.5).marker).toBe(1.5)
    expect(resetAim(timed, 1.5).marker).toBeNull()
  })

  it('a press near the ring moves the marker; elsewhere it sets power', () => {
    let s = resetAim(planned, 0)
    s = pressAim(s, planned, { x: 0, y: 0 }, MARKER_HIT - 1, 1)
    expect(s).toMatchObject({ drag: 'marker', marker: 1 })
    s = moveAim(s, { x: 0, y: 0 }, 2, T)
    expect(s.marker).toBe(2)
    s = releaseAim(s, planned, T).state
    s = pressAim(s, planned, { x: 0, y: 0 }, MARKER_HIT + 50, 3)
    expect(s).toMatchObject({ drag: 'power', marker: 2 })
    s = moveAim(s, { x: far, y: 0 }, 3, T)
    expect(s.power).toBe(1)
  })

  it('letting go never fires; the Fire button does, once there is power', () => {
    let s = resetAim(planned, 0)
    expect(canFire(s, planned, T)).toBe(false)
    s = pressAim(s, planned, { x: 0, y: 0 }, 200, 0)
    s = moveAim(s, { x: far, y: 0 }, 0, T)
    const r = releaseAim(s, planned, T)
    expect(r.intent).toBeNull()
    expect(r.state.power).toBe(1)
    expect(canFire(r.state, planned, T)).toBe(true)
    expect(releaseAngle(r.state, planned, 5)).toBe(0) // the marker, not the ship
    expect(hasAim(r.state, planned, T)).toBe(true)
  })

  it('pause on freezes the orbit while dragging the marker', () => {
    const s = pressAim(resetAim(plannedPause, 0), plannedPause, { x: 0, y: 0 }, 0, 0)
    expect(orbitFrozen(s, plannedPause)).toBe(true)
  })
})
