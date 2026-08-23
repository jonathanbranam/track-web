import { describe, it, expect } from 'vitest'
import { css, pipHeightRatio, outlineRole, SOLICITED_SIDES } from './palette'
import type { TurnPhase, UnitKind } from './types'

describe('css', () => {
  it('zero-pads to six hex digits', () => {
    expect(css(0x00ff88)).toBe('#00ff88')
  })

  it('spells a full six-digit value unchanged', () => {
    expect(css(0xd4a853)).toBe('#d4a853')
  })

  it('pads black to all zeros', () => {
    expect(css(0x000000)).toBe('#000000')
  })
})

describe('pipHeightRatio', () => {
  // The test that says the extraction changed nothing: at the game's 80px
  // tile, these ratios must reproduce the pixel heights the game already
  // draws — 10px for a three-pip column (PC/NPC/power-center), 7px for the
  // tower's five.
  it('reproduces the game\'s present pixels at an 80px tile', () => {
    expect(pipHeightRatio(3) * 80).toBe(10)
    expect(pipHeightRatio(5) * 80).toBe(7)
  })
})

describe('outlineRole', () => {
  // The designer's table (design.md §3), both `seats` values.
  const GAME_SEATS: UnitKind[] = ['pc']
  const BENCH_SEATS: UnitKind[] = ['pc', 'npc']

  const gamePhases: Array<[TurnPhase, 'live' | 'idle', 'live' | 'idle']> = [
    ['placement', 'live', 'idle'],
    ['player', 'live', 'idle'],
    ['npc-move', 'idle', 'idle'],
    ['npc-attack', 'idle', 'idle'],
  ]
  it.each(gamePhases)('game, phase %s: pc %s, npc %s', (phase, pcExpected, npcExpected) => {
    expect(outlineRole({ phase, side: 'pc', seats: GAME_SEATS })).toBe(pcExpected)
    expect(outlineRole({ phase, side: 'npc', seats: GAME_SEATS })).toBe(npcExpected)
  })

  const benchPhases: Array<[TurnPhase, 'live' | 'idle', 'live' | 'idle']> = [
    ['placement', 'live', 'live'],
    ['player', 'live', 'idle'],
    ['npc-move', 'idle', 'live'],
    ['npc-attack', 'idle', 'live'],
  ]
  it.each(benchPhases)('bench, phase %s: pc %s, npc %s', (phase, pcExpected, npcExpected) => {
    expect(outlineRole({ phase, side: 'pc', seats: BENCH_SEATS })).toBe(pcExpected)
    expect(outlineRole({ phase, side: 'npc', seats: BENCH_SEATS })).toBe(npcExpected)
  })
})

describe('SOLICITED_SIDES', () => {
  // A named failure rather than only a compile error if a phase goes
  // unanswered — see tasks.md 2.3.
  it('covers every TurnPhase', () => {
    const phases: TurnPhase[] = ['placement', 'player', 'npc-move', 'npc-attack']
    for (const phase of phases) {
      expect(SOLICITED_SIDES[phase]).toBeDefined()
    }
    expect(Object.keys(SOLICITED_SIDES).sort()).toEqual([...phases].sort())
  })
})
