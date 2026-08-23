import type { ActionId, GameState } from '@repo/dungeon-engine'
import {
  unitDisplayName,
  attackDamage,
  availableActions,
  getMaxHp,
  getMoveRange,
  css,
  UNIT_FILL,
} from '@repo/dungeon-engine'
import HudButton from './HudButton'

const ACTIVE_FOR: Record<ActionId, GameState['planningPhase']> = {
  move: 'selecting-move',
  attack: 'selecting-attack',
}

// Bottom unit info panel for the selected unit: portrait, name, stat lines, a
// Close control, and the unit's action bar. Max HP and move read from the same
// per-archetype source the engine uses, so the panel can't drift from the board.
//
// The action bar is the engine's answer, not the client's: `availableActions`
// decides which actions exist, whether each is available, and why not. An
// unavailable action is shown disabled with that reason rather than hidden, so
// "why can't I move?" is answered on screen instead of by the tiles silently
// failing to appear. During placement the panel is a pure info/repositioning
// view and no actions are offered.
export default function UnitInfoPopup({
  state,
  onClose,
  onSelectAction,
}: {
  state: GameState
  onClose: () => void
  onSelectAction: (action: ActionId) => void
}) {
  const unit = state.units.find((u) => u.id === state.selectedUnitId)
  if (!unit) return null

  const isPc = unit.kind === 'pc'
  const placement = state.phase === 'placement'
  const maxHp = getMaxHp(unit.unitType)
  const move = getMoveRange(unit.unitType)
  const actions = isPc && !placement ? availableActions(state, unit.id) : []
  const blockedReason = actions.find((a) => !a.available)?.reason

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
          // The archetype's own fill, from the engine's shared vocabulary —
          // this was a third hand-synced copy of it, tinting the portrait
          // placeholder until real unit images land.
          style={{ backgroundColor: css(UNIT_FILL[unit.unitType] ?? UNIT_FILL.melee) }}
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

      {actions.length > 0 && (
        <>
          <div className="mt-2 flex justify-end gap-2">
            {actions.map((action) => (
              <HudButton
                key={action.id}
                variant={state.planningPhase === ACTIVE_FOR[action.id] && action.available ? 'active' : 'default'}
                disabled={!action.available}
                title={action.reason}
                onClick={() => onSelectAction(action.id)}
              >
                {action.label}
              </HudButton>
            ))}
          </div>
          {blockedReason && (
            <div className="mt-1 text-right text-xs text-gray-400">{blockedReason}</div>
          )}
        </>
      )}
    </div>
  )
}
