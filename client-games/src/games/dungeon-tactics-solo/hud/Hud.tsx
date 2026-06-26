import type { GameState } from '../types'
import StatusPill from './StatusPill'
import ActionButtons from './ActionButtons'
import UnitInfoPopup from './UnitInfoPopup'
import ConfirmModal from './ConfirmModal'
import HudButton from './HudButton'

export interface HudHandlers {
  onReset: () => void
  onPlacementDone: () => void
  onDone: () => void
  onConfirmEndTurn: () => void
  onCancelConfirm: () => void
  onUndo: () => void
  onToggleAttack: () => void
  onClosePopup: () => void
}

// ReactDOM HUD overlay layered over the Phaser canvas. The root is
// `pointer-events-none` so taps in empty regions fall through to the board;
// individual controls re-enable pointer events. The HUD reads the authoritative
// GameState passed from DungeonTacticsGame and re-renders on every game-state
// change. Board-anchored visuals (arrows, highlights, HP pips) stay in Phaser.
export default function Hud({
  state,
  confirmOpen,
  handlers,
}: {
  state: GameState
  confirmOpen: boolean
  handlers: HudHandlers
}) {
  const popupShown =
    (state.phase === 'player' || state.phase === 'placement') && !!state.selectedUnitId

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      <StatusPill phase={state.phase} />

      {/* Reset — top-right, always available. */}
      <HudButton variant="danger" onClick={handlers.onReset} className="absolute right-2 top-2">
        Reset
      </HudButton>

      {/* Bottom region: action row stacked above the unit popup so the row lifts
          when the popup is open (mirroring the former Phaser layout). */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-2"
        style={{ paddingBottom: 'calc(0.5rem + var(--sab, 0px))' }}
      >
        <ActionButtons
          state={state}
          onPlacementDone={handlers.onPlacementDone}
          onDone={handlers.onDone}
          onUndo={handlers.onUndo}
        />
        {popupShown && (
          <UnitInfoPopup
            state={state}
            onClose={handlers.onClosePopup}
            onToggleAttack={handlers.onToggleAttack}
          />
        )}
      </div>

      {confirmOpen && (
        <ConfirmModal
          state={state}
          onCancel={handlers.onCancelConfirm}
          onConfirm={handlers.onConfirmEndTurn}
        />
      )}
    </div>
  )
}
