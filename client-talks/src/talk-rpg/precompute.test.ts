import { describe, expect, it } from 'vitest'
import { runPrecompute } from './precompute'
import { Action, BATTLE_SCENE_ID, GameMap } from './script'

const TOWN: GameMap = {
  sceneId: 'test-town',
  width: 5,
  height: 5,
  tiles: new Array(25).fill(0),
  walkableGrid: new Array(25).fill(true),
  namedLocations: { plaza: { x: 4, y: 0 } },
  entities: [{ id: 'pc', x: 0, y: 0 }],
}

const CAVE: GameMap = {
  sceneId: 'test-cave',
  width: 3,
  height: 3,
  tiles: new Array(9).fill(0),
  walkableGrid: new Array(9).fill(true),
  namedLocations: { torch: { x: 2, y: 2 } },
  entities: [
    { id: 'pc', x: 0, y: 0 },
    { id: 'bat', x: 1, y: 1 },
  ],
}

const BATTLE: GameMap = {
  sceneId: BATTLE_SCENE_ID,
  width: 10,
  height: 6,
  tiles: new Array(60).fill(0),
  walkableGrid: new Array(60).fill(false),
  namedLocations: {
    allySlot0: { x: 8, y: 3 },
    allySlot1: { x: 8, y: 1 },
    enemySlot0: { x: 1, y: 2 },
    enemySlot1: { x: 1, y: 4 },
  },
  entities: [],
}

const MAPS: Record<string, GameMap> = { [TOWN.sceneId]: TOWN, [CAVE.sceneId]: CAVE, [BATTLE.sceneId]: BATTLE }

const ACTIONS: Action[] = [
  { type: 'walk', entity: 'pc', path: [{ direction: 'right', steps: 2 }] },
  { type: 'pause', seconds: 3 },
  { type: 'stop' },

  { type: 'startDialogue' },
  { type: 'say', text: 'hi' },
  { type: 'endDialogue' },
  { type: 'stop' },

  { type: 'walk', entity: 'pc', path: [{ direction: 'down', steps: 1 }] },
  { type: 'stop' },
]

