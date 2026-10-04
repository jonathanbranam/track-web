import type { Mode } from './rules'

const key = (mode: Mode): string => `sinkhole-fair.best.${mode}`

export function loadBest(mode: Mode): number {
  try {
    const n = Number(localStorage.getItem(key(mode)))
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

export function saveBest(mode: Mode, score: number): void {
  try {
    localStorage.setItem(key(mode), String(score))
  } catch {
    /* storage unavailable: best score just isn't kept */
  }
}
