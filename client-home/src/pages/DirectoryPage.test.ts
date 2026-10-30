import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const auth = vi.hoisted(() => ({ userId: 1 as number | null }))

// The directory only needs the signed-in user id from the auth context.
vi.mock('@repo/auth', () => ({
  useAuth: () => ({ userId: auth.userId }),
}))

// Keep the production URLs: no dev-port rewriting in the test.
vi.mock('@repo/config', () => ({
  getAppUrl: (_slug: string, prodUrl: string) => prodUrl,
}))

import DirectoryPage from './DirectoryPage'

function render(userId: number | null): string {
  auth.userId = userId
  return renderToStaticMarkup(createElement(DirectoryPage))
}

// Card names are the bold <div> text; each card's href is its prod URL.
function cardNames(html: string): string[] {
  return [...html.matchAll(/<div class="font-semibold[^"]*">([^<]+)<\/div>/g)].map(m => m[1])
}

describe('DirectoryPage', () => {
  beforeEach(() => {
    auth.userId = 1
  })

  it('shows the Admin and Proto cards to user 1', () => {
    const names = cardNames(render(1))
    expect(names).toContain('Admin')
    expect(names).toContain('Proto')
  })

  it('hides the Admin and Proto cards from other users', () => {
    const names = cardNames(render(2))
    expect(names).not.toContain('Admin')
    expect(names).not.toContain('Proto')
    expect(names).toContain('Time')
    expect(names).toContain('Play')
  })

  it('hides the admin-only cards when signed out', () => {
    const names = cardNames(render(null))
    expect(names).not.toContain('Admin')
    expect(names).not.toContain('Proto')
  })

  it('lists every other app once, in order, for user 1', () => {
    expect(cardNames(render(1))).toEqual([
      'Time',
      'Watch',
      'Trips',
      'Play',
      'Games',
      'Me',
      'Talks',
      'Food',
      'Admin',
      'Proto',
    ])
  })

  it('renders Food as a coming-soon card, not a link', () => {
    const html = render(1)
    expect(html).toContain('Coming soon')
    expect(html).not.toContain('href="https://food.branam.us"')
    expect(html).toContain('href="https://play.branam.us"')
    expect(html).toContain('href="https://admin.branam.us"')
  })
})
