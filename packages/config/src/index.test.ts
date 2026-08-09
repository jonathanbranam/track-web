import { afterEach, describe, expect, it } from 'vitest'
import { getAppUrl } from './index'

function setLocation(hostname: string, protocol = 'http:') {
  ;(globalThis as unknown as { window: unknown }).window = { location: { hostname, protocol } }
}

describe('getAppUrl', () => {
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window
    import.meta.env.DEV = true
  })

  it('swaps to the dev port on localhost', () => {
    setLocation('localhost')
    expect(getAppUrl('time', 'https://time.branam.us')).toBe('http://localhost:6010')
  })

  it('swaps to the dev port on a LAN IP', () => {
    setLocation('10.0.0.113')
    expect(getAppUrl('watch', 'https://watch.branam.us')).toBe('http://10.0.0.113:6015')
  })

  it('swaps the hostname prefix for a matching duckdns hostname, keeping the port implicit', () => {
    setLocation('home-branam-us.duckdns.org')
    expect(getAppUrl('games', 'https://games.branam.us')).toBe('http://games-branam-us.duckdns.org')
  })

  it('returns the production URL unchanged when not running under the Vite dev server', () => {
    setLocation('localhost')
    import.meta.env.DEV = false
    expect(getAppUrl('time', 'https://time.branam.us')).toBe('https://time.branam.us')
  })

  it('falls back to the production URL when the app has no dev port entry', () => {
    setLocation('localhost')
    expect(getAppUrl('food', 'https://food.branam.us')).toBe('https://food.branam.us')
  })
})
