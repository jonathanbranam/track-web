import { DEFAULT_SETTINGS, type AimSettings } from './aim'
import { DEFAULT_TUNING, cloneTuning, type Tuning } from './physics'

/**
 * Per-browser memory: aim settings, tuning overrides and the last level played.
 * Storage can be missing or throw (private mode, blocked site data, Node under
 * test), so every access is guarded and falls back to the defaults.
 */

export const SETTINGS_KEY = 'space-golf:settings'
export const TUNING_KEY = 'space-golf:tuning'
export const LEVEL_KEY = 'space-golf:level'

export type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function defaultStorage(): KV | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function readJson(s: KV | null, key: string): unknown {
  try {
    const raw = s?.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(s: KV | null, key: string, value: string | null): void {
  try {
    if (value === null) s?.removeItem(key)
    else s?.setItem(key, value)
  } catch {
    // Not remembered — fine.
  }
}

export function loadSettings(s: KV | null = defaultStorage()): AimSettings {
  const v = readJson(s, SETTINGS_KEY) as Partial<AimSettings> | null
  return {
    release: v?.release === 'planned' || v?.release === 'timed' ? v.release : DEFAULT_SETTINGS.release,
    pause: typeof v?.pause === 'boolean' ? v.pause : DEFAULT_SETTINGS.pause,
  }
}

export function saveSettings(settings: AimSettings, s: KV | null = defaultStorage()): void {
  write(s, SETTINGS_KEY, JSON.stringify(settings))
}

/** Stored overrides layered over the shipped defaults; wrong-typed or unknown keys are ignored. */
export function loadTuning(s: KV | null = defaultStorage()): Tuning {
  const t = cloneTuning(DEFAULT_TUNING)
  const v = readJson(s, TUNING_KEY)
  if (!v || typeof v !== 'object') return t
  const rec = t as unknown as Record<string, unknown>
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (!(k in DEFAULT_TUNING)) continue
    const def = (DEFAULT_TUNING as unknown as Record<string, unknown>)[k]
    if (typeof def === 'number' && typeof val === 'number' && Number.isFinite(val)) rec[k] = val
    else if (typeof def === 'boolean' && typeof val === 'boolean') rec[k] = val
  }
  return t
}

/** Stores only the values that differ from the defaults, so new defaults still arrive. */
export function saveTuning(t: Tuning, s: KV | null = defaultStorage()): void {
  const diff: Record<string, unknown> = {}
  for (const k of Object.keys(DEFAULT_TUNING) as (keyof Tuning)[]) {
    if (t[k] !== DEFAULT_TUNING[k]) diff[k] = t[k]
  }
  write(s, TUNING_KEY, Object.keys(diff).length ? JSON.stringify(diff) : null)
}

export function clearTuning(s: KV | null = defaultStorage()): void {
  write(s, TUNING_KEY, null)
}

/** The level to pre-select: the remembered one if it still exists, else the first. */
export function loadLastLevel(ids: string[], s: KV | null = defaultStorage()): { id: string; stale: boolean } {
  let raw: string | null = null
  try {
    raw = s?.getItem(LEVEL_KEY) ?? null
  } catch {
    raw = null
  }
  if (raw && ids.includes(raw)) return { id: raw, stale: false }
  return { id: ids[0], stale: raw !== null }
}

export function saveLastLevel(id: string, s: KV | null = defaultStorage()): void {
  write(s, LEVEL_KEY, id)
}
