import { describe, expect, it } from 'vitest'
import { COVER_TARGET, IDS_PER_STAGE, LETTERS, MAX_MISTAKES, NATO, STAGES, answer, apply, endFlash, legalMoves, makeId, makeOptions, newGame, nextStage, pickLetter, stageCovered, type State } from './nato'

function seq(...v: number[]) {
  let i = 0
  return () => v[i++ % v.length]
}
/** Seeded PRNG: a short cycle could starve letter choice and loop a learning stage forever. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = seeded(7)

function solveId(s: State, t: number): State {
  for (let i = 0; i < 4; i++) s = answer(s, NATO[s.id[s.pos]].word, (t += 100), rng)
  return s
}
function clearStage(s: State, wrongFirst = 0): State {
  let t = 1000
  for (let k = 0; s.phase !== 'stageDone'; k++) {
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
  it('covers all 26 letters with enough distinct same-letter decoys', () => {
    expect(LETTERS).toHaveLength(26)
    for (const l of LETTERS) {
      const { word, decoys } = NATO[l]
      expect(word[0].toUpperCase()).toBe(l)
      expect(decoys.length).toBeGreaterThanOrEqual(5)
      expect(new Set(decoys).size).toBe(decoys.length)
      expect(decoys).not.toContain(word)
      for (const d of decoys) expect(d[0].toUpperCase()).toBe(l)
    }
  })
  it('uses ICAO spellings', () => {
    expect(NATO.A.word).toBe('Alfa')
    expect(NATO.J.word).toBe('Juliett')
    expect(NATO.X.word).toBe('X-ray')
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
  it('medium never has all four options on one letter, and includes other letters', () => {
    for (let i = 0; i < 40; i++) {
      for (const l of LETTERS) {
        const o = makeOptions(l, rng, 'medium')
        expect(o).toHaveLength(4)
        expect(new Set(o).size).toBe(4)
        expect(o.filter((w) => w === NATO[l].word)).toHaveLength(1)
        expect(new Set(o.map((w) => w[0].toUpperCase())).size).toBeGreaterThan(1)
      }
    }
  })
  it('hard is four real NATO words, one per distinct letter', () => {
    const words = new Set(LETTERS.map((l) => NATO[l].word))
    for (let i = 0; i < 50; i++) {
      for (const l of LETTERS) {
        const o = makeOptions(l, rng, 'hard')
        expect(o).toHaveLength(4)
        expect(o).toContain(NATO[l].word)
        for (const w of o) expect(words.has(w)).toBe(true)
        expect(new Set(o.map((w) => w[0])).size).toBe(4)
      }
    }
  })
  it('hidden-ID stages use the chosen difficulty; learning stages keep same-letter options', () => {
    let s = newGame(rng, 0, {}, 'hard')
    expect(new Set(s.options.map((w) => w[0])).size).toBe(1)
    for (let i = 0; i < 3; i++) s = nextStage(clearStage(s), 0, rng)
    s = endFlash(s, 0)
    expect(new Set(s.options.map((w) => w[0])).size).toBe(4)
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
  it('a learning stage does not pass while a letter is unseen, and passes once all are covered', () => {
    let s = newGame(rng, 0)
    // five IDs, but with every answer on one letter pool slot ignored: force a missing letter
    for (let k = 0; k < IDS_PER_STAGE; k++) s = solveId({ ...s, id: 'AAAA', options: makeOptions('A', rng) }, 100 * k)
    expect(s.phase).toBe('answer')
    expect(stageCovered(s)).toBe(false)
    expect(s.idInStage).toBe(IDS_PER_STAGE)
    s = clearStage(s)
    expect(s.phase).toBe('stageDone')
    expect(stageCovered(s)).toBe(true)
    for (const l of LETTERS.slice(0, STAGES[0].pool)) expect(s.covered[l]).toBeGreaterThanOrEqual(COVER_TARGET)
  })
  it('timed stages still end after five IDs', () => {
    let s = newGame(rng, 0)
    for (let i = 0; i < 3; i++) s = nextStage(clearStage(s), 0, rng)
    s = clearStage(s)
    expect(s.idInStage).toBe(IDS_PER_STAGE)
  })
  it('finishing an ID records its time', () => {
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
