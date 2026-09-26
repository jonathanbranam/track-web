import { describe, it, expect } from 'vitest'
import { DEFAULT_TUNING } from './physics'
import { applyShot, startRun, START_HULL, type LevelRun } from './run'
import { scoreBreakdown } from './scoring'
import type { Outcome, ShotResult } from './shot'
import { testLevel } from './testCourse'

const T = DEFAULT_TUNING
const level = testLevel({ stars: [{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 200, y: 300 }] })

function result(outcome: Outcome | null, stars: number[] = [], finalHull = START_HULL): ShotResult {
  return { xs: [], ys: [], hull: [], zone: [], events: [], outcome, stars, length: 0, finalHull }
}

describe('startRun', () => {
  it('starts at the tee with full hull, no strokes and no stars', () => {
    const run = startRun(level)
    expect(run.lie).toEqual({ planet: 0, angle: 0, dir: -1 })
    expect(run).toMatchObject({ hull: 100, strokes: 0, powerUsed: 0, status: 'playing' })
    expect(run.collected).toEqual([false, false, false])
  })
})

describe('applyShot', () => {
  const run0 = startRun(level)
  const shot = { angle: 1.2, power: 0.4 }

  it('a lock moves the lie, keeps the stars, and counts the stroke and power', () => {
    const lie = { planet: 1, angle: 2, dir: 1 as const }
    const run = applyShot(run0, shot, result({ kind: 'lock', lie }, [0], 90), T)
    expect(run.lie).toEqual(lie)
    expect(run.collected).toEqual([true, false, false])
    expect(run).toMatchObject({ strokes: 1, hull: 90, powerUsed: 0.4, status: 'playing' })
  })

  it('out of bounds returns to the lie at the release angle, reverts stars, adds a penalty stroke and hull', () => {
    const run = applyShot(run0, shot, result({ kind: 'out-of-bounds' }, [0, 2], 80), T)
    expect(run.lie).toEqual({ ...run0.lie, angle: 1.2 })
    expect(run.collected).toEqual([false, false, false])
    expect(run.strokes).toBe(2)
    expect(run.hull).toBe(80 - T.obHullPenalty)
    expect(run.status).toBe('playing')
  })

  it('adrift is out of bounds without the hull penalty', () => {
    const run = applyShot(run0, shot, result({ kind: 'adrift' }, [1], 80), T)
    expect(run.strokes).toBe(2)
    expect(run.hull).toBe(80)
    expect(run.collected).toEqual([false, false, false])
  })

  it('the wormhole completes the level with the shot’s stars', () => {
    const run = applyShot(run0, shot, result({ kind: 'wormhole' }, [2]), T)
    expect(run.status).toBe('complete')
    expect(run.collected).toEqual([false, false, true])
  })

  it('destroyed ends the level at 0 hull', () => {
    const run = applyShot(run0, shot, result({ kind: 'destroyed' }, [], 0), T)
    expect(run).toMatchObject({ status: 'destroyed', hull: 0 })
  })

  it('an out-of-bounds penalty that empties the hull destroys the ship', () => {
    const run = applyShot({ ...run0, hull: 3 }, shot, result({ kind: 'out-of-bounds' }, [], 3), T)
    expect(run).toMatchObject({ status: 'destroyed', hull: 0 })
  })
})

describe('scoreBreakdown', () => {
  const eight = testLevel({ stars: Array.from({ length: 8 }, (_, i) => ({ x: 20 + i * 40, y: 100 })) })
  const run = (strokes: number, stars: number, hull: number, power: number): LevelRun => ({
    ...startRun(eight),
    strokes,
    hull,
    powerUsed: power,
    collected: Array.from({ length: 8 }, (_, i) => i < stars),
    status: 'complete',
  })

  it('stars beat a hole-in-one (the spec’s worked example)', () => {
    expect(scoreBreakdown(run(1, 1, 100, 1), T).total).toBe(165)
    expect(scoreBreakdown(run(3, 6, 80, 2), T).total).toBe(585)
  })

  it('adds the all-stars bonus only when every star is collected', () => {
    expect(scoreBreakdown(run(4, 8, 70, 2), T).allStarsBonus).toBe(T.allStarsBonus)
    expect(scoreBreakdown(run(4, 7, 70, 2), T).allStarsBonus).toBe(0)
  })

  it('never goes below zero', () => {
    expect(scoreBreakdown(run(40, 0, 1, 30), T).total).toBe(0)
  })

  it('reports every term', () => {
    const b = scoreBreakdown(run(3, 6, 80, 2), T)
    expect(b).toMatchObject({ stars: 6, totalStars: 8, starPoints: 600, hullPoints: 80, strokeCost: 75, powerCost: 20 })
  })
})
