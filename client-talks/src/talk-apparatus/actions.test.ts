import { describe, expect, it } from 'vitest'
import { applyBeatAction } from './actions'
import { createInitialState } from './state'

describe('spawnBlock / promoteBlock', () => {
  it('promoteBlock moves a block from chat to window', () => {
    let state = createInitialState()
    state = applyBeatAction(state, { type: 'spawnBlock', id: 'a', label: 'hello', color: 'muted' })
    state = applyBeatAction(state, { type: 'promoteBlock', id: 'a' })

    expect(state.chatBlocks).toEqual([])
    expect(state.windowBlocks).toEqual([{ id: 'a', label: 'hello', color: 'muted', highlighted: false }])
  })

  it('promoteBlock is a no-op when the id was never spawned', () => {
    const state = createInitialState()
    const result = applyBeatAction(state, { type: 'promoteBlock', id: 'missing' })
    expect(result).toBe(state)
  })
})

describe('evictBlock', () => {
  it('removes exactly the targeted block, leaving others unchanged', () => {
    let state = createInitialState()
    state = applyBeatAction(state, { type: 'spawnBlock', id: 'a', label: 'keep', color: 'green' })
    state = applyBeatAction(state, { type: 'promoteBlock', id: 'a' })
    state = applyBeatAction(state, { type: 'spawnBlock', id: 'b', label: 'evict-me', color: 'muted' })
    state = applyBeatAction(state, { type: 'promoteBlock', id: 'b' })

    state = applyBeatAction(state, { type: 'evictBlock', id: 'b' })

    expect(state.windowBlocks).toEqual([{ id: 'a', label: 'keep', color: 'green', highlighted: false }])
  })
})

describe('compactBlocks', () => {
  it('replaces the targeted blocks with one compacted block', () => {
    let state = createInitialState()
    for (const id of ['a', 'b', 'c']) {
      state = applyBeatAction(state, { type: 'spawnBlock', id, label: id, color: 'muted' })
      state = applyBeatAction(state, { type: 'promoteBlock', id })
    }

    state = applyBeatAction(state, {
      type: 'compactBlocks',
      ids: ['a', 'b'],
      into: { id: 'ab-summary', label: 'summary', color: 'muted' },
    })

    expect(state.windowBlocks).toEqual([
      { id: 'c', label: 'c', color: 'muted', highlighted: false },
      { id: 'ab-summary', label: 'summary', color: 'muted', highlighted: false },
    ])
  })
})

describe('clearWindow', () => {
  it('removes all window blocks but leaves the pinned foundation untouched', () => {
    let state = createInitialState()
    state = applyBeatAction(state, { type: 'pinFoundation', id: 'sys', label: 'system prompt' })
    state = applyBeatAction(state, { type: 'spawnBlock', id: 'a', label: 'a', color: 'muted' })
    state = applyBeatAction(state, { type: 'promoteBlock', id: 'a' })

    state = applyBeatAction(state, { type: 'clearWindow' })

    expect(state.windowBlocks).toEqual([])
    expect(state.foundationBlocks).toEqual([{ id: 'sys', label: 'system prompt', color: 'anchor', highlighted: false }])
  })
})

describe('flush', () => {
  it('performs consolidate + shelf-write + clear + reference-drop as one atomic transition', () => {
    let state = createInitialState()
    for (const id of ['g1', 'g2']) {
      state = applyBeatAction(state, { type: 'spawnBlock', id, label: id, color: 'green' })
      state = applyBeatAction(state, { type: 'promoteBlock', id })
    }

    state = applyBeatAction(state, {
      type: 'flush',
      shelf: 'plan',
      consolidated: { id: 'plan-1', label: 'consolidated plan' },
      reference: { id: 'plan-ref', label: 'plan ref' },
    })

    expect(state.planShelf).toEqual([{ id: 'plan-1', label: 'consolidated plan', color: 'green', highlighted: false }])
    expect(state.windowBlocks).toEqual([{ id: 'plan-ref', label: 'plan ref', color: 'green', highlighted: false }])
  })

  it('can target the skills shelf without clearing the window when clearWindow: false', () => {
    let state = createInitialState()
    state = applyBeatAction(state, { type: 'spawnBlock', id: 'kept', label: 'kept', color: 'muted' })
    state = applyBeatAction(state, { type: 'promoteBlock', id: 'kept' })

    state = applyBeatAction(state, {
      type: 'flush',
      shelf: 'skills',
      consolidated: { id: 'skill-1', label: 'skill: x' },
      clearWindow: false,
    })

    expect(state.skillsShelf).toEqual([{ id: 'skill-1', label: 'skill: x', color: 'green', highlighted: false }])
    expect(state.windowBlocks).toEqual([{ id: 'kept', label: 'kept', color: 'muted', highlighted: false }])
  })

  it('shelves accumulate across separate flush writes rather than resetting', () => {
    let state = createInitialState()
    state = applyBeatAction(state, { type: 'flush', shelf: 'plan', consolidated: { id: 'plan-1', label: 'first' } })
    state = applyBeatAction(state, { type: 'flush', shelf: 'plan', consolidated: { id: 'plan-2', label: 'second' } })

    expect(state.planShelf.map((b) => b.id)).toEqual(['plan-1', 'plan-2'])
  })
})

describe('pinFoundation / unpinFoundation', () => {
  it('pinned foundation is unaffected by window changes', () => {
    let state = createInitialState()
    state = applyBeatAction(state, { type: 'pinFoundation', id: 'sys', label: 'system prompt' })
    state = applyBeatAction(state, { type: 'spawnBlock', id: 'a', label: 'a', color: 'muted' })
    state = applyBeatAction(state, { type: 'promoteBlock', id: 'a' })

    expect(state.foundationBlocks).toEqual([{ id: 'sys', label: 'system prompt', color: 'anchor', highlighted: false }])
  })

  it('unpinFoundation removes exactly the targeted block', () => {
    let state = createInitialState()
    state = applyBeatAction(state, { type: 'pinFoundation', id: 'sys', label: 'system prompt' })
    state = applyBeatAction(state, { type: 'unpinFoundation', id: 'sys' })

    expect(state.foundationBlocks).toEqual([])
  })
})

describe('setGauge overflow', () => {
  it('marks overflowed when the target is 100% or greater', () => {
    const state = createInitialState()
    expect(applyBeatAction(state, { type: 'setGauge', percent: 99 }).gauge.overflowed).toBe(false)
    expect(applyBeatAction(state, { type: 'setGauge', percent: 100 }).gauge.overflowed).toBe(true)
    expect(applyBeatAction(state, { type: 'setGauge', percent: 130 }).gauge.overflowed).toBe(true)
  })
})

describe('moveGaze', () => {
  it('persists until re-pointed by a later moveGaze', () => {
    let state = createInitialState()
    state = applyBeatAction(state, { type: 'moveGaze', target: 'app' })
    state = applyBeatAction(state, { type: 'setGauge', percent: 10 })
    state = applyBeatAction(state, { type: 'setCounter', value: 5, speed: 'fast' })

    expect(state.gaze).toBe('app')
  })
})
