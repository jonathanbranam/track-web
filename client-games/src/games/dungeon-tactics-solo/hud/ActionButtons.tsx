import type { GameState } from '../types'
import HudButton from './HudButton'

// The bottom action row. Placement shows a single Start; the player phase shows
// Undo (left, disabled when the undo stack is empty) and Done (right). Other
// phases (playback) show no turn controls.
export default function ActionButtons({
  state,
  onPlacementDone,
  onDone,
  onUndo,
}: {
  state: GameState
  onPlacementDone: () => void
  onDone: () => void
  onUndo: () => void
}) {
  if (state.phase === 'placement') {
    return (
      <div className="flex justify-end">
        <HudButton variant="primary" onClick={onPlacementDone} className="px-6 py-2 text-base">
          Start
        </HudButton>
      </div>
    )
  }

  if (state.phase === 'player') {
    return (
      <div className="flex justify-between">
        <HudButton
          variant="info"
          disabled={state.undoStack.length === 0}
          onClick={onUndo}
          className="px-6 py-2 text-base"
        >
          Undo
        </HudButton>
        <HudButton variant="primary" onClick={onDone} className="px-6 py-2 text-base">
          Done
        </HudButton>
      </div>
    )
  }

  return null
}
