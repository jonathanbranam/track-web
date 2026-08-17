import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { initialState } from '../npc'
import { resolvePcAction } from '../pc'
import type { GameState, Unit } from '../types'

const feature = await loadFeature(new URL('./melee.feature', import.meta.url).pathname)

describeFeature(feature, ({ Scenario }) => {
  Scenario('A melee PC attacks an adjacent NPC', ({ Given, And, When, Then }) => {
    let state: GameState
    let npc: Unit

    Given('a melee PC at column 5, row 5', () => {
      state = { ...initialState(), units: [{ id: 'pc-0', kind: 'pc', col: 5, row: 5, unitType: 'melee', hp: 3 }] }
    })

    And('an NPC with 3 hp at column 6, row 5', () => {
      npc = { id: 'npc-0', kind: 'npc', col: 6, row: 5, unitType: 'short-range', hp: 3 }
      state = { ...state, units: [...state.units, npc] }
    })

    When('the PC attacks to the right', () => {
      state = resolvePcAction(state, { kind: 'attack', unitId: 'pc-0', col: 6, row: 5, attackDir: 'right' })
    })

    Then("the NPC's hp should be 1", () => {
      const updated = state.units.find((u) => u.id === 'npc-0')
      expect(updated?.hp).toBe(1)
    })
  })
})
