import { useCallback, useEffect, useState } from 'react'
import type { PcType, NpcType, UnitDef } from './types'
import { GAME_SLUG, loadedScenario } from './defStore'
import {
  listScenarios,
  createScenario,
  putUnitDefs,
  setDefaultScenario,
  type Scenario,
} from '../../api'

type UnitType = PcType | NpcType
type DefMap = Record<string, UnitDef>

interface Props {
  // Live def map for the currently-active scenario, read from the store.
  getCurrentDefs: () => Record<UnitType, UnitDef>
  // Write edited defs through to the store for the active scenario (immediate effect).
  applyEditedDefs: (defs: Record<UnitType, UnitDef>) => void
  // Make a scenario the active one (swap the store + remember the selection) and
  // hot-apply it to the running match. Returns success.
  activateScenario: (id: string) => Promise<boolean>
  // Re-run the load path (active scenario, default fallback), discarding unsaved
  // in-memory edits.
  reloadStore: () => Promise<void>
  onClose: () => void
}

const SHAPES: UnitDef['attack']['propagation']['shape'][] = ['single', 'line', 'plus']
const PENETRATIONS: UnitDef['attack']['propagation']['penetration'][] = ['none', 'stop_at_first']

export default function ScenarioEditor({ getCurrentDefs, applyEditedDefs, activateScenario, reloadStore, onClose }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [defs, setDefs] = useState<DefMap>({})
  const [status, setStatus] = useState<string>('')
  const [busy, setBusy] = useState(false)

  // Point the editor at a scenario, making it the active one. If it is already
  // the active (loaded) scenario, just read its live defs from the store (so
  // unsaved popup edits are reflected); otherwise activate it (swap the store +
  // remember the selection) and read the now-active defs.
  const selectInto = useCallback(
    async (scenarioId: string) => {
      setSelected(scenarioId)
      if (scenarioId !== loadedScenario()) {
        await activateScenario(scenarioId)
      }
      setDefs(getCurrentDefs())
    },
    [getCurrentDefs, activateScenario],
  )

  const refresh = useCallback(
    async (selectId?: string) => {
      const list = await listScenarios(GAME_SLUG)
      setScenarios(list)
      const target = selectId ?? loadedScenario() ?? list.find((s) => s.isDefault)?.id ?? list[0]?.id ?? null
      if (target) await selectInto(target)
    },
    [selectInto],
  )

  useEffect(() => {
    refresh().catch(() => setStatus('Failed to load scenarios'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSelect = async (id: string) => {
    setStatus('')
    setBusy(true)
    try {
      await selectInto(id)
      setStatus('Now active. Reset to replay the match from the start with it.')
    } catch {
      setStatus('Failed to load scenario')
    } finally {
      setBusy(false)
    }
  }

  const setField = (archetype: string, mutate: (d: UnitDef) => UnitDef) => {
    setDefs((prev) => ({ ...prev, [archetype]: mutate(prev[archetype]) }))
  }

  const numField = (archetype: string, value: number, mutate: (d: UnitDef, v: number) => UnitDef) => (
    <input
      type="number"
      className="w-14 rounded border border-gray-600 bg-gray-900 px-1 py-0.5 text-right text-white"
      value={value}
      onChange={(e) => setField(archetype, (d) => mutate(d, Math.round(Number(e.target.value))))}
    />
  )

  const onSave = async () => {
    if (!selected) return
    setBusy(true)
    setStatus('')
    try {
      await putUnitDefs<UnitDef>(GAME_SLUG, selected, defs)
      // The selected scenario is the active one, so apply immediately too.
      if (selected === loadedScenario()) {
        applyEditedDefs(defs as Record<UnitType, UnitDef>)
        setStatus('Saved and applied. Reset to replay the match with these values.')
      } else {
        setStatus('Saved.')
      }
    } catch {
      setStatus('Save failed')
    } finally {
      setBusy(false)
    }
  }

  const onNewScenario = async () => {
    const name = window.prompt('Name for the new scenario (copies the selected one):')
    if (!name) return
    setBusy(true)
    setStatus('')
    try {
      const created = await createScenario(GAME_SLUG, name, selected ?? undefined)
      await refresh(created.id)
      setStatus(`Created "${created.name}" and made it active.`)
    } catch {
      setStatus('Create failed')
    } finally {
      setBusy(false)
    }
  }

  const onSetDefault = async () => {
    if (!selected) return
    setBusy(true)
    setStatus('')
    try {
      await setDefaultScenario(GAME_SLUG, selected)
      await refresh(selected)
      setStatus('Set as default (the scenario used on a fresh start / for new players).')
    } catch {
      setStatus('Set-default failed')
    } finally {
      setBusy(false)
    }
  }

  const onReload = async () => {
    setBusy(true)
    setStatus('')
    try {
      await reloadStore()
      await refresh(loadedScenario() ?? undefined)
      setStatus('Reloaded the active scenario from server (unsaved edits discarded).')
    } catch {
      setStatus('Reload failed')
    } finally {
      setBusy(false)
    }
  }

  const archetypes = Object.keys(defs).sort()

  return (
    <div className="absolute right-2 top-2 z-20 flex max-h-[92%] w-[360px] flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-900/97 text-sm text-gray-100 shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
        <span className="font-semibold">Unit editor</span>
        <button type="button" onClick={onClose} className="rounded px-2 text-gray-400 hover:text-white">✕</button>
      </div>

      <div className="flex flex-col gap-2 border-b border-gray-700 px-3 py-2">
        <label className="flex items-center gap-2">
          <span className="text-gray-400">Active</span>
          <select
            className="flex-1 rounded border border-gray-600 bg-gray-800 px-2 py-1"
            value={selected ?? ''}
            onChange={(e) => onSelect(e.target.value)}
            disabled={busy}
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.isDefault ? ' (default)' : ''}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-gray-500">
          Picking a scenario makes it active now and remembers it on this device. Reset replays the match with it.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onNewScenario} disabled={busy} className="rounded bg-gray-700 px-2 py-1 hover:bg-gray-600 disabled:opacity-50">+ New</button>
          <button type="button" onClick={onSetDefault} disabled={busy} className="rounded bg-gray-700 px-2 py-1 hover:bg-gray-600 disabled:opacity-50">Set default</button>
          <button type="button" onClick={onReload} disabled={busy} className="rounded bg-gray-700 px-2 py-1 hover:bg-gray-600 disabled:opacity-50">Reload</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {archetypes.map((a) => {
          const d = defs[a]
          if (!d) return null
          return (
            <div key={a} className="mb-3 rounded border border-gray-700 p-2">
              <div className="mb-1 font-medium text-gray-200">{a}</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <label className="flex items-center justify-between gap-1">Max HP {numField(a, d.maxHp, (x, v) => ({ ...x, maxHp: v }))}</label>
                <label className="flex items-center justify-between gap-1">Move {numField(a, d.movement.range, (x, v) => ({ ...x, movement: { range: v } }))}</label>
                <label className="flex items-center justify-between gap-1">Damage {numField(a, d.attack.damage, (x, v) => ({ ...x, attack: { ...x.attack, damage: v } }))}</label>
                <label className="flex items-center justify-between gap-1">Min rng {numField(a, d.attack.targeting.minRange, (x, v) => ({ ...x, attack: { ...x.attack, targeting: { ...x.attack.targeting, minRange: v } } }))}</label>
                <label className="flex items-center justify-between gap-1">Max rng {numField(a, d.attack.targeting.maxRange, (x, v) => ({ ...x, attack: { ...x.attack, targeting: { ...x.attack.targeting, maxRange: v } } }))}</label>
                <label className="flex items-center justify-between gap-1">
                  Shape
                  <select
                    className="rounded border border-gray-600 bg-gray-900 px-1 py-0.5"
                    value={d.attack.propagation.shape}
                    onChange={(e) => setField(a, (x) => ({ ...x, attack: { ...x.attack, propagation: { ...x.attack.propagation, shape: e.target.value as UnitDef['attack']['propagation']['shape'] } } }))}
                  >
                    {SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="col-span-2 flex items-center justify-between gap-1">
                  Penetration
                  <select
                    className="rounded border border-gray-600 bg-gray-900 px-1 py-0.5"
                    value={d.attack.propagation.penetration}
                    onChange={(e) => setField(a, (x) => ({ ...x, attack: { ...x.attack, propagation: { ...x.attack.propagation, penetration: e.target.value as UnitDef['attack']['propagation']['penetration'] } } }))}
                  >
                    {PENETRATIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-gray-700 px-3 py-2">
        {status && <div className="mb-2 text-xs text-gray-400">{status}</div>}
        <button
          type="button"
          onClick={onSave}
          disabled={busy || !selected}
          className="w-full rounded bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Save scenario
        </button>
      </div>
    </div>
  )
}
