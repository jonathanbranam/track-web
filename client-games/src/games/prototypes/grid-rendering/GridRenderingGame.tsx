import { useCallback, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import PhaserGame from '../../PhaserGame'
import GridScene from './GridScene'
import {
  initialState,
  selectUnit,
  cancelSelection,
  beginPlanMove,
  beginPlanAttack,
  setPlanMove,
  setPlanAttack,
  endPlayerTurn,
  resolvePcAction,
  beginNpcPlayback,
  resolveNpcAction,
  endRound,
  type GameState,
  type Direction,
  type PcAction,
  type NpcAction,
} from './GridModel'

export default function GridRenderingGame() {
  const stateRef = useRef<GameState>(initialState())
  const gameRef = useRef<Phaser.Game | null>(null)
  const [, setTick] = useState(0)
  const rerender = useCallback(() => setTick((n) => n + 1), [])

  const state = stateRef.current

  function scene(): GridScene | null {
    return (gameRef.current?.scene.getScene('GridScene') as GridScene) ?? null
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
      input: { windowEvents: false },
      scene: GridScene,
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
        stateRef.current = selectUnit(s, unitId)
        scene()?.redraw(stateRef.current)
        rerender()
      })

      game.events.on('cell-tapped', ({ col, row }: { col: number; row: number }) => {
        const s = stateRef.current
        if (s.phase !== 'player' || !s.selectedUnitId) return

        if (s.planningPhase === 'selecting-move') {
          stateRef.current = setPlanMove(s, s.selectedUnitId, col, row)
          scene()?.redraw(stateRef.current)
          rerender()
        } else if (s.planningPhase === 'selecting-attack') {
          const unit = s.units.find((u) => u.id === s.selectedUnitId)
          if (!unit) return
          const plan = s.plans[s.selectedUnitId]
          const baseCol = plan?.moveTarget?.col ?? unit.col
          const baseRow = plan?.moveTarget?.row ?? unit.row
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

  function handleDone() {
    const { state: newState, actions } = endPlayerTurn(stateRef.current)
    stateRef.current = newState
    scene()?.clearPlanningOverlay()
    rerender()
    runPcPlayback(actions, 0)
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────────

  const isPlaying = state.phase !== 'player'
  const showActionMenu = state.phase === 'player' && !!state.selectedUnitId && state.planningPhase === 'none'
  const showDone = state.phase === 'player'

  const btn = (extra: string) =>
    `px-4 py-2 rounded-lg text-sm font-semibold pointer-events-auto touch-manipulation ${extra}`

  return (
    <div className="relative w-full h-full">
      <PhaserGame buildConfig={buildConfig} onGameReady={onGameReady} />

      {!isPlaying && (
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
          {showDone && (
            <div className="flex justify-center">
              <button onClick={handleDone} className={btn('bg-green-600 hover:bg-green-500 active:bg-green-700 text-white px-8')}>
                Done
              </button>
            </div>
          )}
        </div>
      )}

      {isPlaying && (
        <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-gray-900/80 rounded-lg px-4 py-2 text-sm text-gray-300">
            {state.phase === 'pc-playback' ? 'PC Actions…' : 'Enemy Actions…'}
          </div>
        </div>
      )}
    </div>
  )
}