describe('runPrecompute', () => {
  it('produces one checkpoint per stop, in script order', () => {
    const checkpoints = runPrecompute(ACTIONS, MAPS, TOWN.sceneId)
    expect(checkpoints).toHaveLength(3)
    expect(checkpoints[0].entities.pc).toMatchObject({ x: 2, y: 0, facing: 'right' })
    expect(checkpoints[0].camera).toEqual({ x: 2, y: 0, zoom: 1 })
    expect(checkpoints[1].ui).toEqual({ kind: 'none' })
    expect(checkpoints[2].entities.pc).toMatchObject({ x: 2, y: 1, facing: 'down' })
  })

  it('is deterministic across runs and never waits on real time', () => {
    const start = Date.now()
    const a = runPrecompute(ACTIONS, MAPS, TOWN.sceneId)
    const b = runPrecompute(ACTIONS, MAPS, TOWN.sceneId)
    const elapsed = Date.now() - start

    expect(a).toEqual(b)
    expect(elapsed).toBeLessThan(50)
  })

  it('resolves walkTo to a named location, pathfinding around the grid', () => {
    const actions: Action[] = [
      { type: 'walkTo', entity: 'pc', target: 'plaza' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.entities.pc).toMatchObject({ x: 4, y: 0, facing: 'right' })
  })

  it('walkTo is a no-op when the target is unreachable', () => {
    const blocked: GameMap = {
      ...TOWN,
      sceneId: 'test-blocked',
      walkableGrid: TOWN.walkableGrid.map((_, i) => i !== 4), // wall off the plaza tile itself
    }
    const maps = { [blocked.sceneId]: blocked }
    const actions: Action[] = [
      { type: 'walkTo', entity: 'pc', target: 'plaza' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, maps, blocked.sceneId)
    expect(checkpoint.entities.pc).toMatchObject({ x: 0, y: 0, facing: 'down' })
  })

  it('walkTo resolves another entity\'s current position as the target', () => {
    const actions: Action[] = [
      { type: 'walkTo', entity: 'pc', target: 'bat' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, CAVE.sceneId)
    expect(checkpoint.entities.pc).toMatchObject({ x: 1, y: 1 })
  })

  it('enterScene switches the active scene, resets NPCs, and repositions pc at a named location', () => {
    const actions: Action[] = [
      { type: 'enterScene', scene: 'test-cave', at: 'torch' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.sceneId).toBe('test-cave')
    expect(checkpoint.entities.pc).toMatchObject({ x: 2, y: 2 })
    expect(checkpoint.entities.bat).toMatchObject({ x: 1, y: 1 })
    expect(checkpoint.camera).toEqual({ x: 2, y: 2, zoom: 1 })
  })
})

describe('resting-state ui/overlay transitions', () => {
  it('startDialogue -> say -> endDialogue clears to { kind: "none" }', () => {
    const actions: Action[] = [
      { type: 'startDialogue', speaker: 'guide' },
      { type: 'stop' },
      { type: 'say', text: 'Hello, traveler.' },
      { type: 'stop' },
      { type: 'endDialogue' },
      { type: 'stop' },
    ]
    const [opened, said, closed] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(opened.ui).toEqual({ kind: 'dialogue', speaker: 'guide', text: '', variant: 'say' })
    expect(said.ui).toEqual({ kind: 'dialogue', speaker: 'guide', text: 'Hello, traveler.', variant: 'say' })
    expect(closed.ui).toEqual({ kind: 'none' })
  })

  it('thought sets a dialogue slot with variant "thought" and the entity id as speaker', () => {
    const actions: Action[] = [
      { type: 'thought', entity: 'pc', text: 'I should try a familiar.' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.ui).toEqual({ kind: 'dialogue', speaker: 'pc', text: 'I should try a familiar.', variant: 'thought' })
  })

  it('showMenu -> selectMenuOption -> hideMenu likewise clears to { kind: "none" }', () => {
    const actions: Action[] = [
      { type: 'showMenu', menuKind: 'command', options: ['Fight', 'Spell', 'Run'] },
      { type: 'stop' },
      { type: 'selectMenuOption', index: 2 },
      { type: 'stop' },
      { type: 'hideMenu' },
      { type: 'stop' },
    ]
    const [opened, selected, closed] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(opened.ui).toEqual({ kind: 'menu', menuKind: 'command', options: ['Fight', 'Spell', 'Run'], selectedIndex: 0 })
    expect(selected.ui).toEqual({ kind: 'menu', menuKind: 'command', options: ['Fight', 'Spell', 'Run'], selectedIndex: 2 })
    expect(closed.ui).toEqual({ kind: 'none' })
  })

  it('a showMenu while ui is dialogue replaces it, never leaving both set', () => {
    const actions: Action[] = [
      { type: 'startDialogue' },
      { type: 'say', text: 'hi' },
      { type: 'showMenu', menuKind: 'command', options: [] },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.ui).toEqual({ kind: 'menu', menuKind: 'command', options: [], selectedIndex: 0 })
  })

  it('showOverlay/hideOverlay are independent of the ui slot', () => {
    const actions: Action[] = [
      { type: 'startDialogue' },
      { type: 'say', text: 'hi' },
      { type: 'showOverlay', kind: 'headline', text: 'STAGE 1' },
      { type: 'stop' },
      { type: 'hideOverlay' },
      { type: 'stop' },
    ]
    const [shown, hidden] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(shown.overlay).toEqual({ kind: 'headline', text: 'STAGE 1' })
    expect(shown.ui).toEqual({ kind: 'dialogue', speaker: undefined, text: 'hi', variant: 'say' })
    expect(hidden.overlay).toBeNull()
    expect(hidden.ui).toEqual({ kind: 'dialogue', speaker: undefined, text: 'hi', variant: 'say' })
  })
})

describe('battle resting-state transitions', () => {
  it('startBattle sets sceneId/entities/battle together, with a fixed per-slot facing', () => {
    const actions: Action[] = [
      { type: 'startBattle', allies: [{ id: 'pc', hp: 20, maxHp: 20 }], enemies: [{ id: 'slime', hp: 12, maxHp: 12 }] },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.sceneId).toBe(BATTLE_SCENE_ID)
    expect(checkpoint.entities.pc).toMatchObject({ x: 8, y: 3, facing: 'left' })
    expect(checkpoint.entities.slime).toMatchObject({ x: 1, y: 2, facing: 'right' })
    expect(checkpoint.battle).toEqual({
      allies: [{ id: 'pc', hp: 20, maxHp: 20, tag: 'in' }],
      enemies: [{ id: 'slime', hp: 12, maxHp: 12 }],
    })
  })

  it('battleAction clamps damage to 0 and sets the narration ui slot', () => {
    const actions: Action[] = [
      { type: 'startBattle', allies: [{ id: 'pc', hp: 20, maxHp: 20 }], enemies: [{ id: 'slime', hp: 12, maxHp: 12 }] },
      { type: 'battleAction', actor: 'pc', target: 'slime', kind: 'attack', damage: 999, text: 'Critical hit!' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.battle?.enemies[0]).toEqual({ id: 'slime', hp: 0, maxHp: 12 })
    expect(checkpoint.ui).toEqual({ kind: 'dialogue', text: 'Critical hit!', variant: 'say' })
  })

  it('a wrong-action battleAction with negative damage heals, clamped to maxHp', () => {
    const actions: Action[] = [
      { type: 'startBattle', allies: [{ id: 'pc', hp: 20, maxHp: 20 }], enemies: [{ id: 'slime', hp: 12, maxHp: 12 }] },
      { type: 'battleAction', actor: 'pc', target: 'slime', kind: 'wrong-action', damage: -999, text: 'It heals!' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.battle?.enemies[0]).toEqual({ id: 'slime', hp: 12, maxHp: 12 })
  })

  it('endBattle clears battle without touching sceneId/entities', () => {
    const actions: Action[] = [
      { type: 'startBattle', allies: [{ id: 'pc', hp: 20, maxHp: 20 }], enemies: [{ id: 'slime', hp: 12, maxHp: 12 }] },
      { type: 'endBattle', outcome: 'victory' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.battle).toBeNull()
    expect(checkpoint.sceneId).toBe(BATTLE_SCENE_ID)
    expect(checkpoint.entities.pc).toMatchObject({ x: 8, y: 3 })
    expect(checkpoint.entities.slime).toMatchObject({ x: 1, y: 2 })
  })

  it('defeatSequence/hideOverlay round-trip through the overlay slot', () => {
    const actions: Action[] = [
      { type: 'defeatSequence', text: 'THOU ART DEAD' },
      { type: 'stop' },
      { type: 'hideOverlay' },
      { type: 'stop' },
    ]
    const [shown, hidden] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(shown.overlay).toEqual({ kind: 'defeat', text: 'THOU ART DEAD' })
    expect(hidden.overlay).toBeNull()
  })

  it('startBattle places multiple allies at distinct slots, each defaulting to tag "in"', () => {
    const actions: Action[] = [
      {
        type: 'startBattle',
        allies: [
          { id: 'pc', hp: 20, maxHp: 20 },
          { id: 'familiar', hp: 14, maxHp: 14 },
        ],
        enemies: [{ id: 'slime', hp: 12, maxHp: 12 }],
      },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.entities.pc).toMatchObject({ x: 8, y: 3, facing: 'left' })
    expect(checkpoint.entities.familiar).toMatchObject({ x: 8, y: 1, facing: 'left' })
    expect(checkpoint.battle).toEqual({
      allies: [
        { id: 'pc', hp: 20, maxHp: 20, tag: 'in' },
        { id: 'familiar', hp: 14, maxHp: 14, tag: 'in' },
      ],
      enemies: [{ id: 'slime', hp: 12, maxHp: 12 }],
    })
  })
})

describe('tagCombatant resting-state transitions', () => {
  const START_ACTION: Action = {
    type: 'startBattle',
    allies: [
      { id: 'pc', hp: 20, maxHp: 20 },
      { id: 'familiar', hp: 14, maxHp: 14 },
    ],
    enemies: [{ id: 'slime', hp: 12, maxHp: 12 }],
  }

  it('sets a named ally\'s tag', () => {
    const actions: Action[] = [
      START_ACTION,
      { type: 'tagCombatant', entity: 'familiar', action: 'out' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.battle?.allies).toEqual([
      { id: 'pc', hp: 20, maxHp: 20, tag: 'in' },
      { id: 'familiar', hp: 14, maxHp: 14, tag: 'out' },
    ])
  })

  it('is a no-op outside battle', () => {
    const actions: Action[] = [{ type: 'tagCombatant', entity: 'pc', action: 'out' }, { type: 'stop' }]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.battle).toBeNull()
  })

  it('is a no-op for a non-ally entity id', () => {
    const actions: Action[] = [START_ACTION, { type: 'tagCombatant', entity: 'slime', action: 'out' }, { type: 'stop' }]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.battle?.allies).toEqual([
      { id: 'pc', hp: 20, maxHp: 20, tag: 'in' },
      { id: 'familiar', hp: 14, maxHp: 14, tag: 'in' },
    ])
    expect(checkpoint.battle?.enemies).toEqual([{ id: 'slime', hp: 12, maxHp: 12 }])
  })
})

describe('partyJoin resting-state transitions', () => {
  it('adds a new entity at an authored named location', () => {
    const actions: Action[] = [
      { type: 'partyJoin', entity: 'familiar', at: 'plaza' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.entities.familiar).toMatchObject({ x: 4, y: 0 })
  })

  it('defaults to pc\'s current position when "at" is omitted', () => {
    const actions: Action[] = [
      { type: 'walk', entity: 'pc', path: [{ direction: 'right', steps: 2 }] },
      { type: 'partyJoin', entity: 'familiar' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.entities.familiar).toMatchObject({ x: 2, y: 0 })
    expect(checkpoint.entities.familiar).toMatchObject({ x: checkpoint.entities.pc.x, y: checkpoint.entities.pc.y })
  })
})

describe('showStatus/levelUp resting-state transitions', () => {
  it('showStatus sets the real-content status ui variant', () => {
    const actions: Action[] = [
      { type: 'showStatus', entity: 'pc', stats: { level: 3, role: 'Warrior', hp: 20, maxHp: 20 }, options: ['Close'] },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.ui).toEqual({
      kind: 'menu',
      menuKind: 'status',
      entity: 'pc',
      stats: { level: 3, role: 'Warrior', hp: 20, maxHp: 20 },
      options: ['Close'],
      selectedIndex: 0,
    })
  })

  it('levelUp sets the narration dialogue ui slot', () => {
    const actions: Action[] = [{ type: 'levelUp', entity: 'pc', text: 'PC learned Radiant!' }, { type: 'stop' }]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.ui).toEqual({ kind: 'dialogue', text: 'PC learned Radiant!', variant: 'say' })
  })

  it('two showStatus calls for the same entity with different payloads produce independent resting-state content', () => {
    const actions: Action[] = [
      { type: 'showStatus', entity: 'pc', stats: { level: 1, hp: 10, maxHp: 10 } },
      { type: 'stop' },
      { type: 'showStatus', entity: 'pc', stats: { level: 2, hp: 18, maxHp: 18 } },
      { type: 'stop' },
    ]
    const [first, second] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(first.ui).toMatchObject({ stats: { level: 1, hp: 10, maxHp: 10 } })
    expect(second.ui).toMatchObject({ stats: { level: 2, hp: 18, maxHp: 18 } })
  })
})

describe('full battle sequence precompute', () => {
  it('startBattle -> battleAction -> wrong-action battleAction -> endBattle(victory) -> enterScene reconstructs correctly with no leftover battle-only state', () => {
    const actions: Action[] = [
      { type: 'startBattle', allies: [{ id: 'pc', hp: 20, maxHp: 20 }], enemies: [{ id: 'slime', hp: 12, maxHp: 12 }] },
      { type: 'stop' },

      { type: 'battleAction', actor: 'pc', target: 'slime', kind: 'attack', damage: 7, text: 'Hit!' },
      { type: 'stop' },

      { type: 'battleAction', actor: 'pc', target: 'slime', kind: 'wrong-action', damage: -5, text: 'Oops, healed!' },
      { type: 'stop' },

      { type: 'endBattle', outcome: 'victory' },
      { type: 'stop' },

      { type: 'enterScene', scene: 'test-town', at: 'plaza' },
      { type: 'stop' },
    ]
    const checkpoints = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoints).toHaveLength(5)

    const [started, hit, healed, ended, returned] = checkpoints
    expect(started.sceneId).toBe(BATTLE_SCENE_ID)
    expect(started.battle).toEqual({
      allies: [{ id: 'pc', hp: 20, maxHp: 20, tag: 'in' }],
      enemies: [{ id: 'slime', hp: 12, maxHp: 12 }],
    })

    expect(hit.battle?.enemies[0]).toEqual({ id: 'slime', hp: 5, maxHp: 12 })
    expect(healed.battle?.enemies[0]).toEqual({ id: 'slime', hp: 10, maxHp: 12 })

    expect(ended.battle).toBeNull()
    expect(ended.sceneId).toBe(BATTLE_SCENE_ID)

    expect(returned.sceneId).toBe('test-town')
    expect(returned.battle).toBeNull()

    // Same set of entities and positions as a same-town enterScene reached outside
    // of battle — no leftover 'slime' or other battle-only state. `pc`'s facing
    // differs (enterScene always carries forward whatever facing it had before,
    // here 'left' from the battle slot — a pre-existing enterScene behavior this
    // change doesn't touch), so compare positions/keys rather than exact facing.
    const baseline = runPrecompute(
      [
        { type: 'enterScene', scene: 'test-town', at: 'plaza' },
        { type: 'stop' },
      ],
      MAPS,
      TOWN.sceneId,
    )
    expect(Object.keys(returned.entities).sort()).toEqual(Object.keys(baseline[0].entities).sort())
    expect(returned.entities.pc).toMatchObject({ x: baseline[0].entities.pc.x, y: baseline[0].entities.pc.y })
    expect(returned.battle).toEqual(baseline[0].battle)
  })
})

const PARTY_SEQUENCE_ACTIONS: Action[] = [
  { type: 'partyJoin', entity: 'familiar', at: 'plaza' },
  { type: 'stop' },

  {
    type: 'startBattle',
    allies: [
      { id: 'pc', hp: 20, maxHp: 20 },
      { id: 'familiar', hp: 14, maxHp: 14 },
    ],
    enemies: [{ id: 'slime', hp: 12, maxHp: 12 }],
  },
  { type: 'stop' },

  { type: 'tagCombatant', entity: 'familiar', action: 'out' },
  { type: 'stop' },

  { type: 'battleAction', actor: 'pc', target: 'slime', kind: 'attack', damage: 7, text: 'Hit!' },
  { type: 'stop' },

  { type: 'endBattle', outcome: 'victory' },
  { type: 'stop' },
]

describe('full party sequence precompute', () => {
  it('partyJoin -> startBattle (two allies) -> tagCombatant -> battleAction -> endBattle asserts allies/entities shape at every checkpoint', () => {
    const checkpoints = runPrecompute(PARTY_SEQUENCE_ACTIONS, MAPS, TOWN.sceneId)
    expect(checkpoints).toHaveLength(5)

    const [joined, started, tagged, hit, ended] = checkpoints
    expect(joined.entities.familiar).toMatchObject({ x: 4, y: 0 })
    expect(joined.battle).toBeNull()

    expect(started.sceneId).toBe(BATTLE_SCENE_ID)
    expect(started.battle).toEqual({
      allies: [
        { id: 'pc', hp: 20, maxHp: 20, tag: 'in' },
        { id: 'familiar', hp: 14, maxHp: 14, tag: 'in' },
      ],
      enemies: [{ id: 'slime', hp: 12, maxHp: 12 }],
    })

    expect(tagged.battle?.allies).toEqual([
      { id: 'pc', hp: 20, maxHp: 20, tag: 'in' },
      { id: 'familiar', hp: 14, maxHp: 14, tag: 'out' },
    ])

    expect(hit.battle?.enemies[0]).toEqual({ id: 'slime', hp: 5, maxHp: 12 })
    expect(hit.battle?.allies).toEqual([
      { id: 'pc', hp: 20, maxHp: 20, tag: 'in' },
      { id: 'familiar', hp: 14, maxHp: 14, tag: 'out' },
    ])

    expect(ended.battle).toBeNull()
  })
})

describe('meters resting-state transitions', () => {
  it('setMeter fully replaces a meter\'s descriptor and value', () => {
    const actions: Action[] = [
      { type: 'setMeter', meterId: 'gold', label: 'Gold', style: 'counter', value: 5 },
      { type: 'stop' },
      { type: 'setMeter', meterId: 'gold', label: 'Gold Coins', style: 'bar', value: 2, max: 10, anchorEntity: 'pc' },
      { type: 'stop' },
    ]
    const [first, second] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(first.meters.gold).toEqual({ label: 'Gold', style: 'counter', value: 5 })
    expect(second.meters.gold).toEqual({ label: 'Gold Coins', style: 'bar', value: 2, max: 10, anchorEntity: 'pc' })
  })

  it('addMeter mutates only value, unclamped for style: counter', () => {
    const actions: Action[] = [
      { type: 'setMeter', meterId: 'gold', label: 'Gold', style: 'counter', value: 10 },
      { type: 'addMeter', meterId: 'gold', delta: 5 },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.meters.gold).toEqual({ label: 'Gold', style: 'counter', value: 15 })
  })

  it('addMeter clamps to [0, max] for style: bar', () => {
    const actions: Action[] = [
      { type: 'setMeter', meterId: 'capacity', label: 'Capacity', style: 'bar', value: 8, max: 10 },
      { type: 'addMeter', meterId: 'capacity', delta: 5 },
      { type: 'stop' },
      { type: 'addMeter', meterId: 'capacity', delta: -999 },
      { type: 'stop' },
    ]
    const [upperClamped, lowerClamped] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(upperClamped.meters.capacity.value).toBe(10)
    expect(lowerClamped.meters.capacity.value).toBe(0)
  })

  it('addMeter against an undefined meterId is a no-op', () => {
    const actions: Action[] = [
      { type: 'addMeter', meterId: 'gold', delta: 5 },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.meters).toEqual({})
  })
})

describe('lightRadius resting-state transitions', () => {
  it('is null before any setLightRadius', () => {
    const actions: Action[] = [{ type: 'stop' }]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.lightRadius).toBeNull()
  })

  it('setLightRadius sets the final value instantly regardless of overSeconds', () => {
    const actions: Action[] = [
      { type: 'setLightRadius', anchorEntity: 'pc', radius: 3, overSeconds: 2 },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.lightRadius).toEqual({ anchorEntity: 'pc', radius: 3 })
  })

  it('radius: 0 is representable (full extinguish)', () => {
    const actions: Action[] = [
      { type: 'setLightRadius', anchorEntity: 'pc', radius: 3 },
      { type: 'setLightRadius', anchorEntity: 'pc', radius: 0 },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.lightRadius).toEqual({ anchorEntity: 'pc', radius: 0 })
  })
})

describe('meters and lightRadius headless precompute', () => {
  it('a script running setMeter -> addMeter (gold) and setLightRadius (grow -> shrink -> 0) records the expected shape at every stop', () => {
    const actions: Action[] = [
      { type: 'enterScene', scene: 'test-cave', at: 'torch' },
      { type: 'setMeter', meterId: 'gold', label: 'Gold', style: 'counter', value: 0 },
      { type: 'stop' },

      { type: 'addMeter', meterId: 'gold', delta: 10 },
      { type: 'setLightRadius', anchorEntity: 'pc', radius: 1 },
      { type: 'stop' },

      { type: 'setLightRadius', anchorEntity: 'pc', radius: 3, overSeconds: 2 },
      { type: 'stop' },

      { type: 'addMeter', meterId: 'gold', delta: 5 },
      { type: 'setLightRadius', anchorEntity: 'pc', radius: 0, overSeconds: 1 },
      { type: 'stop' },
    ]
    const [entered, grownToOne, grownToThree, extinguished] = runPrecompute(actions, MAPS, TOWN.sceneId)

    expect(entered.meters.gold).toEqual({ label: 'Gold', style: 'counter', value: 0 })
    expect(entered.lightRadius).toBeNull()

    expect(grownToOne.meters.gold.value).toBe(10)
    expect(grownToOne.lightRadius).toEqual({ anchorEntity: 'pc', radius: 1 })

    expect(grownToThree.lightRadius).toEqual({ anchorEntity: 'pc', radius: 3 })

    expect(extinguished.meters.gold.value).toBe(15)
    expect(extinguished.lightRadius).toEqual({ anchorEntity: 'pc', radius: 0 })
  })
})

describe('meta-shell resting-state transitions', () => {
  it('showAchievement sets achievement to { text }', () => {
    const actions: Action[] = [
      { type: 'showAchievement', text: 'Thou Hast Done A Thing' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.achievement).toEqual({ text: 'Thou Hast Done A Thing' })
  })

  it('hideAchievement unconditionally clears achievement to null, even when already null', () => {
    const actions: Action[] = [{ type: 'hideAchievement' }, { type: 'stop' }]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.achievement).toBeNull()
  })

  it('showAchievement -> hideAchievement round-trips to null', () => {
    const actions: Action[] = [
      { type: 'showAchievement', text: 'Thou Hast Done A Thing' },
      { type: 'stop' },
      { type: 'hideAchievement' },
      { type: 'stop' },
    ]
    const [shown, hidden] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(shown.achievement).toEqual({ text: 'Thou Hast Done A Thing' })
    expect(hidden.achievement).toBeNull()
  })

  it('showSaveFile sets overlay to a distinct save-file kind', () => {
    const actions: Action[] = [
      { type: 'showSaveFile', summary: 'Completed run summary' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.overlay).toEqual({ kind: 'save-file', text: 'Completed run summary' })
  })

  it('hideOverlay clears the save-file overlay', () => {
    const actions: Action[] = [
      { type: 'showSaveFile', summary: 'Completed run summary' },
      { type: 'stop' },
      { type: 'hideOverlay' },
      { type: 'stop' },
    ]
    const [shown, hidden] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(shown.overlay).toEqual({ kind: 'save-file', text: 'Completed run summary' })
    expect(hidden.overlay).toBeNull()
  })

  it('achievement is independent of an active dialogue and overlay', () => {
    const actions: Action[] = [
      { type: 'startDialogue', speaker: 'guide' },
      { type: 'say', text: 'hi' },
      { type: 'showOverlay', kind: 'headline', text: 'STAGE 1' },
      { type: 'showAchievement', text: 'Thou Hast Done A Thing' },
      { type: 'stop' },
    ]
    const [checkpoint] = runPrecompute(actions, MAPS, TOWN.sceneId)
    expect(checkpoint.achievement).toEqual({ text: 'Thou Hast Done A Thing' })
    expect(checkpoint.ui).toEqual({ kind: 'dialogue', speaker: 'guide', text: 'hi', variant: 'say' })
    expect(checkpoint.overlay).toEqual({ kind: 'headline', text: 'STAGE 1' })
  })
})

describe('meta-shell headless precompute', () => {
  it('a script running title screen -> save-file -> achievement-while-dialogue records the expected shape at every stop', () => {
    const actions: Action[] = [
      { type: 'showOverlay', kind: 'title', text: 'DRAGON WARRIOR' },
      { type: 'showMenu', menuKind: 'command', options: ['Start Game'] },
      { type: 'selectMenuOption', index: 0 },
      { type: 'hideMenu' },
      { type: 'stop' },

      { type: 'showSaveFile', summary: 'Completed run summary' },
      { type: 'stop' },

      { type: 'hideOverlay' },
      { type: 'stop' },

      { type: 'startDialogue', speaker: 'guide' },
      { type: 'say', text: 'hi' },
      { type: 'showAchievement', text: 'Thou Hast Done A Thing' },
      { type: 'stop' },

      { type: 'hideAchievement' },
      { type: 'stop' },
    ]
    const [titled, savedFile, cleared, achieved, dismissed] = runPrecompute(actions, MAPS, TOWN.sceneId)

    expect(titled.overlay).toEqual({ kind: 'title', text: 'DRAGON WARRIOR' })
    expect(titled.ui).toEqual({ kind: 'none' })

    expect(savedFile.overlay).toEqual({ kind: 'save-file', text: 'Completed run summary' })

    expect(cleared.overlay).toBeNull()

    expect(achieved.achievement).toEqual({ text: 'Thou Hast Done A Thing' })
    expect(achieved.ui).toEqual({ kind: 'dialogue', speaker: 'guide', text: 'hi', variant: 'say' })
    expect(achieved.overlay).toBeNull()

    expect(dismissed.achievement).toBeNull()
    expect(dismissed.ui).toEqual({ kind: 'dialogue', speaker: 'guide', text: 'hi', variant: 'say' })
  })
})
