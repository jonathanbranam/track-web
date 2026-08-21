import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { availableActions, commitAction, preview, threatTiles } from './actions'
import { initialState } from './npc'
import { reconcileHp } from './turn'
import { attackFootprint } from './attackFootprint'
import { validMoveDests, remainingMove, hasAttacked } from './pc'
import { getDef, setDef, setMaxHp, withMaxRange, reset as resetDefs } from './defStore'
import { getEngineMode, setEngineMode } from './engine-mode'
import { gridCols, gridRows } from './contentStore'
import type { GameState, PcType, NpcType, Tile, Unit } from './types'

// The seed board is 16x8 with power centres at (8,3), (5,4), (11,4), (2,6) and
// (14,6), and a tower at (8,6). Column 4 and row 5 are clear of all of it, so
// fixtures live there; the one test that wants a structure targets (5,4)
// deliberately.
type Seed = Partial<Unit> & {
  id: string
  kind: Unit['kind']
  unitType: PcType | NpcType
  col: number
  row: number
}

// A bare player-phase board: the seed's terrain and structures, but only the
// units a test places. `initialState` seats four PCs and five NPCs, which would
// otherwise block paths and absorb attacks in every assertion.
function board(units: Seed[]): GameState {
  const s = initialState()
  return {
    ...s,
    phase: 'player',
    units: units.map((u) => ({ hp: getDef(u.unitType).maxHp, ...u })) as Unit[],
    npcPlans: [],
  }
}

const optionFor = (state: GameState, id: string, action: 'move' | 'attack') =>
  availableActions(state, id).find((o) => o.id === action)!

const has = (tiles: Tile[], col: number, row: number) =>
  tiles.some((t) => t.col === col && t.row === row)

const hpOf = (state: GameState, id: string) => state.units.find((u) => u.id === id)?.hp ?? 0

beforeEach(() => {
  resetDefs()
})

describe('availableActions — availability', () => {
  it('offers both actions to an unmoved PC with a target in range', () => {
    const s = board([
      { id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 },
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 5, row: 5 },
    ])
    const [move, attack] = availableActions(s, 'pc-0')
    expect(move.available).toBe(true)
    expect(attack.available).toBe(true)
    expect(move.targets.length).toBeGreaterThan(0)
    expect(attack.targets.length).toBeGreaterThan(0)
    expect(move.reason).toBeUndefined()
    expect(attack.reason).toBeUndefined()
  })

  it('returns both actions unavailable, with reasons, once the PC has attacked', () => {
    const s = board([
      { id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 },
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 5, row: 5 },
    ])
    const after = commitAction(s, 'pc-0', 'attack', { col: 5, row: 5 })
    expect(after.ok).toBe(true)
    if (!after.ok) return

    const options = availableActions(after.state, 'pc-0')
    // Unavailable actions are returned, not filtered out — the host renders a
    // disabled control that explains itself.
    expect(options.map((o) => o.id)).toEqual(['move', 'attack'])
    for (const option of options) {
      expect(option.available).toBe(false)
      expect(option.targets).toEqual([])
      expect(option.reason).toMatch(/already attacked/)
    }
  })

  it('blocks movement but keeps attack available once movement is spent', () => {
    const base = board([{ id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 }])
    const s = { ...base, movedThisTurn: { 'pc-0': 4 } } // melee moves 4
    expect(remainingMove(s, s.units[0])).toBe(0)

    const move = optionFor(s, 'pc-0', 'move')
    expect(move.available).toBe(false)
    expect(move.reason).toMatch(/no movement left/)
    expect(optionFor(s, 'pc-0', 'attack').available).toBe(true)
  })

  it('reports an empty list for a unit that is not on the board', () => {
    expect(availableActions(board([]), 'ghost')).toEqual([])
  })
})

// ─── 1 — the phase guard, unconditional ────────────────────────────────────────

