import { useCallback, useEffect, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import PhaserGame from '../PhaserGame'
import DungeonTacticsScene from './DungeonTacticsScene'
import MapSelectDialog from './MapSelectDialog'
import type { GameState, Direction, PcAction, NpcAttackPlan } from './types'
import type { ContentMap, ContentTree } from './contentTypes'
import { fetchDefaultContent, listMaps } from '../../api'
import {
  selectUnit,
  selectForPlacement,
  placeUnit,
  cancelSelection,
  beginPlanMove,
  beginPlanAttack,
  attackSquares,
  validMoveDests,
  computeMovePath,
  applyMove,
  undoLastMove,
  resolvePcAction,
} from './pc'
import {
  initialState,
  resolveNpcAction,
  endRound,
  computeNpcTurns,
} from './npc'
import {
  getMaxHp,
  setDef,
  getAllDefs,
  diffDefs,
  loadFromServer,
  loadScenario,
} from './defStore'
import { GAME_SLUG, loadMapById } from './contentStore'
import ScenarioEditor from './ScenarioEditor'
import Hud from './hud/Hud'
import type { PcType, NpcType, UnitDef } from './types'

export default function DungeonTacticsGame() {
  const stateRef = useRef<GameState>(initialState())
  const gameRef = useRef<Phaser.Game | null>(null)
  // True while a PC move/undo animation is in flight; guards input so taps can't
  // interleave mid-animation (see the immediate-action model in the change spec).
  const animatingRef = useRef(false)
  const [, setTick] = useState(0)
  const rerender = useCallback(() => setTick((n) => n + 1), [])
  const [editorOpen, setEditorOpen] = useState(false)
  // End-of-turn confirmation modal visibility — React-owned (was a scene flag).
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Start-of-game map selection: the board is not mounted until the player picks a
  // saved map. `started` flips once the chosen map is loaded into the content store;
  // `starting` covers the brief load between the tap and the board appearing.
  const [maps, setMaps] = useState<ContentMap[]>([])
  const [mapsLoading, setMapsLoading] = useState(true)
  const [mapsError, setMapsError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [starting, setStarting] = useState(false)

  // Load the region's saved maps for the picker. We read the default content only
  // to discover the region, then list that region's maps.
  const loadMaps = useCallback(async () => {
    setMapsLoading(true)
    setMapsError(null)
    try {
      const tree = await fetchDefaultContent<ContentTree>(GAME_SLUG)
      setMaps(await listMaps<ContentMap>(GAME_SLUG, tree.region.id))
    } catch {
      setMapsError('Failed to load maps')
    } finally {
      setMapsLoading(false)
    }
  }, [])

  useEffect(() => { void loadMaps() }, [loadMaps])

  // Player picked a map: load its board content and the persisted unit defs, seed
  // the initial state from the now-loaded map, then mount the board to start play.
  const handleSelectMap = useCallback(async (mapId: string) => {
    setStarting(true)
    await Promise.all([loadMapById(mapId), loadFromServer()])
    stateRef.current = initialState()
    setStarted(true)
  }, [])

  function scene(): DungeonTacticsScene | null {
    return (gameRef.current?.scene.getScene('DungeonTacticsScene') as DungeonTacticsScene) ?? null
  }

  // Shared apply path for a def change already written into the store. Given the
  // set of changed archetypes and a snapshot of their prior max HP, it (a)
  // reconciles every affected unit's current HP by its archetype's max-HP delta
  // (floored at 1, so a lowered max can never kill) and (b) re-plans only the NPC
  // units whose archetype changed — but only during the player phase with no NPC
  // animation in flight. Because movement for the round has already executed and is
  // immutable, this refreshes the affected NPCs' **attack telegraphs only** (from
  // their current, already-moved positions); the next `npc-move` phase recomputes
  // movement. Unchanged archetypes carry no prevMax entry, so their delta is 0.
  // Both the editor commit and Reload feed this path.
  const applyDefChange = useCallback(
    (changed: Set<PcType | NpcType>, prevMax: Partial<Record<PcType | NpcType, number>>) => {
      const s = stateRef.current
      let next: GameState = {
        ...s,
        units: s.units.map((u) => {
          const delta = getMaxHp(u.unitType) - (prevMax[u.unitType] ?? getMaxHp(u.unitType))
          return delta ? { ...u, hp: Math.max(1, u.hp + delta) } : u
        }),
      }
      const replanIds = new Set(
        next.units.filter((u) => u.kind === 'npc' && changed.has(u.unitType)).map((u) => u.id),
      )
      if (replanIds.size > 0 && next.phase === 'player' && !animatingRef.current) {
        next = { ...next, npcPlans: computeNpcTurns(next, replanIds).attackPlans }
      }
      stateRef.current = next
      scene()?.redraw(next)
      rerender()
    },
    [rerender],
  )

  // Apply edited defs for the active scenario, live: the editor passes its
  // (already-clamped) edited map; we diff it against the store, write through only
  // the archetypes that actually changed, and route them through applyDefChange so
  // the running match reflects the edit (HP reconciled, affected NPCs re-planned)
  // with no Save and no reload. Persistence is the editor's job (Save).
  const applyEditedDefs = useCallback(
    (defs: Record<PcType | NpcType, UnitDef>) => {
      const changed = diffDefs(defs)
      if (changed.size === 0) return
      const prevMax: Partial<Record<PcType | NpcType, number>> = {}
      for (const t of changed) prevMax[t] = getMaxHp(t)
      for (const t of changed) setDef(t, defs[t])
      applyDefChange(changed, prevMax)
    },
    [applyDefChange],
  )

  // Reconcile each unit's current HP against a map of its archetype's previous
  // max HP after the store's defs change, shifting by the max-HP delta (floored
  // at 1 so a lowered max can never kill), then redraw.
  const reconcileHp = useCallback(
    (prevMax: Partial<Record<PcType | NpcType, number>>) => {
      const s = stateRef.current
      stateRef.current = {
        ...s,
        units: s.units.map((u) => {
          const delta = getMaxHp(u.unitType) - (prevMax[u.unitType] ?? getMaxHp(u.unitType))
          return delta ? { ...u, hp: Math.max(1, u.hp + delta) } : u
        }),
      }
      scene()?.redraw(stateRef.current)
      rerender()
    },
    [rerender],
  )

  // Make a scenario the active one for the running session: swap the store's
  // defs to that scenario (remembered per browser in localStorage) and hot-apply
  // to the live match. Reset then replays the whole match with this scenario.
  const activateScenario = useCallback(
    async (id: string): Promise<boolean> => {
      const prevMax: Partial<Record<PcType | NpcType, number>> = {}
      for (const t of Object.keys(getAllDefs()) as Array<PcType | NpcType>) prevMax[t] = getMaxHp(t)
      const res = await loadScenario(id)
      if (!res.ok) return false
      reconcileHp(prevMax)
      return true
    },
    [reconcileHp],
  )

  // Re-run the load path (active scenario, default fallback), replacing the
  // in-memory store and discarding any unsaved live edits — applied *into the
  // running match* rather than restarting it (Reset remains the match-restart
  // path). Snapshot the current defs, re-fetch, then diff old vs new and route the
  // changed archetypes through applyDefChange so positions and turn state are kept.
  // On a failed load the store is left as-is (bundled fallback) and nothing runs.
  const reloadStore = useCallback(async () => {
    const before = getAllDefs()
    const prevMax: Partial<Record<PcType | NpcType, number>> = {}
    for (const t of Object.keys(before) as Array<PcType | NpcType>) prevMax[t] = getMaxHp(t)
    const res = await loadFromServer()
    if (!res.ok) return
    const changed = diffDefs(before)
    applyDefChange(changed, prevMax)
  }, [applyDefChange])

  const currentDefs = useCallback(() => getAllDefs(), [])

  // ─── Phaser setup ────────────────────────────────────────────────────────────

  const buildConfig = useCallback(
    (parent: HTMLElement): Phaser.Types.Core.GameConfig => ({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#111827',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      input: {
        activePointers: 2,
      },
      scene: DungeonTacticsScene,
    }),
    [],
  )

  const onGameReady = useCallback(
    (game: Phaser.Game) => {
      gameRef.current = game
      // Deliver initial state before the scene's create() runs. The chosen map's
      // content and the unit-def scenario were already loaded during map selection
      // (see handleSelectMap), so `stateRef.current` already reflects the picked map.
      game.registry.set('initialState', stateRef.current)

      game.events.on('unit-tapped', ({ unitId }: { unitId: string }) => {
        if (animatingRef.current) return
        const s = stateRef.current
        // Turn-0 placement: tapping any unit opens its info dialog (no planning).
        // A PC can then be repositioned within the zone; an NPC is inspect-only
        // (it stays inert — no plan is shown — but the player can read its stats).
        if (s.phase === 'placement') {
          const tapped = s.units.find((u) => u.id === unitId)
          if (!tapped) return
          stateRef.current = selectForPlacement(s, unitId)
          scene()?.redraw(stateRef.current)
          rerender()
          return
        }
        if (s.phase !== 'player') return
        const unit = s.units.find((u) => u.id === unitId)
        if (!unit) return
        // Re-tapping the selected PC dismisses it (no pending plan to clear in the
        // immediate-action model).
        if (unit.kind === 'pc' && unitId === s.selectedUnitId && s.planningPhase === 'selecting-move') {
          stateRef.current = cancelSelection(s)
          scene()?.redraw(stateRef.current)
          rerender()
          return
        }
        // selectUnit routes by kind: a PC opens the action popup with walk tiles,
        // an NPC opens an info-only popup. Selecting a new unit replaces the popup
        // and the redraw clears the prior unit's overlays.
        stateRef.current = selectUnit(s, unitId)
        scene()?.redraw(stateRef.current)
        rerender()
      })

      game.events.on('cell-tapped', ({ col, row }: { col: number; row: number }) => {
        if (animatingRef.current) return
        const s = stateRef.current
        // Turn-0 placement: relocate the selected PC into the tapped spawn-zone
        // tile (placeUnit no-ops on invalid tiles, so the selection is retained).
        // When an NPC is selected (inspect-only), a board tap just dismisses it.
        if (s.phase === 'placement') {
          if (!s.selectedUnitId) return
          const sel = s.units.find((u) => u.id === s.selectedUnitId)
          stateRef.current = sel?.kind === 'pc'
            ? placeUnit(s, s.selectedUnitId, col, row)
            : cancelSelection(s)
          scene()?.redraw(stateRef.current)
          rerender()
          return
        }
        if (s.phase !== 'player' || !s.selectedUnitId) return

        if (s.planningPhase === 'selecting-move') {
          const dests = validMoveDests(s, s.selectedUnitId)
          if (!dests.some((d) => d.col === col && d.row === row)) {
            // No action active: tapping a non-walk-destination tile dismisses the unit.
            stateRef.current = cancelSelection(s)
            scene()?.redraw(stateRef.current)
            rerender()
            return
          }
          // Immediate animated move: slide along the A* path, then commit to state
          // (updating the unit's position and pushing an undo record) and redraw.
          const unit = s.units.find((u) => u.id === s.selectedUnitId)!
          const path = computeMovePath(s, s.selectedUnitId, unit.col, unit.row, col, row)
          const action: PcAction = {
            kind: 'move', unitId: unit.id, fromCol: unit.col, fromRow: unit.row, toCol: col, toRow: row, path,
          }
          animatingRef.current = true
          scene()?.animatePcAction(action, () => {
            stateRef.current = applyMove(stateRef.current, unit.id, col, row, path)
            scene()?.redraw(stateRef.current)
            animatingRef.current = false
            rerender()
          })
        } else if (s.planningPhase === 'none') {
          // Info-only selection (NPC): any non-actionable tap dismisses the unit.
          stateRef.current = cancelSelection(s)
          scene()?.redraw(stateRef.current)
          rerender()
        } else if (s.planningPhase === 'selecting-attack') {
          const unit = s.units.find((u) => u.id === s.selectedUnitId)
          if (!unit) return
          const baseCol = unit.col
          const baseRow = unit.row
          if (col === baseCol && row === baseRow) {
            // Tapping the unit's own cell cancels the attack, back to walk view.
            stateRef.current = beginPlanMove(s)
            scene()?.redraw(stateRef.current)
            rerender()
            return
          }
          // Determine direction by axis alignment first (handles all range distances)
          let dir: Direction | null = null
          if (col === baseCol && row < baseRow) dir = 'up'
          else if (col === baseCol && row > baseRow) dir = 'down'
          else if (row === baseRow && col < baseCol) dir = 'left'
          else if (row === baseRow && col > baseCol) dir = 'right'
          else {
            // Off-axis tap (e.g. magic-user cross adjacent tiles) — scan all directions
            for (const d of ['up', 'down', 'left', 'right'] as Direction[]) {
              const testState = { ...s, plans: { ...s.plans, [s.selectedUnitId]: { attackDir: d } } }
              if (attackSquares(testState, s.selectedUnitId).some((sq) => sq.col === col && sq.row === row)) {
                dir = d
                break
              }
            }
          }
          if (!dir) {
            // Tapping a non-target tile cancels the action and returns to walk view,
            // keeping the unit selected and the popup open.
            stateRef.current = beginPlanMove(s)
            scene()?.redraw(stateRef.current)
            rerender()
            return
          }
          // Immediate attack: animate the strike, resolve it (which clears the undo
          // stack — attacks are committal), then dismiss the unit and redraw.
          const action: PcAction = { kind: 'attack', unitId: s.selectedUnitId, col: unit.col, row: unit.row, attackDir: dir }
          animatingRef.current = true
          scene()?.animatePcAction(action, () => {
            stateRef.current = cancelSelection(resolvePcAction(stateRef.current, action))
            scene()?.redraw(stateRef.current)
            animatingRef.current = false
            rerender()
          })
        }
      })
    },
    [rerender],
  )

  // ─── NPC phases ──────────────────────────────────────────────────────────────

  // Start-of-round NPC movement. Each NPC, in turn order, has its move applied and
  // animated immediately against the live board; its intended attack is stored as
  // a telegraph. When every NPC has moved, the telegraphs become `npcPlans` and
  // control passes to the player (movement overlay cleared, attack telegraphs
  // shown). Called after placement (round 1) and after each round's attacks resolve.
  function runNpcMovePhase() {
    const { moves, attackPlans } = computeNpcTurns(stateRef.current)
    stateRef.current = { ...stateRef.current, phase: 'npc-move', selectedUnitId: null, planningPhase: 'none' }
    scene()?.clearPlanningOverlay()
    scene()?.redraw(stateRef.current)
    rerender()

    const step = (idx: number) => {
      if (idx >= moves.length) {
        stateRef.current = { ...stateRef.current, phase: 'player', npcPlans: attackPlans }
        scene()?.clearPlanningOverlay()
        scene()?.redraw(stateRef.current)
        rerender()
        return
      }
      const action = moves[idx]
      if (!stateRef.current.units.some((u) => u.id === action.unitId)) {
        step(idx + 1)
        return
      }
      scene()?.animateNpcAction(action, () => {
        stateRef.current = resolveNpcAction(stateRef.current, action)
        scene()?.redraw(stateRef.current)
        step(idx + 1)
      })
    }
    step(0)
  }

  // Resolve the telegraphed NPC attacks in turn order when the player confirms
  // end-of-turn. Plans whose unit has since died are skipped. After the last
  // attack, end the round and chain into the next round's movement phase.
  function runNpcAttackPhase(plans: NpcAttackPlan[], idx: number) {
    if (idx >= plans.length) {
      stateRef.current = endRound(stateRef.current)
      runNpcMovePhase()
      return
    }
    const plan = plans[idx]
    if (!stateRef.current.units.some((u) => u.id === plan.unitId)) {
      runNpcAttackPhase(plans, idx + 1)
      return
    }
    scene()?.animateNpcAction(plan, () => {
      stateRef.current = resolveNpcAction(stateRef.current, plan)
      scene()?.redraw(stateRef.current)
      runNpcAttackPhase(plans, idx + 1)
    })
  }

  // ─── HUD handlers ──────────────────────────────────────────────────────────
  // The React HUD invokes these directly (no Phaser event round-trip). Each
  // guards on animatingRef so taps can't interleave mid-animation, mirroring the
  // former scene-event handlers.

  function handleReset() {
    if (animatingRef.current) return
    stateRef.current = initialState()
    scene()?.redraw(stateRef.current)
    setConfirmOpen(false)
    rerender()
  }

  // Placement Done: commit PC positions, then run the round-1 NPC move phase so
  // enemies advance against the final PC positions before the first player turn.
  // computeNpcTurns (inside runNpcMovePhase) reads the committed board, so enemies
  // target where the PCs were placed, not their default spawn tiles.
  function handlePlacementDone() {
    if (animatingRef.current) return
    const s = stateRef.current
    if (s.phase !== 'placement') return
    runNpcMovePhase()
  }

  // Done opens the confirmation modal; the turn only ends on Confirm.
  function handleDone() {
    if (animatingRef.current) return
    if (stateRef.current.phase !== 'player') return
    setConfirmOpen(true)
  }

  function handleCancelConfirm() {
    setConfirmOpen(false)
  }

  // Confirm end-of-turn. PC actions already resolved immediately, so this goes
  // straight to resolving the telegraphed NPC attacks; on completion the round
  // ends and the next round's NPC movement runs.
  function handleConfirmEndTurn() {
    setConfirmOpen(false)
    if (animatingRef.current) return
    const plans = stateRef.current.npcPlans
    stateRef.current = { ...stateRef.current, phase: 'npc-attack', selectedUnitId: null, planningPhase: 'none' }
    scene()?.clearPlanningOverlay()
    scene()?.redraw(stateRef.current)
    rerender()
    runNpcAttackPhase(plans, 0)
  }

  // Undo: animate the most recent PC back along its path to its origin, then pop
  // the undo stack and redraw.
  function handleUndo() {
    if (animatingRef.current) return
    const s = stateRef.current
    if (s.phase !== 'player' || s.undoStack.length === 0) return
    const rec = s.undoStack[s.undoStack.length - 1]
    // Reverse the forward path: retrace the intermediate cells back to origin.
    const reversedPath = [...rec.path.slice(0, -1).reverse(), { col: rec.fromCol, row: rec.fromRow }]
    const action: PcAction = {
      kind: 'move',
      unitId: rec.unitId,
      fromCol: rec.toCol,
      fromRow: rec.toRow,
      toCol: rec.fromCol,
      toRow: rec.fromRow,
      path: reversedPath,
    }
    animatingRef.current = true
    scene()?.animatePcAction(action, () => {
      // Select the unit that moved back so its popup and remaining-range walk
      // tiles show from the restored position. Undone moves are never locked
      // (attacks clear the stack), so this lands in 'selecting-move'.
      stateRef.current = selectUnit(undoLastMove(stateRef.current), rec.unitId)
      scene()?.redraw(stateRef.current)
      animatingRef.current = false
      rerender()
    })
  }

  // Toggle the Attack action: activate → attack tiles, deactivate → walk tiles.
  function handleToggleAttack() {
    if (animatingRef.current) return
    const s = stateRef.current
    if (s.phase !== 'player' || !s.selectedUnitId) return
    stateRef.current = s.planningPhase === 'selecting-attack' ? beginPlanMove(s) : beginPlanAttack(s)
    scene()?.redraw(stateRef.current)
    rerender()
  }

  function handleClosePopup() {
    if (animatingRef.current) return
    stateRef.current = cancelSelection(stateRef.current)
    scene()?.redraw(stateRef.current)
    rerender()
  }

  // Before a map is chosen, show only the picker — the Phaser board is not mounted
  // until the player selects a map (which loads it into the content store).
  if (!started) {
    return (
      <div className="relative w-full h-full">
        <MapSelectDialog
          maps={maps}
          loading={mapsLoading}
          error={mapsError}
          starting={starting}
          onSelect={handleSelectMap}
          onRetry={loadMaps}
        />
      </div>
    )
  }

  // The HUD is a ReactDOM overlay over the Phaser canvas; the React layer also
  // hosts the scenario editor (available to any logged-in user — no admin gate).
  return (
    <div className="relative w-full h-full">
      <PhaserGame buildConfig={buildConfig} onGameReady={onGameReady} />
      <Hud
        state={stateRef.current}
        confirmOpen={confirmOpen}
        handlers={{
          onReset: handleReset,
          onPlacementDone: handlePlacementDone,
          onDone: handleDone,
          onConfirmEndTurn: handleConfirmEndTurn,
          onCancelConfirm: handleCancelConfirm,
          onUndo: handleUndo,
          onToggleAttack: handleToggleAttack,
          onClosePopup: handleClosePopup,
        }}
      />
      <button
        type="button"
        onClick={() => setEditorOpen((o) => !o)}
        className="absolute top-2 left-2 z-10 rounded bg-gray-800/90 px-3 py-1 text-sm font-medium text-white shadow hover:bg-gray-700"
      >
        {editorOpen ? 'Close editor' : 'Unit editor'}
      </button>
      {editorOpen && (
        <ScenarioEditor
          getCurrentDefs={currentDefs}
          applyEditedDefs={applyEditedDefs}
          activateScenario={activateScenario}
          reloadStore={reloadStore}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  )
}
