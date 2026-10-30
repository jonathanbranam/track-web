import { describe, it, expect, vi } from 'vitest'
import type { PackingItem } from '../types'

// PackingPage pulls in the auth context and the API client; neither is
// exercised by the pure grouping helper under test.
vi.mock('@repo/auth', () => ({ useAuth: () => ({}) }))
vi.mock('../api', () => ({ api: {} }))

const { groupBySection } = await import('./PackingPage')

function item(id: number, section: string): PackingItem {
  return { id, tripId: 1, section, text: `item ${id}`, position: id, userId: null }
}

describe('groupBySection', () => {
  it('groups items by section in first-seen order, keeping item order within a section', () => {
    const items = [
      item(1, 'Clothes'),
      item(2, 'Toiletries'),
      item(3, 'Clothes'),
      item(4, 'Documents'),
      item(5, 'Toiletries'),
    ]

    expect(groupBySection(items)).toEqual([
      { section: 'Clothes', items: [items[0], items[2]] },
      { section: 'Toiletries', items: [items[1], items[4]] },
      { section: 'Documents', items: [items[3]] },
    ])
  })

  it('returns an empty list when there are no items', () => {
    expect(groupBySection([])).toEqual([])
  })
})
