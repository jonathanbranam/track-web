import { useCallback, useEffect, useRef, useState } from 'react'
import type { PcType, NpcType, UnitDef } from './types'
import { GAME_SLUG, loadedScenario, clampDef, withMinRange, withMaxRange } from './defStore'
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
  // Apply an edited def map to the store for the active scenario, live: the store
  // diffs it, reconciles HP, and re-plans affected NPCs (immediate effect).
  applyEditedDefs: (defs: Record<UnitType, UnitDef>) => void
  // Make a scenario the active one (swap the store + remember the selection) and
  // hot-apply it to the running match. Returns success.
  activateScenario: (id: string) => Promise<boolean>
  // Re-run the load path (active scenario, default fallback), discarding unsaved
  // live edits and applying the restored defs into the running match.
  reloadStore: () => Promise<void>
  onClose: () => void
}

const SHAPES: UnitDef['attack']['propagation']['shape'][] = ['single', 'line', 'plus']
const PENETRATIONS: UnitDef['attack']['propagation']['penetration'][] = ['none', 'stop_at_first']

// Trailing-edge debounce for numeric edits: a numeric onChange fires per
// keystroke (typing "12" passes through "1"), so we coalesce a quiet pause into a
// single commit rather than HP-reconciling / re-planning each intermediate value.
const COMMIT_DEBOUNCE_MS = 250

export default function ScenarioEditor({ getCurrentDefs, applyEditedDefs, activateScenario, reloadStore, onClose }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [defs, setDefs] = useState<DefMap>({})
  const [status, setStatus] = useState<string>('')
  const [busy, setBusy] = useState(false)

  // Live-edit machinery: defsRef mirrors `defs` so handlers read the latest map
  // synchronously; pendingRef holds the map awaiting a debounced commit; timerRef
  // is the trailing-edge timer.
  const defsRef = useRef<DefMap>({})
  const pendingRef = useRef<DefMap | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setLocal = useCallback((next: DefMap) => {
    defsRef.current = next
    setDefs(next)
  }, [])

  // Apply the pending edit now: cancel the timer, clamp every archetype to
  // engine-valid ranges, and push it through the live-apply path. A no-op when
  // there is nothing pending.
  const commitNow = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    const pending = pendingRef.current
    pendingRef.current = null
    if (!pending) return
    const clamped: DefMap = {}
    for (const [k, v] of Object.entries(pending)) clamped[k] = clampDef(v)
    applyEditedDefs(clamped as Record<UnitType, UnitDef>)
  }, [applyEditedDefs])

  // Flush on unmount (editor close) so a sub-debounce edit is committed, not lost.
  // Held in a ref so the cleanup runs only on real unmount, not on every commitNow
  // identity change.
  const commitRef = useRef(commitNow)
  commitRef.current = commitNow
  useEffect(() => () => { commitRef.current() }, [])

  const cancelPending = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    pendingRef.current = null
  }, [])

  // Point the editor at a scenario, making it the active one. If it is already
  // the active (loaded) scenario, just read its live defs from the store (so
  // unsaved edits are reflected); otherwise activate it (swap the store +
  // remember the selection) and read the now-active defs.
  const selectInto = useCallback(
    async (scenarioId: string) => {
      setSelected(scenarioId)
      if (scenarioId !== loadedScenario()) {
        await activateScenario(scenarioId)
      }
      setLocal(getCurrentDefs())
    },
    [getCurrentDefs, activateScenario, setLocal],
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

  // Numeric edit: update local state for immediate input feedback and schedule a
  // trailing-edge commit. Typing keeps the field responsive; the debounce coalesces.
  const editNum = (archetype: string, mutate: (d: UnitDef) => UnitDef) => {
    const next = { ...defsRef.current, [archetype]: mutate(defsRef.current[archetype]) }
    setLocal(next)
    pendingRef.current = next
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(commitNow, COMMIT_DEBOUNCE_MS)
  }

  // Discrete edit (a <select>): no intermediate values to coalesce, so commit it
  // immediately.
  const editNow = (archetype: string, mutate: (d: UnitDef) => UnitDef) => {
    const next = { ...defsRef.current, [archetype]: mutate(defsRef.current[archetype]) }
    setLocal(next)
    pendingRef.current = next
    commitNow()
  }

  // `min`/`max` render as native input attributes for spinner/keypad affordance
  // only; the authoritative clamp happens in `clampDef` at commit time, since a
  // user can still type or paste a value outside the attribute bounds.
  const numField = (archetype: string, value: number, min: number, max: number, mutate: (d: UnitDef, v: number) => UnitDef) => (
    <input
      type="number"
      min={min}
      max={max}
      className="w-14 rounded border border-gray-600 bg-gray-900 px-1 py-0.5 text-right text-white"
      value={value}
      onChange={(e) => editNum(archetype, (d) => mutate(d, Math.round(Number(e.target.value))))}
      onBlur={commitNow}
    />
  )

  const onSave = async () => {
    if (!selected) return
    commitNow() // flush any pending live edit into the store first
    setBusy(true)
    setStatus('')
    try {
      // The store already reflects the edits live; persist its current defs.
      await putUnitDefs<UnitDef>(GAME_SLUG, selected, getCurrentDefs())
      setLocal(getCurrentDefs())
      setStatus('Saved.')
    } catch {
      setStatus('Save failed')
    } finally {
      setBusy(false)
    }
  }

  const onNewScenario = async () => {
    const name = window.prompt('Name for the new scenario (copies the selected one):')
    if (!name) return
    commitNow() // ensure pending edits land in the source scenario before copying
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
    cancelPending() // discard unsaved live edits
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
          Edits apply live to the running match. Save persists them; Reload discards unsaved edits without restarting.
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
                <label className="flex items-center justify-between gap-1">Max HP {numField(a, d.maxHp, 1, 20, (x, v) => ({ ...x, maxHp: v }))}</label>
                <label className="flex items-center justify-between gap-1">Move {numField(a, d.movement.range, 0, 22, (x, v) => ({ ...x, movement: { range: v } }))}</label>
                <label className="flex items-center justify-between gap-1">Damage {numField(a, d.attack.damage, 0, 15, (x, v) => ({ ...x, attack: { ...x.attack, damage: v } }))}</label>
                {/* Range pair stays coupled: the edited field keeps v, the partner is pushed to match (see withMinRange/withMaxRange). */}
                <label className="flex items-center justify-between gap-1">Min rng {numField(a, d.attack.targeting.minRange, 0, 22, (x, v) => withMinRange(x, v))}</label>
                <label className="flex items-center justify-between gap-1">Max rng {numField(a, d.attack.targeting.maxRange, 1, 22, (x, v) => withMaxRange(x, v))}</label>
                <label className="flex items-center justify-between gap-1">
                  Shape
                  <select
                    className="rounded border border-gray-600 bg-gray-900 px-1 py-0.5"
                    value={d.attack.propagation.shape}
                    onChange={(e) => editNow(a, (x) => ({ ...x, attack: { ...x.attack, propagation: { ...x.attack.propagation, shape: e.target.value as UnitDef['attack']['propagation']['shape'] } } }))}
                  >
                    {SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="col-span-2 flex items-center justify-between gap-1">
                  Penetration
                  <select
                    className="rounded border border-gray-600 bg-gray-900 px-1 py-0.5"
                    value={d.attack.propagation.penetration}
                    onChange={(e) => editNow(a, (x) => ({ ...x, attack: { ...x.attack, propagation: { ...x.attack.propagation, penetration: e.target.value as UnitDef['attack']['propagation']['penetration'] } } }))}
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
