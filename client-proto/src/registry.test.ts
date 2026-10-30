import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import registry from './registry'
import PickerScreen from './pages/PickerScreen'

// Smoke coverage only: the registry is plain data and the picker is a list of
// links. Rendered to static markup, so no DOM environment is needed.

describe('prototype registry', () => {
  it('has unique names and non-empty labels', () => {
    const names = registry.map((p) => p.name)
    expect(new Set(names).size).toBe(names.length)
    for (const entry of registry) {
      expect(entry.label.trim()).not.toBe('')
    }
  })

  it('gives every entry a component', () => {
    for (const entry of registry) {
      expect(typeof entry.Component).toBe('function')
    }
  })
})

describe('PickerScreen', () => {
  it('links to every registered prototype', () => {
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(PickerScreen)),
    )
    expect(html).toContain('Prototypes')
    for (const entry of registry) {
      expect(html).toContain(`href="/proto/${entry.name}/"`)
      expect(html).toContain(entry.label)
    }
  })
})
