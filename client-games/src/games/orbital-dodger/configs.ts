import { DEFAULT_TUNING, cloneTuning, type ControlMode, type EdgeMode, type Tuning } from './physics'

/**
 * Saved tuning configs: pure helpers for layering a stored config over the
 * shipped defaults, comparing tuning, choosing which config to play, and
 * remembering that choice per browser.
 */

/** A config as the server returns it. `tuning` is whatever was saved — untrusted. */
export interface OrbitalConfig {
  id: number
  name: string
  isDefault: boolean
  tuning: Record<string, unknown>
  updatedAt: string
}

/** Allowed values for the string-valued tuning keys. */
export const ENUM_VALUES: { controlMode: readonly ControlMode[]; edgeMode: readonly EdgeMode[] } = {
  controlMode: ['relative', 'direct'],
  edgeMode: ['bounded', 'wrap'],
}

/**
 * The stored values layered over the shipped defaults. A key is taken only when
 * its type matches the shipped value's (and, for the string keys, is an allowed
 * option); anything else — missing, wrong type, unknown key — falls back to, or
 * is dropped in favour of, the shipped default.
 */
export function resolveTuning(stored: Record<string, unknown> | null | undefined): Tuning {
  const out = cloneTuning(DEFAULT_TUNING)
  if (!stored || typeof stored !== 'object') return out
  const target = out as unknown as Record<string, unknown>
  for (const key of Object.keys(DEFAULT_TUNING) as (keyof Tuning)[]) {
    const value = stored[key]
    if (typeof value !== typeof DEFAULT_TUNING[key]) continue
    if (typeof value === 'number' && !Number.isFinite(value)) continue
    if (key === 'controlMode' || key === 'edgeMode') {
      if (!(ENUM_VALUES[key] as readonly string[]).includes(value as string)) continue
    }
    target[key] = value
  }
  return out
}

/** True when every tuning key holds the same value in both. */
export function tuningEquals(a: Tuning, b: Tuning): boolean {
  return (Object.keys(DEFAULT_TUNING) as (keyof Tuning)[]).every((k) => a[k] === b[k])
}

/**
 * Which config to play: the remembered one if it still exists, otherwise the
 * Default. `stale` is true when a remembered id pointed at a config that is gone,
 * so the caller can forget it. Returns null config only for an empty list.
 */
export function pickConfig(
  configs: OrbitalConfig[],
  storedId: number | null,
): { config: OrbitalConfig | null; stale: boolean } {
  const fallback = configs.find((c) => c.isDefault) ?? configs[0] ?? null
  if (storedId === null) return { config: fallback, stale: false }
  const found = configs.find((c) => c.id === storedId)
  return found ? { config: found, stale: false } : { config: fallback, stale: true }
}

// Per-browser selection. Storage can throw (private mode, blocked site data),
// so every access is guarded and a failure just means "no selection".
export const SELECTED_KEY = 'orbital-dodger:config-id'

export function loadSelectedId(): number | null {
  try {
    const raw = localStorage.getItem(SELECTED_KEY)
    if (raw === null) return null
    const id = Number(raw)
    return Number.isInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export function saveSelectedId(id: number): void {
  try {
    localStorage.setItem(SELECTED_KEY, String(id))
  } catch {
    // Selection just won't persist.
  }
}

export function clearSelectedId(): void {
  try {
    localStorage.removeItem(SELECTED_KEY)
  } catch {
    // Nothing to clear.
  }
}
