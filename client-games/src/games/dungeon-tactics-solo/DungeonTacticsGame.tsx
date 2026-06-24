import { useCallback, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import PhaserGame from '../PhaserGame'
import DungeonTacticsScene from './DungeonTacticsScene'
import type { GameState, Direction, PcAction, NpcAction } from './types'
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
  beginNpcPlayback,
  resolveNpcAction,
  endRound,
  computeNpcPlans,
} from './npc'
import {
  getMaxHp,
  getMoveRange,
  setMaxHp,
  setMoveRange,
  setDef,
  getAllDefs,
  loadFromServer,
  loadScenario,
  persistDef,
} from './defStore'
import ScenarioEditor from './ScenarioEditor'
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

  function scene(): DungeonTacticsScene | null {
    return (gameRef.current?.scene.getScene('DungeonTacticsScene') as DungeonTacticsScene) ?? null
  }

  // Apply edited defs for the currently-loaded (default) scenario: write them
  // through to the in-memory store so the running session reflects them with no
  // reload, shifting each affected unit's current HP by the max-HP delta (floored
  // at 1, so a lowered max can never kill). Persistence is handled by the editor.
  const applyEditedDefs = useCallback(
    (defs: Record<PcType | NpcType, UnitDef>) => {
      const types = Object.keys(defs) as Array<PcType | NpcType>
      const prevMax: Partial<Record<PcType | NpcType, number>> = {}
      for (const t of types) prevMax[t] = getMaxHp(t)
      for (const t of types) setDef(t, defs[t])
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
  // in-memory store and discarding any unsaved in-memory edits, then re-seed the
  // board.
  const reloadStore = useCallback(async () => {
    await loadFromServer()
    stateRef.current = initialState()
    scene()?.redraw(stateRef.current)
    rerender()
  }, [rerender])

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
      // Deliver initial state before the scene's create() runs. This first state
      // is seeded from the bundled defaults so the board is playable immediately;
      // the async load below swaps in the persisted default scenario once it
      // resolves (and is a no-op fallback to bundled on failure).
      game.registry.set('initialState', stateRef.current)

      // Load the persisted default scenario's defs once at game start, then
      // re-seed the board so units reflect the loaded stats. On failure the store
      // keeps the bundled defaults and the game plays identically to Stage 1.
      void loadFromServer().then((res) => {
        if (!res.ok) return
        stateRef.current = initialState()
        game.registry.set('initialState', stateRef.current)
        scene()?.redraw(stateRef.current)
        rerender()
      })

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

      game.events.on('popup-attack-toggle', () => {
        if (animatingRef.current) return
        const s = stateRef.current
        if (s.phase !== 'player' || !s.selectedUnitId) return
        // Toggle the Attack action: activate → attack tiles, deactivate → walk tiles.
        stateRef.current = s.planningPhase === 'selecting-attack' ? beginPlanMove(s) : beginPlanAttack(s)
        scene()?.redraw(stateRef.current)
        rerender()
      })

      game.events.on('popup-close', () => {
        if (animatingRef.current) return
        stateRef.current = cancelSelection(stateRef.current)
        scene()?.redraw(stateRef.current)
        rerender()
      })

      // All HUD (Done/Reset/Undo/confirm modal) is rendered in Phaser; the scene
      // owns the confirm modal's UI state and emits these events for game-state
      // actions. PC actions already resolved immediately, so Done skips PC playback
      // and goes straight to NPC playback.
      game.events.on('hud-done-confirm', () => {
        if (animatingRef.current) return
        const { state: npcState, actions: npcActions } = beginNpcPlayback(stateRef.current)
        stateRef.current = { ...npcState, selectedUnitId: null, planningPhase: 'none' }
        scene()?.clearPlanningOverlay()
        scene()?.redraw(stateRef.current)
        rerender()
        runNpcPlayback(npcActions, 0)
      })

      // Placement Done: commit PC positions and start the first player turn. NPC
      // plans MUST be recomputed here against the final PC positions — the plans
      // seeded in initialState reflect only the default spawn tiles, so without
      // this the enemies would target where the PCs started, not where the player
      // placed them. Combat overlays now render normally.
      game.events.on('hud-placement-done', () => {
        if (animatingRef.current) return
        const s = stateRef.current
        if (s.phase !== 'placement') return
        const started = { ...s, phase: 'player' as const, selectedUnitId: null, planningPhase: 'none' as const }
        stateRef.current = { ...started, npcPlans: computeNpcPlans(started) }
        scene()?.redraw(stateRef.current)
        rerender()
      })

      // Admin stat edit (designer tuning) via the in-popup steppers. Edits write
      // through to the in-memory def store (immediate effect) AND persist to the
      // currently-loaded (default) scenario via the backend PUT, so they survive a
      // reload. Movement needs no GameState change (walk tiles recompute on
      // redraw). For max HP we shift current hp by the *effective* delta
      // (post-clamp) in both directions, so a unit tracks the edit (3/3 → 4/4,
      // 1/3 → 2/4, 2/4 → 1/3) — but current hp is floored at 1: lowering an
      // archetype's max HP can never kill a unit.
      game.events.on(
        'admin-stat-edit',
        ({ stat, unitType, delta }: { stat: 'maxHp' | 'move'; unitType: PcType | NpcType; delta: number }) => {
          if (animatingRef.current) return
          if (stat === 'move') {
            setMoveRange(unitType, getMoveRange(unitType) + delta)
          } else {
            const oldMax = getMaxHp(unitType)
            const newMax = setMaxHp(unitType, oldMax + delta)
            const effectiveDelta = newMax - oldMax
            const s = stateRef.current
            stateRef.current = {
              ...s,
              units: s.units.map((u) =>
                u.unitType === unitType
                  ? { ...u, hp: Math.max(1, u.hp + effectiveDelta) }
                  : u,
              ),
            }
          }
          // Persist the edited archetype to the loaded scenario (no-op if no
          // scenario is loaded, e.g. the fetch fell back to bundled defaults).
          void persistDef(unitType)
          scene()?.redraw(stateRef.current)
          rerender()
        },
      )

      game.events.on('hud-reset', () => {
        if (animatingRef.current) return
        stateRef.current = initialState()
        scene()?.redraw(stateRef.current)
        rerender()
      })

      // Undo: animate the most recent PC back along its path to its origin, then
      // pop the undo stack and redraw.
      game.events.on('hud-undo', () => {
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

  // ─── Playback ────────────────────────────────────────────────────────────────

  function runNpcPlayback(actions: NpcAction[], idx: number) {
    if (idx >= actions.length) {
      stateRef.current = endRound(stateRef.current)
      scene()?.redraw(stateRef.current)
      rerender()
      return
    }
    const action = actions[idx]
    if (!stateRef.current.units.some((u) => u.id === action.unitId)) {
      runNpcPlayback(actions, idx + 1)
      return
    }
    scene()?.animateNpcAction(action, () => {
      stateRef.current = resolveNpcAction(stateRef.current, action)
      scene()?.redraw(stateRef.current)
      runNpcPlayback(actions, idx + 1)
    })
  }

  // The Phaser scene renders the game HUD; the React overlay hosts the scenario
  // editor (available to any logged-in user — no admin gate).
  return (
    <div className="relative w-full h-full">
      <PhaserGame buildConfig={buildConfig} onGameReady={onGameReady} />
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
