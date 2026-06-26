import type { GameState } from '../types'
import { hasAttacked } from '../pc'
import HudButton from './HudButton'

// Centered end-of-turn confirmation. The backdrop is `pointer-events-auto` and
// covers the viewport so the modal is blocking — only Cancel/Confirm act.
// Warns when some PCs have not attacked this round. Open/closed state is owned
// by React (DungeonTacticsGame), not the Phaser scene.
export default function ConfirmModal({
  state,
  onCancel,
  onConfirm,
}: {
  state: GameState
  onCancel: () => void
  onConfirm: () => void
}) {
  const pcsNotAttacked = state.units.filter(
    (u) => u.kind === 'pc' && !hasAttacked(state, u.id),
  ).length
  const word = pcsNotAttacked !== 1 ? 'units have' : 'unit has'

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-[320px] rounded-2xl border border-gray-700 bg-gray-900 p-5 text-center shadow-xl">
        <div className="text-base font-bold text-white">End your turn?</div>
        {pcsNotAttacked > 0 && (
          <div className="mt-2 text-xs text-yellow-400">
            {pcsNotAttacked} {word} not attacked.
          </div>
        )}
        <div className="mt-4 flex justify-center gap-3">
          <HudButton variant="default" onClick={onCancel} className="min-w-[96px]">
            Cancel
          </HudButton>
          <HudButton variant="primary" onClick={onConfirm} className="min-w-[96px]">
            Confirm
          </HudButton>
        </div>
      </div>
    </div>
  )
}
