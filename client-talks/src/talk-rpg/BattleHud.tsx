import { useDirector } from './Director'
import { useWorldAnchor } from './useWorldAnchor'

interface HpLabelProps {
  entityId: string
  hp: number
  maxHp: number
  taggedOut?: boolean
}

function HpLabel({ entityId, hp, maxHp, taggedOut }: HpLabelProps) {
  const anchorRef = useWorldAnchor(entityId)
  return (
    <div ref={anchorRef} className="fixed left-0 top-0 z-10" style={{ display: 'none' }}>
      <div
        className={`pointer-events-none -translate-x-1/2 -translate-y-[140%] whitespace-nowrap rounded bg-black/80 px-2 py-1 font-mono text-sm font-bold text-white shadow-xl ${
          taggedOut ? 'opacity-50' : ''
        }`}
      >
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
      {battle.allies.map((ally) => (
        <HpLabel key={ally.id} entityId={ally.id} hp={ally.hp} maxHp={ally.maxHp} taggedOut={ally.tag === 'out'} />
      ))}
      {battle.enemies.map((enemy) => (
        <HpLabel key={enemy.id} entityId={enemy.id} hp={enemy.hp} maxHp={enemy.maxHp} />
      ))}
    </>
  )
}
