import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { PcType, NpcType, UnitDef } from '../games/dungeon-tactics-solo/types'
import {
  getAllDefs,
  setDef,
  diffDefs,
  loadScenario,
  loadFromServer,
} from '../games/dungeon-tactics-solo/defStore'
import ScenarioEditor from '../games/dungeon-tactics-solo/ScenarioEditor'

type UnitType = PcType | NpcType

// Standalone Unit Designer: the in-game ScenarioEditor relocated into the studio.
// It edits the SAME unit defs and saves the SAME Variants through the SAME defStore
// + `/scenarios/:s/unit-defs` endpoints — no new persistence.
//
// The in-game host wires the editor's callbacks to live-match reconciliation (HP
// shifts, NPC re-planning). Out here there is no running match, so the callbacks
// reduce to plain write-through into the shared store; persistence is identical.
export default function UnitDesignerPage() {
  const navigate = useNavigate()

  const getCurrentDefs = useCallback(() => getAllDefs(), [])

  // No match to reconcile: write through only the archetypes that actually
  // changed. The editor pre-clamps the incoming map, and Save persists the store.
  const applyEditedDefs = useCallback((defs: Record<UnitType, UnitDef>) => {
    for (const t of diffDefs(defs)) setDef(t, defs[t])
  }, [])

  // Swap the active scenario into the store (remembered per browser); no live
  // match to hot-apply to, so success is just whether the fetch+swap worked.
  const activateScenario = useCallback(async (id: string) => {
    const res = await loadScenario(id)
    return res.ok
  }, [])

  // Re-run the load path, discarding unsaved store edits.
  const reloadStore = useCallback(async () => {
    await loadFromServer()
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <Link to="/studio/dungeon-tactics" className="text-sm text-indigo-400 hover:text-indigo-300">
          &larr; Dungeon Tactics
        </Link>
        <span className="text-sm font-semibold">Unit Designer</span>
        <span className="w-12" />
      </div>
      <div className="relative flex-1 overflow-hidden">
        <ScenarioEditor
          getCurrentDefs={getCurrentDefs}
          applyEditedDefs={applyEditedDefs}
          activateScenario={activateScenario}
          reloadStore={reloadStore}
          onClose={() => navigate('/studio/dungeon-tactics')}
        />
      </div>
    </div>
  )
}
