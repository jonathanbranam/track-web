import type { PcType, NpcType, UnitDef } from './types'
import { unitDefs } from './unitDefs'
import { fetchUnitDefs, fetchScenarioUnitDefs } from '../../api'

// The single in-memory source of truth the engine reads unit stats from.
//
// This module replaces the Stage 1 / admin-mode `statOverrides.ts` session layer.
// At game start `loadFromServer()` populates the store from the persisted default
// scenario; if that fetch fails the store keeps the bundled `unitDefs.ts` table so
// the game stays playable offline / on error. The engine (`pc.ts`, `npc.ts`,
// `DungeonTacticsScene.ts`) reads stats only through the getters here — the
// bundled table is imported solely as the fallback seed.
//
// Editing mutates this store directly (instant effect, no reload); the editor
// persists the active scenario's defs in bulk only on explicit Save. There is no
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

type UnitType = PcType | NpcType

const ALL_UNIT_TYPES: UnitType[] = [
  'melee', 'ranger', 'magic-user', 'rogue', 'short-range', 'long-range',
]

// Engine-valid ranges, mirroring the Zod write schema so a live-applied value can
// never be one the bulk write would later reject.
const HP_MIN = 1
const HP_MAX = 9
const MOVE_MIN = 0
const MOVE_MAX = 12

let store: Record<UnitType, UnitDef>
let loadedScenarioId: string | null = null

function clone(def: UnitDef): UnitDef {
  return {
    maxHp: def.maxHp,
    movement: { range: def.movement.range },
    attack: {
      damage: def.attack.damage,
      targeting: { ...def.attack.targeting },
      propagation: { ...def.attack.propagation },
    },
  }
}

function seedFromBundled() {
  store = {} as Record<UnitType, UnitDef>
  for (const t of ALL_UNIT_TYPES) store[t] = clone(unitDefs[t])
}

seedFromBundled()

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

// Clamp every numeric field of a def to the engine-valid ranges (mirroring the
// Zod write schema: max HP [1,9], move [0,12], non-negative integer damage and
// targeting ranges). Used at live-apply commit time so the running match can
// never hold a value the bulk write would reject.
export function clampDef(def: UnitDef): UnitDef {
  const t = def.attack.targeting
  return {
    maxHp: clampInt(def.maxHp, HP_MIN, HP_MAX),
    movement: { range: clampInt(def.movement.range, MOVE_MIN, MOVE_MAX) },
    attack: {
      damage: clampInt(def.attack.damage, 0, 99),
      targeting: {
        ...t,
        minRange: clampInt(t.minRange, 0, 99),
        maxRange: clampInt(t.maxRange, 0, 99),
      },
      propagation: { ...def.attack.propagation },
    },
  }
}

// Structural def equality over the fields the engine reads: maxHp, move range,
// and the full attack block.
function defsEqual(a: UnitDef, b: UnitDef): boolean {
  return (
    a.maxHp === b.maxHp &&
    a.movement.range === b.movement.range &&
    a.attack.damage === b.attack.damage &&
    a.attack.targeting.minRange === b.attack.targeting.minRange &&
    a.attack.targeting.maxRange === b.attack.targeting.maxRange &&
    a.attack.targeting.mode === b.attack.targeting.mode &&
    a.attack.targeting.arc === b.attack.targeting.arc &&
    a.attack.propagation.shape === b.attack.propagation.shape &&
    a.attack.propagation.penetration === b.attack.propagation.penetration
  )
}

// Given an incoming def map, return the set of archetypes whose def differs from
// the store's current value. Drives the granular HP-reconcile + NPC re-plan: the
// editor passes its (clamped) edited map; Reload passes a pre-reload snapshot
// (which, compared against the post-reload store, yields exactly the restored
// archetypes).
export function diffDefs(incoming: Partial<Record<UnitType, UnitDef>>): Set<UnitType> {
  const changed = new Set<UnitType>()
  for (const t of ALL_UNIT_TYPES) {
    const next = incoming[t]
    if (next && !defsEqual(getDef(t), next)) changed.add(t)
  }
  return changed
}

// ─── Reads (the single engine seam) ────────────────────────────────────────────

export function getDef(unitType: UnitType): UnitDef {
  return store[unitType] ?? unitDefs[unitType]
}

export function getMaxHp(unitType: UnitType): number {
  return getDef(unitType).maxHp
}

export function getMoveRange(unitType: UnitType): number {
  return getDef(unitType).movement.range
}

// A defensive copy of the full table for editor seeding.
export function getAllDefs(): Record<UnitType, UnitDef> {
  const out = {} as Record<UnitType, UnitDef>
  for (const t of ALL_UNIT_TYPES) out[t] = clone(getDef(t))
  return out
}

export function loadedScenario(): string | null {
  return loadedScenarioId
}

// ─── Write-through edits (immediate; persistence is the caller's job) ───────────

// Replace an archetype's full def in the store (used by the editor panel for the
// currently-loaded scenario so edits apply without a reload).
export function setDef(unitType: UnitType, def: UnitDef): void {
  store[unitType] = clone(def)
}

export function setMaxHp(unitType: UnitType, n: number): number {
  const v = clampInt(n, HP_MIN, HP_MAX)
  store[unitType] = { ...getDef(unitType), maxHp: v }
  return v
}

export function setMoveRange(unitType: UnitType, n: number): number {
  const v = clampInt(n, MOVE_MIN, MOVE_MAX)
  const def = getDef(unitType)
  store[unitType] = { ...def, movement: { ...def.movement, range: v } }
  return v
}

// ─── Server load / reload (no polling — called once at start, then on demand) ───

// Replace the store from a fetched def map: start from bundled defaults, then
// overlay every archetype the server knows so a partial response can never leave
// an archetype undefined.
function applyLoaded(loaded: Record<string, UnitDef>): void {
  seedFromBundled()
  for (const t of ALL_UNIT_TYPES) {
    if (loaded[t]) store[t] = clone(loaded[t])
  }
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

// Restore every archetype to its bundled default (tests / fallback).
export function reset(): void {
  seedFromBundled()
  loadedScenarioId = null
}
