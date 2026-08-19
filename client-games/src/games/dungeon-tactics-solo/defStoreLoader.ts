import type { UnitDef } from '@repo/dungeon-engine'
import { applyLoaded, resetDefs } from '@repo/dungeon-engine'
import { fetchUnitDefs, fetchScenarioUnitDefs } from '../../api'

// The browser host's loading half of the unit-definition store. The engine
// package owns the in-memory table and its getters/setters; everything that
// talks to the server or to browser storage lives here.
//
// At game start `loadFromServer()` populates the engine's store from the
// persisted default scenario; if that fetch fails the store keeps the bundled
// `unitDefs` table so the game stays playable offline / on error. There is no
// polling / mid-session re-fetch; `loadFromServer()` is re-run only by the
// explicit "Reload from server" control.
//
// Scenario selection is client-side: the active scenario is whatever the user
// last picked in the editor, remembered per browser in localStorage. The game
// starts on that selection (falling back to the server's default scenario when
// there is no/stale selection). The DB default stays the canonical seed/fallback.

export const GAME_SLUG = 'dungeon-tactics-solo'

// localStorage key for the per-browser active-scenario selection.
const ACTIVE_KEY = 'dungeon-tactics:active-scenario'

function readActiveId(): string | null {
  try { return localStorage.getItem(ACTIVE_KEY) } catch { return null }
}

function writeActiveId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch { /* localStorage unavailable — selection just isn't remembered */ }
}

let loadedScenarioId: string | null = null

export function loadedScenario(): string | null {
  return loadedScenarioId
}

// Load the active scenario into the store at game start (and on "Reload from
// server"). Prefers the per-browser selection (localStorage); falls back to the
// server's default scenario when there is no selection or it is stale/missing.
// On total failure the store is left as-is (bundled defaults) so the game stays
// playable. Returns whether a load succeeded and which scenario is now active.
export async function loadFromServer(): Promise<{ ok: boolean; scenarioId: string | null }> {
  const preferred = readActiveId()
  if (preferred) {
    try {
      applyLoaded(await fetchScenarioUnitDefs<UnitDef>(GAME_SLUG, preferred))
      loadedScenarioId = preferred
      return { ok: true, scenarioId: preferred }
    } catch {
      // Stale/deleted selection — forget it and fall back to the default.
      writeActiveId(null)
    }
  }
  try {
    const { scenarioId, unitDefs: loaded } = await fetchUnitDefs<UnitDef>(GAME_SLUG)
    applyLoaded(loaded)
    loadedScenarioId = scenarioId
    return { ok: true, scenarioId }
  } catch {
    console.warn('[dungeon-tactics] unit-def fetch failed; using bundled defaults')
    return { ok: false, scenarioId: null }
  }
}

// Switch the active scenario: fetch its defs, swap the store, and remember the
// selection (per browser) so the game starts on it next time. The caller is
// responsible for any board redraw / HP reconciliation. Returns success.
export async function loadScenario(scenarioId: string): Promise<{ ok: boolean }> {
  try {
    applyLoaded(await fetchScenarioUnitDefs<UnitDef>(GAME_SLUG, scenarioId))
    loadedScenarioId = scenarioId
    writeActiveId(scenarioId)
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

// Restore every archetype to its bundled default and forget which scenario is
// loaded (tests / fallback) — the host-side counterpart of the engine's
// `reset()`, which knows nothing about the active selection.
export function reset(): void {
  resetDefs()
  loadedScenarioId = null
}
