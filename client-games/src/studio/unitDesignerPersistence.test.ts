import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  GAME_SLUG,
  getAllDefs,
  setDef,
  diffDefs,
  loadScenario,
  reset,
} from '../games/dungeon-tactics-solo/defStore'
import { putUnitDefs } from '../api'
import type { PcType, NpcType, UnitDef } from '../games/dungeon-tactics-solo/types'

type UnitType = PcType | NpcType

// The Unit Designer page wires the editor's `applyEditedDefs` to this exact
// write-through (no running match to reconcile out in the studio).
function applyEditedDefs(defs: Record<UnitType, UnitDef>) {
  for (const t of diffDefs(defs)) setDef(t, defs[t])
}

afterEach(() => {
  reset()
  vi.unstubAllGlobals()
})

// The studio designer persists through the SAME defStore + `/scenarios/:s/unit-defs`
// endpoints as the in-game editor — no separate storage. This proves the round
// trip: an edit written through the store, PUT to the endpoint, then re-loaded
// from the endpoint is reflected in the shared store.
describe('Unit Designer persistence round-trip', () => {
  it('persists a studio edit through the endpoint and reflects it on reload', async () => {
    const captured: { body: Record<string, UnitDef> | null } = { body: null }

    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string, options?: RequestInit) => {
        // Save: capture the PUT body the studio sends (the store's current defs).
        if (options?.method === 'PUT') {
          captured.body = JSON.parse(options.body as string)
          return { ok: true, json: async () => ({}) } as Response
        }
        // Reload: serve back exactly what was persisted, like the server would.
        return {
          ok: true,
          json: async () => ({ scenarioId: 'sc1', unitDefs: captured.body }),
        } as Response
      }),
    )

    // Edit melee's max HP through the studio write-through path, then Save.
    const edited = getAllDefs()
    edited.melee = { ...edited.melee, maxHp: 17 }
    applyEditedDefs(edited)
    expect(getAllDefs().melee.maxHp).toBe(17) // applied live to the shared store

    await putUnitDefs<UnitDef>(GAME_SLUG, 'sc1', getAllDefs())
    expect(captured.body?.melee.maxHp).toBe(17) // the edit was sent to the endpoint

    // Discard in-memory state (a fresh reload) and load the scenario back: the
    // persisted edit must be reflected in the shared store the in-game editor reads.
    reset()
    expect(getAllDefs().melee.maxHp).not.toBe(17)
    const res = await loadScenario('sc1')
    expect(res.ok).toBe(true)
    expect(getAllDefs().melee.maxHp).toBe(17)
  })
})
