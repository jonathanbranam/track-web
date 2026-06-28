import { describe, it, expect } from 'vitest'
import { buildToc } from './toc'

describe('buildToc', () => {
  it('extracts H2 and H3 headings in document order', () => {
    const md = [
      '## Airports',
      'some text',
      '### Terminal 1',
      '### Terminal 2',
      '## Transit',
      '### Trains',
    ].join('\n')

    expect(buildToc(md)).toEqual([
      { level: 2, text: 'Airports', id: 'airports' },
      { level: 3, text: 'Terminal 1', id: 'terminal-1' },
      { level: 3, text: 'Terminal 2', id: 'terminal-2' },
      { level: 2, text: 'Transit', id: 'transit' },
      { level: 3, text: 'Trains', id: 'trains' },
    ])
  })

  it('ignores H1 and H4+ headings', () => {
    const md = [
      '# Title',
      '## Section',
      '#### Too Deep',
      '##### Deeper Still',
    ].join('\n')

    expect(buildToc(md)).toEqual([
      { level: 2, text: 'Section', id: 'section' },
    ])
  })

  it('gives duplicate heading text distinct ids', () => {
    const md = [
      '## Notes',
      '### Notes',
      '## Notes',
    ].join('\n')

    expect(buildToc(md)).toEqual([
      { level: 2, text: 'Notes', id: 'notes' },
      { level: 3, text: 'Notes', id: 'notes-1' },
      { level: 2, text: 'Notes', id: 'notes-2' },
    ])
  })

  it('ignores headings inside fenced code blocks', () => {
    const md = [
      '## Real Heading',
      '```',
      '## Not A Heading',
      '```',
      '### Another Real',
    ].join('\n')

    expect(buildToc(md)).toEqual([
      { level: 2, text: 'Real Heading', id: 'real-heading' },
      { level: 3, text: 'Another Real', id: 'another-real' },
    ])
  })

  it('returns an empty list for empty or missing content', () => {
    expect(buildToc('')).toEqual([])
    expect(buildToc(null)).toEqual([])
    expect(buildToc(undefined)).toEqual([])
  })
})