describe('availableActions/commitAction — the phase guard', () => {
  afterEach(() => setEngineMode('game'))

  it('refuses every action for a PC outside the player phase', () => {
    expect(getEngineMode()).toBe('game')
    const s: GameState = { ...board([{ id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 }]), phase: 'npc-move' }
    const [move, attack] = availableActions(s, 'pc-0')
    expect(move.available).toBe(false)
    expect(attack.available).toBe(false)
    expect(move.targets).toEqual([])
    expect(attack.targets).toEqual([])
    expect(move.reason).toMatch(/not the player's turn/)
    expect(attack.reason).toMatch(/not the player's turn/)
  })

  it('refuses committing outside the player phase, and changes nothing', () => {
    const s: GameState = { ...board([{ id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 }]), phase: 'npc-move' }
    const result = commitAction(s, 'pc-0', 'move', { col: 4, row: 3 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/not the player's turn/)
    expect(s.units.find((u) => u.id === 'pc-0')).toMatchObject({ col: 4, row: 5 })
  })

  // The guard used to lift in bench mode; it no longer does. These two are not
  // "the bench's own rule working" — they are an assertion that the exemption
  // is gone, so a regression that quietly restores `getEngineMode() !== 'bench'`
  // fails a test rather than only a review.
  it('refuses a PC outside the player phase in bench mode too — the bench is not exempt', () => {
    setEngineMode('bench')
    const s: GameState = { ...board([{ id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 }]), phase: 'npc-move' }
    const [move] = availableActions(s, 'pc-0')
    expect(move.available).toBe(false)
    expect(move.targets).toEqual([])
    expect(move.reason).toMatch(/not the player's turn/)
  })

  it('refuses committing outside the player phase in bench mode too, and changes nothing', () => {
    setEngineMode('bench')
    const s: GameState = { ...board([{ id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 }]), phase: 'npc-move' }
    const result = commitAction(s, 'pc-0', 'move', { col: 4, row: 3 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/not the player's turn/)
    expect(s.units.find((u) => u.id === 'pc-0')).toMatchObject({ col: 4, row: 5 })
  })
})

// ─── 2 — the action surface is the player's, and only the player's ────────────

describe('availableActions/commitAction — an enemy has no action surface', () => {
  afterEach(() => setEngineMode('game'))

  it('refuses every action for an enemy during the player phase, with a reason naming the planning seat', () => {
    const s = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 }])
    const [move, attack] = availableActions(s, 'npc-0')
    expect(move.available).toBe(false)
    expect(attack.available).toBe(false)
    expect(move.targets).toEqual([])
    expect(attack.targets).toEqual([])
    expect(move.reason).toMatch(/takes its turn by being planned/)
    expect(attack.reason).toMatch(/takes its turn by being planned/)
  })

  // The enemy reason wins over the phase reason: it is true in every phase,
  // where "it is not the player's turn" is only true in some, and a designer
  // clicking an enemy deserves the reason that tells them what to do instead.
  it('refuses an enemy outside the player phase too, with the enemy reason rather than the phase reason', () => {
    const s: GameState = {
      ...board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 }]),
      phase: 'npc-attack',
    }
    const [move, attack] = availableActions(s, 'npc-0')
    expect(move.available).toBe(false)
    expect(attack.available).toBe(false)
    expect(move.reason).toMatch(/takes its turn by being planned/)
    expect(attack.reason).toMatch(/takes its turn by being planned/)
  })

  it('refuses committing an action for an enemy, and changes nothing', () => {
    const s = board([
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 },
      { id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 4 },
    ])
    const before = s.units.find((u) => u.id === 'npc-0')
    const result = commitAction(s, 'npc-0', 'attack', { col: 4, row: 4 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/takes its turn by being planned/)
    expect(s.units.find((u) => u.id === 'npc-0')).toEqual(before)
  })

  // Not exempt in bench mode either — an enemy's one route into a round is
  // being planned, in every host, and the engine mode does not fence this.
  it('is not exempt in bench mode', () => {
    setEngineMode('bench')
    const s = board([
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 },
      { id: 'pc-0', kind: 'pc', unitType: 'melee', col: 5, row: 5 },
    ])
    const result = commitAction(s, 'npc-0', 'attack', { col: 5, row: 5 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/takes its turn by being planned/)
  })

  it('a PC is unaffected — judged on its own merits, not the enemy rule', () => {
    const s = board([
      { id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 },
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 9, row: 5 },
    ])
    const [move, attack] = availableActions(s, 'pc-0')
    expect(move.available).toBe(true)
    expect(attack.available).toBe(true)
  })
})

