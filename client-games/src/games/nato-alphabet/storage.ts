import type { Difficulty, Misses } from './nato'

const KEY = 'nato-alphabet.v1'

export interface Saved {
  /** Fastest 4-letter ID answered with no wrong tap, ms (0 = none yet). */
  bestIdMs: number
  /** Fastest completed run, ms (0 = none yet). */
  bestRunMs: number
  misses: Misses
  /** Options style for the hidden-ID stages. */
  difficulty: Difficulty
}

const EMPTY: Saved = { bestIdMs: 0, bestRunMs: 0, misses: {}, difficulty: 'medium' }

export function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}

export function save(s: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable: bests just aren't kept */
  }
}
