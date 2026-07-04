import { useDirector } from './Director'
import { useWorldAnchor } from './useWorldAnchor'

interface HpLabelProps {
  entityId: string
  hp: number
  maxHp: number
}

function HpLabel({ entityId, hp, maxHp }: HpLabelProps) {
  const anchorRef = useWorldAnchor(entityId)
  return (
    <div ref={anchorRef} className="fixed left-0 top-0 z-10" style={{ display: 'none' }}>
      <div className="pointer-events-none -translate-x-1/2 -translate-y-[140%] whitespace-nowrap rounded bg-black/80 px-2 py-1 font-mono text-sm font-bold text-white shadow-xl">
        {hp}/{maxHp} HP
      </div>
    </div>
  )
}

/** Renders a world-anchored HP label over every in-battle combatant; nothing when `resting.battle` is null. */
export default function BattleHud() {
  const { resting } = useDirector()
  const { battle } = resting
  if (!battle) return null

  return (
    <>
      <HpLabel entityId={battle.ally.id} hp={battle.ally.hp} maxHp={battle.ally.maxHp} />
      {battle.enemies.map((enemy) => (
        <HpLabel key={enemy.id} entityId={enemy.id} hp={enemy.hp} maxHp={enemy.maxHp} />
      ))}
    </>
  )
}