describe('availableActions — targets', () => {
  it('offers exactly the engine’s reachable tiles for a move', () => {
    const s = board([{ id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 }])
    expect(optionFor(s, 'pc-0', 'move').targets).toEqual(validMoveDests(s, 'pc-0'))
  })

  it('offers a magic-user its off-axis tiles, not just the four ahead of it', () => {
    const s = board([{ id: 'pc-0', kind: 'pc', unitType: 'magic-user', col: 4, row: 5 }])
    const targets = optionFor(s, 'pc-0', 'attack').targets

    // Aiming up centres the cross two tiles up: (4,3) plus its neighbours. The
    // left and right arms are the tiles a direction-only control cannot express.
    expect(has(targets, 4, 3)).toBe(true)
    expect(has(targets, 3, 3)).toBe(true)
    expect(has(targets, 5, 3)).toBe(true)

    const union = new Set(
      (['up', 'down', 'left', 'right'] as const).flatMap((d) =>
        attackFootprint(getDef('magic-user'), { col: 4, row: 5 }, d).map((t) => `${t.col},${t.row}`),
      ),
    )
    expect(new Set(targets.map((t) => `${t.col},${t.row}`))).toEqual(union)
  })

})

describe('commitAction — rejection', () => {
  it('rejects a target outside the offered set and leaves the state untouched', () => {
    const s = board([
      { id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 },
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 9, row: 5 },
    ])
    const result = commitAction(s, 'pc-0', 'attack', { col: 9, row: 5 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/not a legal attack target/)
    expect(hpOf(s, 'npc-0')).toBe(3)
  })

  // The bug this surface exists to make unrepresentable: the host derived a
  // direction from axis alignment alone, so tapping a distant tile in line with
  // a melee PC struck the adjacent tile instead — and attacks are committal.
  it('rejects an axis-aligned tile beyond the attack’s reach without dealing damage', () => {
    const s = board([
      { id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 6 },
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 },
    ])
    const result = commitAction(s, 'pc-0', 'attack', { col: 4, row: 2 })
    expect(result.ok).toBe(false)
    // The adjacent enemy — what the old derivation would have hit — is unhurt.
    expect(hpOf(s, 'npc-0')).toBe(3)
  })

  it('rejects a second attack in the same turn', () => {
    const s = board([
      { id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 },
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 5, row: 5 },
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 3, row: 5 },
    ])
    const first = commitAction(s, 'pc-0', 'attack', { col: 5, row: 5 })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const second = commitAction(first.state, 'pc-0', 'attack', { col: 3, row: 5 })
    expect(second.ok).toBe(false)
    if (second.ok) return
    expect(second.reason).toMatch(/already attacked/)
    expect(hpOf(first.state, 'npc-1')).toBe(3)
  })

  it('rejects a move further than the remaining budget allows', () => {
    const base = board([{ id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 }])
    const s = { ...base, movedThisTurn: { 'pc-0': 3 } } // 1 tile left of 4
    const result = commitAction(s, 'pc-0', 'move', { col: 4, row: 1 })
    expect(result.ok).toBe(false)
    expect(s.units[0].col).toBe(4)
    expect(s.units[0].row).toBe(5)
  })

  // There used to be a test here for an NPC attack landing outside its band —
  // "the offered-target check is the only thing standing between a host and an
  // enemy sniping across the board." That is no longer true: an enemy commit
  // is refused outright now (see "an enemy has no action surface" above), so
  // the target-membership check is never reached for an NPC actor through this
  // surface at all. The equivalent live protection is `commitNpcTurn`'s own
  // attack-tile legality check in `sequencer.test.ts`.
  it('rejects an unknown unit', () => {
    const result = commitAction(board([]), 'ghost', 'move', { col: 1, row: 1 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/no unit/)
  })
})

