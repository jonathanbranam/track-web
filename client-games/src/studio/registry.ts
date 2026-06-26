// Registry of games that offer a studio (content-authoring tools). Drives the
// generic `/studio` hub so additional games can join additively without touching
// the page JSX. Kept data-only (no JSX) so it is trivially unit-testable.

export interface StudioGame {
  slug: string
  name: string
  // Route to that game's studio hub.
  hubPath: string
}

export const STUDIO_GAMES: StudioGame[] = [
  { slug: 'dungeon-tactics', name: 'Dungeon Tactics', hubPath: '/studio/dungeon-tactics' },
]
