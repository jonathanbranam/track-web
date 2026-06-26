import type { GameState } from '../types'
import { unitDisplayName, attackDamage, hasAttacked } from '../pc'
import { getMaxHp, getMoveRange } from '../defStore'
import HudButton from './HudButton'

// Per-archetype accent colors, kept in sync with the board's UNIT_COLORS. Used
// to tint the portrait placeholder until real unit images land.
const UNIT_HEX: Record<string, string> = {
  'melee': '#4a90e2',
  'ranger': '#2ecc71',
  'magic-user': '#9b59b6',
  'rogue': '#e67e22',
  'short-range': '#e24a4a',
  'long-range': '#cc8800',
}

// Bottom unit info panel for the selected unit: portrait, name, stat lines, a
// Close control, and (for PCs that may still act) an Attack toggle. Max HP and
// move read from the same per-archetype source the engine uses, so the panel
// can't drift from the board. During placement the Attack toggle is disabled
// (the panel is a pure info/repositioning view).
export default function UnitInfoPopup({
  state,
  onClose,
  onToggleAttack,
}: {
  state: GameState
  onClose: () => void
  onToggleAttack: () => void
}) {
  const unit = state.units.find((u) => u.id === state.selectedUnitId)
  if (!unit) return null

  const isPc = unit.kind === 'pc'
  const placement = state.phase === 'placement'
  const maxHp = getMaxHp(unit.unitType)
  const move = getMoveRange(unit.unitType)
  const showAttack = isPc && (placement || !hasAttacked(state, unit.id))
  const attackActive = !placement && state.planningPhase === 'selecting-attack'

  return (
    <div className="pointer-events-auto relative mx-auto w-full max-w-[380px] rounded-xl border border-gray-700 bg-gray-900/95 p-3 shadow-lg">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-gray-700 text-white hover:bg-gray-600"
      >
        ✕
      </button>

      <div className="flex gap-3">
        {/* Portrait area — reserved for a future (simple) unit image. */}
        <div
          className="h-[72px] w-[72px] shrink-0 rounded-lg border border-white/40"
          style={{ backgroundColor: UNIT_HEX[unit.unitType] ?? '#4a90e2' }}
        />
        <div className="min-w-0 flex-1">
          <div className="pr-8 text-lg font-bold text-white">{unitDisplayName(unit)}</div>
          <div className="mt-1 space-y-0.5 text-sm text-gray-300">
            <div>HP {unit.hp}/{maxHp}</div>
            <div>Move {move}</div>
            {isPc && <div>Attack {attackDamage(unit)}</div>}
          </div>
        </div>
      </div>

      {showAttack && (
        <div className="mt-2 flex justify-end">
          <HudButton
            variant={attackActive ? 'active' : 'default'}
            disabled={placement}
            onClick={onToggleAttack}
          >
            Attack
          </HudButton>
        </div>
      )}
    </div>
  )
}