describe('commitAction — acceptance', () => {
  it('charges a move against the turn budget', () => {
    const s = board([{ id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 }])
    const result = commitAction(s, 'pc-0', 'move', { col: 4, row: 3 })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const moved = result.state.units.find((u) => u.id === 'pc-0')!
    expect({ col: moved.col, row: moved.row }).toEqual({ col: 4, row: 3 })
    expect(remainingMove(result.state, moved)).toBe(2)
  })

  it('locks the unit after an attack', () => {
    const s = board([
      { id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 },
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 5, row: 5 },
    ])
    const result = commitAction(s, 'pc-0', 'attack', { col: 5, row: 5 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(hasAttacked(result.state, 'pc-0')).toBe(true)
    expect(hpOf(result.state, 'npc-0')).toBe(1) // melee deals 2
  })

  it('resolves the whole cross when a magic-user is aimed at an off-axis tile', () => {
    const s = board([
      { id: 'pc-0', kind: 'pc', unitType: 'magic-user', col: 4, row: 5 },
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 3, row: 3 }, // off-axis arm
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 4, row: 3 }, // the centre
    ])
    // Committing against the off-axis arm resolves the cross that contains it,
    // so the centre takes damage too.
    const result = commitAction(s, 'pc-0', 'attack', { col: 3, row: 3 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(hpOf(result.state, 'npc-0')).toBe(2)
    expect(hpOf(result.state, 'npc-1')).toBe(2)
  })

  // There used to be a test here for a hand-driven NPC attack marking itself
  // spent so it could not attack twice in the same turn. That capability is
  // gone, not narrowed: an enemy has no action surface of its own any more
  // (see "an enemy has no action surface" above), so there is no route left by
  // which an NPC can attack through `commitAction` even once.
})

describe('preview', () => {
  // Previews are read by resolving and diffing rather than by re-deriving the
  // damage rules, so they cannot disagree with a commit. This asserts that
  // directly for every archetype — the drift it guards against is exactly how
  // the game's attack animations came to contradict attackFootprint.
  const reachOf: Record<PcType, number> = { melee: 1, rogue: 1, ranger: 2, 'magic-user': 2 }
  for (const archetype of Object.keys(reachOf) as PcType[]) {
    it(`agrees with the committed outcome for ${archetype}`, () => {
      const enemyRow = 5 - reachOf[archetype]
      const s = board([
        { id: 'pc-0', kind: 'pc', unitType: archetype, col: 4, row: 5 },
        { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: enemyRow },
      ])
      const target = optionFor(s, 'pc-0', 'attack').targets
        .find((t) => t.col === 4 && t.row === enemyRow)
      expect(target).toBeDefined()
      if (!target) return

      const p = preview(s, 'pc-0', 'attack', target)!
      const committed = commitAction(s, 'pc-0', 'attack', target)
      expect(committed.ok).toBe(true)
      if (!committed.ok) return

      const effect = p.effects.find((e) => e.kind === 'damage' && e.target === 'npc-0')
      expect(effect).toBeDefined()
      const dealt = effect && effect.kind === 'damage' ? effect.amount : 0
      expect(dealt).toBe(hpOf(s, 'npc-0') - hpOf(committed.state, 'npc-0'))
    })
  }

  it('reports a move’s cost', () => {
    const s = board([{ id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 }])
    const p = preview(s, 'pc-0', 'move', { col: 4, row: 3 })!
    expect(p.cost).toBe(2)
    expect(p.affected).toHaveLength(2)
    expect(p.effects).toEqual([])
  })

  it('reports structure damage, which is not unit damage', () => {
    // The seed board's power centre at (5,4), struck from the tile beside it.
    const s = board([{ id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 4 }])
    expect(s.cells[4][5].hasStructure).toBe(true)

    const p = preview(s, 'pc-0', 'attack', { col: 5, row: 4 })!
    expect(p.effects).toHaveLength(1)
    expect(p.effects[0].kind).toBe('damage-structure')
    // Structures take exactly one point per hit, whatever the attacker deals.
    expect(p.effects[0].kind === 'damage-structure' ? p.effects[0].amount : 0).toBe(1)
    expect(p.hitsNothing).toBe(false)
  })

  // `preview` does not go through commitAction's membership check, so it is the
  // one public path that would expose a direction derived from axis alignment
  // alone: the old host logic would happily preview an adjacent strike for a
  // tile four tiles away.
  it('refuses to preview an axis-aligned tile beyond the attack’s reach', () => {
    const s = board([
      { id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 6 },
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 },
    ])
    expect(preview(s, 'pc-0', 'attack', { col: 4, row: 2 })).toBeNull()
  })

  it('marks a lethal blow', () => {
    const s = board([
      { id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5 },
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 5, row: 5, hp: 1 },
    ])
    const p = preview(s, 'pc-0', 'attack', { col: 5, row: 5 })!
    expect(p.effects[0].kind === 'damage' && p.effects[0].lethal).toBe(true)
  })
})

