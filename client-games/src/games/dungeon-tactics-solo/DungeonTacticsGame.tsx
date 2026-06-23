import { useCallback, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import PhaserGame from '../PhaserGame'
import DungeonTacticsScene from './DungeonTacticsScene'
import type { GameState, Direction, PcAction, NpcAction } from './types'
import {
  selectUnit,
  cancelSelection,
  beginPlanMove,
  beginPlanAttack,
  setPlanMove,
  setPlanAttack,
  attackSquares,
  validMoveDests,
  computeMovePath,
  clearPlanMove,
  clearPlanAttack,
  endPlayerTurn,
  resolvePcAction,
} from './pc'
import {
  initialState,
  beginNpcPlayback,
  resolveNpcAction,
  endRound,
} from './npc'

export default function DungeonTacticsGame() {
  const stateRef = useRef<GameState>(initialState())
  const gameRef = useRef<Phaser.Game | null>(null)
  const [, setTick] = useState(0)
  const rerender = useCallback(() => setTick((n) => n + 1), [])

  function scene(): DungeonTacticsScene | null {
    return (gameRef.current?.scene.getScene('DungeonTacticsScene') as DungeonTacticsScene) ?? null
  }

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
      // Deliver initial state before the scene's create() runs
      game.registry.set('initialState', stateRef.current)

      game.events.on('unit-tapped', ({ unitId }: { unitId: string }) => {
        const s = stateRef.current
        if (s.phase !== 'player') return
        const unit = s.units.find((u) => u.id === unitId)
        if (!unit) return
        // Re-tapping the selected PC while choosing a move clears its planned move.
        if (unit.kind === 'pc' && unitId === s.selectedUnitId && s.planningPhase === 'selecting-move') {
          stateRef.current = clearPlanMove(s, unitId)
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
        const s = stateRef.current
        if (s.phase !== 'player' || !s.selectedUnitId) return
        // Toggle the Attack action: activate → attack tiles, deactivate → walk tiles.
        stateRef.current = s.planningPhase === 'selecting-attack' ? beginPlanMove(s) : beginPlanAttack(s)
        scene()?.redraw(stateRef.current)
        rerender()
      })

      game.events.on('popup-close', () => {
        stateRef.current = cancelSelection(stateRef.current)
        scene()?.redraw(stateRef.current)
        rerender()
      })

      // All HUD (Done/Reset/confirm modal) is rendered in Phaser; the scene owns
      // the confirm modal's UI state and emits these events for game-state actions.
      game.events.on('hud-done-confirm', () => {
        const { state: newState, actions } = endPlayerTurn(stateRef.current)
        stateRef.current = newState
        scene()?.clearPlanningOverlay()
        rerender()
        runPcPlayback(actions, 0)
      })

      game.events.on('hud-reset', () => {
        stateRef.current = initialState()
        scene()?.redraw(stateRef.current)
        rerender()
      })

      game.events.on('cell-tapped', ({ col, row }: { col: number; row: number }) => {
        const s = stateRef.current
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
          const unit = s.units.find((u) => u.id === s.selectedUnitId)!
          const path = computeMovePath(s, s.selectedUnitId, unit.col, unit.row, col, row)
          stateRef.current = setPlanMove(s, s.selectedUnitId, col, row, path)
          scene()?.redraw(stateRef.current)
          rerender()
        } else if (s.planningPhase === 'none') {
          // Info-only selection (NPC): any non-actionable tap dismisses the unit.
          stateRef.current = cancelSelection(s)
          scene()?.redraw(stateRef.current)
          rerender()
        } else if (s.planningPhase === 'selecting-attack') {
          const unit = s.units.find((u) => u.id === s.selectedUnitId)
          if (!unit) return
          const plan = s.plans[s.selectedUnitId]
          const baseCol = plan?.moveTarget?.col ?? unit.col
          const baseRow = plan?.moveTarget?.row ?? unit.row
          if (col === baseCol && row === baseRow) {
            stateRef.current = clearPlanAttack(s, s.selectedUnitId)
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
              const testState = { ...s, plans: { ...s.plans, [s.selectedUnitId]: { ...(plan ?? {}), attackDir: d } } }
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
          stateRef.current = setPlanAttack(s, s.selectedUnitId, dir)
          scene()?.redraw(stateRef.current)
          rerender()
        }
      })
    },
    [rerender],
  )

  // ─── Playback ────────────────────────────────────────────────────────────────

  function runPcPlayback(actions: PcAction[], idx: number) {
    if (idx >= actions.length) {
      // Only take the pre-computed action list; keep unit positions in stateRef so
      // resolveNpcAction can step through them one at a time during animation.
      const { actions: npcActions } = beginNpcPlayback(stateRef.current)
      stateRef.current = { ...stateRef.current, phase: 'npc-playback' }
      rerender()
      runNpcPlayback(npcActions, 0)
      return
    }
    const action = actions[idx]
    scene()?.animatePcAction(action, () => {
      stateRef.current = resolvePcAction(stateRef.current, action)
      scene()?.redraw(stateRef.current)
      runPcPlayback(actions, idx + 1)
    })
  }

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

  // All HUD is rendered inside the Phaser scene; this component only hosts the canvas.
  return (
    <div className="relative w-full h-full">
      <PhaserGame buildConfig={buildConfig} onGameReady={onGameReady} />
    </div>
  )
}
