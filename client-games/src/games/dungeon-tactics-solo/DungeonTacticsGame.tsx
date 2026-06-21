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
  validMoveDests,
  computeMoveWaypoint,
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
  const [showDoneConfirm, setShowDoneConfirm] = useState(false)
  const rerender = useCallback(() => setTick((n) => n + 1), [])

  const state = stateRef.current

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
        if (!unit || unit.kind !== 'pc') return
        if (unitId === s.selectedUnitId && s.planningPhase === 'selecting-move') {
          stateRef.current = clearPlanMove(s, unitId)
          scene()?.redraw(stateRef.current)
          rerender()
          return
        }
        stateRef.current = selectUnit(s, unitId)
        scene()?.redraw(stateRef.current)
        rerender()
      })

      game.events.on('cell-tapped', ({ col, row }: { col: number; row: number }) => {
        const s = stateRef.current
        if (s.phase !== 'player' || !s.selectedUnitId) return

        if (s.planningPhase === 'selecting-move') {
          const dests = validMoveDests(s, s.selectedUnitId)
          if (!dests.some((d) => d.col === col && d.row === row)) return
          const unit = s.units.find((u) => u.id === s.selectedUnitId)!
          const waypoint = computeMoveWaypoint(s, unit.col, unit.row, col, row)
          stateRef.current = setPlanMove(s, s.selectedUnitId, col, row, waypoint)
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
          const dc = col - baseCol
          const dr = row - baseRow
          let dir: Direction | null = null
          if (dc === 1 && dr === 0) dir = 'right'
          else if (dc === -1 && dr === 0) dir = 'left'
          else if (dc === 0 && dr === 1) dir = 'down'
          else if (dc === 0 && dr === -1) dir = 'up'
          if (!dir) return
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

  // ─── HUD handlers ────────────────────────────────────────────────────────────

  function handleMove() {
    if (!stateRef.current.selectedUnitId) return
    stateRef.current = beginPlanMove(stateRef.current)
    scene()?.redraw(stateRef.current)
    rerender()
  }

  function handleAttack() {
    if (!stateRef.current.selectedUnitId) return
    stateRef.current = beginPlanAttack(stateRef.current)
    scene()?.redraw(stateRef.current)
    rerender()
  }

  function handleCancel() {
    stateRef.current = cancelSelection(stateRef.current)
    scene()?.redraw(stateRef.current)
    rerender()
  }

  function handleDoneClick() {
    setShowDoneConfirm(true)
  }

  function handleDoneConfirm() {
    setShowDoneConfirm(false)
    const { state: newState, actions } = endPlayerTurn(stateRef.current)
    stateRef.current = newState
    scene()?.clearPlanningOverlay()
    rerender()
    runPcPlayback(actions, 0)
  }

  function handleDoneCancel() {
    setShowDoneConfirm(false)
  }

  function handleReset() {
    setShowDoneConfirm(false)
    stateRef.current = initialState()
    scene()?.redraw(stateRef.current)
    rerender()
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────────

  const isPlaying = state.phase !== 'player'
  const showActionMenu = state.phase === 'player' && !!state.selectedUnitId && state.planningPhase === 'none'
  const pcsWithoutPlan = state.units.filter((u) => u.kind === 'pc' && !state.planOrder.includes(u.id)).length

  const btn = (extra: string) =>
    `px-4 py-2 rounded-lg text-sm font-semibold pointer-events-auto touch-manipulation ${extra}`

  return (
    <div className="relative w-full h-full">
      <PhaserGame buildConfig={buildConfig} onGameReady={onGameReady} />

      {!isPlaying && !showDoneConfirm && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-end pb-6 px-4 gap-3">
          {showActionMenu && (
            <div className="flex gap-2 justify-center">
              <button onClick={handleMove} className={btn('bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white')}>
                Move
              </button>
              <button onClick={handleAttack} className={btn('bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white')}>
                Attack
              </button>
              <button onClick={handleCancel} className={btn('bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white')}>
                Cancel
              </button>
            </div>
          )}
          <div className="flex justify-center">
            <button onClick={handleDoneClick} className={btn('bg-green-600 hover:bg-green-500 active:bg-green-700 text-white px-8')}>
              Done
            </button>
          </div>
        </div>
      )}

      {showDoneConfirm && (
        <div className="absolute inset-0 flex items-end justify-center pb-6 px-4 bg-black/30 pointer-events-auto">
          <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3 w-full max-w-xs">
            <p className="text-white text-sm font-semibold text-center">End your turn?</p>
            {pcsWithoutPlan > 0 && (
              <p className="text-yellow-400 text-xs text-center">
                {pcsWithoutPlan} unit{pcsWithoutPlan !== 1 ? 's have' : ' has'} no assigned actions.
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <button onClick={handleDoneCancel} className={btn('bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white')}>
                Cancel
              </button>
              <button onClick={handleDoneConfirm} className={btn('bg-green-600 hover:bg-green-500 active:bg-green-700 text-white px-6')}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {isPlaying && (
        <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-gray-900/80 rounded-lg px-4 py-2 text-sm text-gray-300">
            {state.phase === 'pc-playback' ? 'PC Actions…' : 'Enemy Actions…'}
          </div>
        </div>
      )}

      <div className="absolute top-3 right-3 pointer-events-auto">
        <button
          onClick={handleReset}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800/80 hover:bg-gray-700/90 active:bg-gray-900 text-gray-300 touch-manipulation"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