describe('an action that hits nothing stays legal', () => {
  const alone = () => board([{ id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 1 }])

  it('offers empty tiles as attack targets', () => {
    const s = alone()
    const targets = optionFor(s, 'pc-0', 'attack').targets
    expect(targets.length).toBeGreaterThan(0)
    expect(targets.every((t) => !s.units.some((u) => u.col === t.col && u.row === t.row))).toBe(true)
  })

  it('previews as hitting nothing', () => {
    const p = preview(alone(), 'pc-0', 'attack', { col: 4, row: 0 })!
    expect(p.hitsNothing).toBe(true)
    expect(p.effects).toEqual([])
    expect(p.affected).toEqual([{ col: 4, row: 0 }])
  })

  it('commits successfully and still locks the unit', () => {
    const result = commitAction(alone(), 'pc-0', 'attack', { col: 4, row: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(hasAttacked(result.state, 'pc-0')).toBe(true)
  })
})

describe('threatTiles', () => {
  it('spans a long-range unit’s whole band, not one tile', () => {
    const s = board([{ id: 'npc-0', kind: 'npc', unitType: 'long-range', col: 4, row: 5 }])
    const tiles = threatTiles(s, 'npc-0')
    expect(has(tiles, 4, 3)).toBe(true)
    expect(has(tiles, 4, 2)).toBe(true)
    expect(has(tiles, 4, 5)).toBe(false) // never its own tile
    expect(has(tiles, 4, 4)).toBe(false) // minRange 2 — the adjacent tile is safe
  })

  // Moved here from `availableActions — targets`: an enemy has no action
  // surface of its own any more (see "an enemy has no action surface" above),
  // so `threatTiles` — the query a host actually has for what an enemy can
  // hit, e.g. for a threat overlay — is what now carries this coverage.
  it('offers an NPC its whole targeting band, not just the tile it resolves on', () => {
    const s = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 }])
    const targets = threatTiles(s, 'npc-0')

    // short-range selects anywhere from range 1 to 2 though it resolves on one
    // tile. Reading the footprint alone would understate its reach by half.
    expect(has(targets, 4, 4)).toBe(true)
    expect(has(targets, 4, 3)).toBe(true)
    expect(attackFootprint(getDef('short-range'), { col: 4, row: 5 }, 'up')).toEqual([{ col: 4, row: 4 }])
  })

  it('truncates a band at the first blocker', () => {
    const s = board([
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 },
      { id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 4 },
    ])
    const targets = threatTiles(s, 'npc-0')
    expect(has(targets, 4, 4)).toBe(true)   // the blocker itself is targetable
    expect(has(targets, 4, 3)).toBe(false)  // nothing behind it is
  })

  it('follows an edited definition with no host recalculation', () => {
    const s = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 }])
    const before = threatTiles(s, 'npc-0').length
    setDef('short-range', withMaxRange(getDef('short-range'), 4))
    expect(threatTiles(s, 'npc-0').length).toBeGreaterThan(before)
  })

  it('stays inside the board', () => {
    const s = board([{ id: 'npc-0', kind: 'npc', unitType: 'long-range', col: 0, row: 0 }])
    for (const t of threatTiles(s, 'npc-0')) {
      expect(t.col).toBeGreaterThanOrEqual(0)
      expect(t.row).toBeGreaterThanOrEqual(0)
      expect(t.col).toBeLessThan(gridCols())
      expect(t.row).toBeLessThan(gridRows())
    }
  })
})

describe('reconcileHp', () => {
  it('raises current HP by the same amount as the maximum', () => {
    const s = board([{ id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5, hp: 2 }])
    setMaxHp('melee', 5) // was 3
    expect(reconcileHp(s, { melee: 3 }).units[0].hp).toBe(4)
  })

  it('never kills a unit when the maximum drops below its current HP', () => {
    const s = board([{ id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5, hp: 1 }])
    setMaxHp('melee', 1) // a drop of 2 against 1 HP
    const next = reconcileHp(s, { melee: 3 })
    expect(next.units).toHaveLength(1)
    expect(next.units[0].hp).toBe(1)
  })

  it('leaves archetypes absent from the snapshot alone', () => {
    const s = board([
      { id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 5, hp: 2 },
      { id: 'pc-1', kind: 'pc', unitType: 'rogue', col: 3, row: 5, hp: 2 },
    ])
    setMaxHp('melee', 5)
    expect(hpOf(reconcileHp(s, { melee: 3 }), 'pc-1')).toBe(2)
  })
})
