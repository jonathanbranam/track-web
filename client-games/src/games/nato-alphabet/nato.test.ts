import { describe, expect, it } from 'vitest'
import { IDS_PER_STAGE, LETTERS, MAX_MISTAKES, NATO, STAGES, answer, apply, endFlash, legalMoves, makeId, makeOptions, newGame, nextStage, pickLetter, type State } from './nato'

function seq(...v: number[]) {
  let i = 0
  return () => v[i++ % v.length]
}
const rng = seq(0.1, 0.7, 0.3, 0.9, 0.5)

function solveId(s: State, t: number): State {
  for (let i = 0; i < 4; i++) s = answer(s, NATO[s.id[s.pos]].word, (t += 100), rng)
  return s
}
function clearStage(s: State, wrongFirst = 0): State {
  let t = 1000
  for (let k = 0; k < IDS_PER_STAGE; k++) {
    if (s.phase === 'flash') s = endFlash(s, t)
    for (let w = 0; w < (k === 0 ? wrongFirst : 0); w++) {
      const bad = s.options.find((o) => o !== NATO[s.id[s.pos]].word && !s.wrong.includes(o))!
      s = answer(s, bad, t, rng)
    }
    s = solveId(s, t)
    t += 1000
  }
  return s
}

describe('NATO table', () => {
  it('covers all 26 letters with enough distinct near-misses', () => {
    expect(LETTERS).toHaveLength(26)
    for (const l of LETTERS) {
      const { word, near } = NATO[l]
      expect(word[0].toUpperCase()).toBe(l)
      expect(near.length).toBeGreaterThanOrEqual(3)
      expect(new Set(near).size).toBe(near.length)
      expect(near).not.toContain(word)
    }
  })
  it('uses ICAO spellings', () => {
    expect(NATO.A.word).toBe('Alfa')
    expect(NATO.J.word).toBe('Juliett')
    expect(NATO.X.word).toBe('X-ray')
    expect(NATO.A.near).toContain('Alpha')
    expect(NATO.J.near).toContain('Juliet')
  })
})

describe('questions', () => {
  it('options hold the answer once plus three distinct distractors', () => {
    for (const l of LETTERS) {
      const o = makeOptions(l, Math.random)
      expect(o).toHaveLength(4)
      expect(new Set(o).size).toBe(4)
      expect(o.filter((w) => w === NATO[l].word)).toHaveLength(1)
    }
  })
  it('IDs are 4 letters from the pool', () => {
    const id = makeId(8, {}, Math.random)
    expect(id).toMatch(/^[A-H]{4}$/)
  })
  it('missed letters are picked more often', () => {
    const r = seq(0.5)
    expect(pickLetter(2, {}, r)).toBe('B')
    expect(pickLetter(2, { A: 5 }, r)).toBe('A')
  })
})

describe('play', () => {
  it('a wrong tap counts a mistake and a miss, the right tap advances', () => {
    let s = newGame(rng, 0)
    const letter = s.id[0]
    const bad = s.options.find((o) => o !== NATO[letter].word)!
    s = answer(s, bad, 50, rng)
    expect(s.mistakesStage).toBe(1)
    expect(s.misses[letter]).toBe(1)
    expect(s.pos).toBe(0)
    expect(answer(s, bad, 60, rng)).toBe(s)
    s = answer(s, NATO[letter].word, 200, rng)
    expect(s.pos).toBe(1)
    expect(s.tapMs).toEqual([200])
  })
  it('timed stages hide the ID after the flash and start the clock then', () => {
    let s = newGame(rng, 0)
    s = clearStage(s)
    s = clearStage(nextStage(s, 0, rng))
    s = clearStage(nextStage(s, 0, rng))
    s = nextStage(s, 5000, rng)
    expect(STAGES[s.stageIdx].flashMs).toBe(3000)
    expect(s.phase).toBe('flash')
    expect(answer(s, s.options[0], 5100, rng)).toBe(s)
    s = endFlash(s, 8000)
    expect(s.phase).toBe('answer')
    expect(s.roundStart).toBe(8000)
  })
  it('finishing an ID records its time; five IDs finish the stage', () => {
    let s = newGame(rng, 0)
    s = solveId(s, 0)
    expect(s.idMs).toEqual([400])
    expect(s.idInStage).toBe(1)
    s = clearStage(newGame(rng, 0))
    expect(s.phase).toBe('stageDone')
    expect(s.stageCleared).toBe(true)
  })
  it('too many mistakes repeats the stage', () => {
    let s = clearStage(newGame(rng, 0), MAX_MISTAKES + 1)
    expect(s.stageCleared).toBe(false)
    s = nextStage(s, 0, rng)
    expect(s.stageIdx).toBe(0)
    expect(s.idInStage).toBe(0)
    expect(s.mistakesStage).toBe(0)
  })
  it('clearing the last stage ends the run', () => {
    let s = newGame(rng, 0)
    for (let i = 0; i < STAGES.length; i++) {
      s = clearStage(s)
      expect(s.stageCleared).toBe(true)
      s = nextStage(s, 0, rng)
    }
    expect(s.over).toBe(true)
    expect(s.runMs).toBeGreaterThan(0)
    expect(legalMoves(s)).toEqual([])
  })
  it('legalMoves and apply agree', () => {
    const s = newGame(rng, 0)
    const m = legalMoves(s).find((x) => x.type === 'answer' && x.word === NATO[s.id[0]].word)!
    expect(apply(s, m, 10, rng).pos).toBe(1)
  })
})
