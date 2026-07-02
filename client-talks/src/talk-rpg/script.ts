export interface Beat {
  id: number
  phaserSegment: string
  caption?: {
    type: 'act-card' | 'encounter' | 'punchline' | 'dialogue'
    text: string
  }
  autoClearMs?: number
}

export const BEATS: Beat[] = [
  { id: 0, phaserSegment: 'title-screen' },
  { id: 1, phaserSegment: 'name-entry-stub' },
]
