import { Given, When, Then } from 'quickpickle'
import type { QuickPickleWorldInterface } from 'quickpickle'
import { expect } from 'vitest'
import {
  initialState,
  resolvePcAction,
  validMoveDests,
  setPlanAttack,
  attackSquares,
  commitAction,
  remainingMove,
  hasAttacked,
} from '@repo/dungeon-engine'
import type { GameState, PcType, Direction, Unit } from '@repo/dungeon-engine'

// Shared, reusable Given/When/Then step library for dungeon-tactics-solo PC
// scenarios, matched by Cucumber Expression (quickpickle/@cucumber/*) across
// every `.feature` file — one step definition here can back any number of
// scenarios/units, instead of a step-definition file per `.feature` file.
//
// Steps build `GameState` inputs by hand (starting from `initialState()`,
// overriding `units`) and assert outcomes by calling `pc.ts`/`npc.ts`
// directly against that in-memory state — never `defStore.ts`/
// `contentStore.ts`, which perform network I/O and would make these tests
// non-deterministic.

const DIR_OFFSETS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

function getState(world: QuickPickleWorldInterface): GameState {
  if (!world.data.state) world.data.state = { ...initialState(), units: [] }
  return world.data.state as GameState
}

function setState(world: QuickPickleWorldInterface, state: GameState) {
  world.data.state = state
}

function addUnit(world: QuickPickleWorldInterface, unit: Unit) {
  const state = getState(world)
  setState(world, { ...state, units: [...state.units, unit] })
}

// ─── Given ──────────────────────────────────────────────────────────────────

Given('a {word} PC at column {int}, row {int}', (world: QuickPickleWorldInterface, unitType: string, col: number, row: number) => {
  world.data.pcId = 'pc-0'
  addUnit(world, { id: 'pc-0', kind: 'pc', col, row, unitType: unitType as PcType, hp: 3 })
})

Given('an NPC with {int} hp at column {int}, row {int}', (world: QuickPickleWorldInterface, hp: number, col: number, row: number) => {
  const npcCount = getState(world).units.filter((u) => u.kind === 'npc').length
  addUnit(world, { id: `npc-${npcCount}`, kind: 'npc', col, row, unitType: 'short-range', hp })
})

Given('a structure at column {int}, row {int}', (world: QuickPickleWorldInterface, col: number, row: number) => {
  const state = getState(world)
  const cells = state.cells.map((r, ri) =>
    ri !== row ? r : r.map((c, ci) => (ci !== col ? c : { ...c, hasStructure: true })),
  )
  setState(world, { ...state, cells })
})

// ─── When ───────────────────────────────────────────────────────────────────

When('the player queries valid move destinations for the PC', (world: QuickPickleWorldInterface) => {
  world.data.dests = validMoveDests(getState(world), world.data.pcId as string)
})

When('the player selects the attack direction {word} for the PC', (world: QuickPickleWorldInterface, dir: string) => {
  setState(world, setPlanAttack(getState(world), world.data.pcId as string, dir as Direction))
})

When('the PC attacks to the {word}', (world: QuickPickleWorldInterface, dir: string) => {
  const state = getState(world)
  const pc = state.units.find((u) => u.id === world.data.pcId)!
  const [dc, dr] = DIR_OFFSETS[dir as Direction]
  setState(
    world,
    resolvePcAction(state, {
      kind: 'attack',
      unitId: pc.id,
      col: pc.col + dc,
      row: pc.row + dr,
      attackDir: dir as Direction,
    }),
  )
})

// Moving and then attacking is two committed actions, and going through the
// action surface is what makes the movement charge real. The bundled action this
// replaces passed an empty path, so the PC arrived having spent nothing — the
// scenario passed while describing a game that does not exist.
When(
  'the PC moves to column {int}, row {int}',
  (world: QuickPickleWorldInterface, toCol: number, toRow: number) => {
    const result = commitAction(getState(world), world.data.pcId as string, 'move', { col: toCol, row: toRow })
    expect(result.ok, result.ok ? '' : result.reason).toBe(true)
    if (result.ok) setState(world, result.state)
  },
)

// The bug the action surface exists to make unrepresentable: the client used to
// derive an attack direction from axis alignment alone, so aiming at a distant
// tile in line with the unit resolved an adjacent attack instead of cancelling.
When(
  'the PC tries to attack column {int}, row {int}',
  (world: QuickPickleWorldInterface, col: number, row: number) => {
    const result = commitAction(getState(world), world.data.pcId as string, 'attack', { col, row })
    world.data.rejected = !result.ok
    if (result.ok) setState(world, result.state)
  },
)

When(
  'the PC attacks column {int}, row {int}',
  (world: QuickPickleWorldInterface, col: number, row: number) => {
    const result = commitAction(getState(world), world.data.pcId as string, 'attack', { col, row })
    expect(result.ok, result.ok ? '' : result.reason).toBe(true)
    if (result.ok) setState(world, result.state)
  },
)

// ─── Then ───────────────────────────────────────────────────────────────────

Then('column {int}, row {int} should be a valid move destination', (world: QuickPickleWorldInterface, col: number, row: number) => {
  expect(world.data.dests).toContainEqual({ col, row })
})

Then('column {int}, row {int} should not be a valid move destination', (world: QuickPickleWorldInterface, col: number, row: number) => {
  expect(world.data.dests).not.toContainEqual({ col, row })
})

Then('the attack target should be exactly column {int}, row {int}', (world: QuickPickleWorldInterface, col: number, row: number) => {
  expect(attackSquares(getState(world), world.data.pcId as string)).toEqual([{ col, row }])
})

Then("the NPC's hp should be {int}", (world: QuickPickleWorldInterface, hp: number) => {
  const npc = getState(world).units.find((u) => u.kind === 'npc')
  expect(npc?.hp).toBe(hp)
})

Then('the PC should be at column {int}, row {int}', (world: QuickPickleWorldInterface, col: number, row: number) => {
  const pc = getState(world).units.find((u) => u.id === world.data.pcId)
  expect(pc).toMatchObject({ col, row })
})

Then('the PC should have {int} movement left', (world: QuickPickleWorldInterface, left: number) => {
  const state = getState(world)
  const pc = state.units.find((u) => u.id === world.data.pcId)!
  expect(remainingMove(state, pc)).toBe(left)
})

Then('the PC should be locked for the turn', (world: QuickPickleWorldInterface) => {
  expect(hasAttacked(getState(world), world.data.pcId as string)).toBe(true)
})

Then('the attack should be refused', (world: QuickPickleWorldInterface) => {
  expect(world.data.rejected).toBe(true)
})

Then('the PC should be able to act again', (world: QuickPickleWorldInterface) => {
  expect(hasAttacked(getState(world), world.data.pcId as string)).toBe(false)
})
