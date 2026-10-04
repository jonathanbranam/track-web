import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export type GameCategory = 'single-player' | 'multiplayer'

export interface GameEntry {
  slug: string
  name: string
  description: string
  category: GameCategory
  /**
   * Lazily-loaded React component that mounts the game. Undefined for multiplayer
   * games that use the lobby flow instead of a direct game component.
   */
  mount?: LazyExoticComponent<ComponentType>
  /** If set, catalog card navigates to /game/:slug/lobby instead of mounting the game. */
  lobbySlug?: string
  /** Minimum players required to start; displayed in lobby UI. Defaults to 2. */
  minPlayers?: number
}

export const games: GameEntry[] = [
  {
    slug: 'ball-merge',
    name: 'Ball Merge',
    description: "Drop balls and merge matching sizes — but don't let them overflow the bin.",
    category: 'single-player',
    mount: lazy(() => import('./ball-merge/BallMergeGame')),
  },
  {
    slug: 'orbital-dodger',
    name: 'Orbital Dodger',
    description: 'Slingshot between planets on a finite tank of fuel — fly close to score, touch nothing.',
    category: 'single-player',
    mount: lazy(() => import('./orbital-dodger/OrbitalDodgerGame')),
  },
  {
    slug: 'space-golf',
    name: 'Space Golf',
    description: 'Mini golf in space: shoot from orbit to orbit, sweep up the stars, dive into the wormhole.',
    category: 'single-player',
    mount: lazy(() => import('./space-golf/SpaceGolfGame')),
  },
  {
    slug: 'woodoku',
    name: 'Woodoku',
    description: 'Drag wood blocks onto a 9×9 grid — fill rows, columns and boxes to clear them.',
    category: 'single-player',
    mount: lazy(() => import('./woodoku/WoodokuGame')),
  },
  {
    slug: 'hex-block',
    name: 'Hex Block',
    description: 'Drag mixed-colour hex pieces onto a hexagon board — fill a line along any axis to clear it.',
    category: 'single-player',
    mount: lazy(() => import('./hex-block/HexBlockGame')),
  },
  {
    slug: 'favo',
    name: 'Favo',
    description: 'Link red, blue and green hexes into groups of three to clear them. Tap a panel to rotate it; fill a gauge for a merge panel.',
    category: 'single-player',
    mount: lazy(() => import('./favo/FavoGame')),
  },
  {
    slug: 'sinkhole-fair',
    name: 'Sinkhole Fair',
    description: 'Drive a hole around the county fair: swallow what is smaller, grow, and beat the bots in two minutes.',
    category: 'single-player',
    mount: lazy(() => import('./sinkhole-fair/SinkholeGame')),
  },
  {
    slug: 'nato-alphabet',
    name: 'NATO Alphabet',
    description: 'Learn the spoken alphabet: a 4-letter ID flashes, tap the right NATO word for each letter. Seven timed stages.',
    category: 'single-player',
    mount: lazy(() => import('./nato-alphabet/NatoGame')),
  },
  {
    slug: 'dungeon-tactics',
    name: 'Dungeon Tactics',
    description: 'A turn-based tactical dungeon crawl. Fight through floors, defeat enemies, and outlast your opponents.',
    category: 'multiplayer',
    lobbySlug: 'dungeon-tactics',
    minPlayers: 2,
  },
  {
    slug: 'dungeon-tactics-solo',
    name: 'Dungeon Tactics',
    description: 'A turn-based tactical dungeon crawl — plan your moves, then watch them unfold.',
    category: 'single-player',
    mount: lazy(() => import('./dungeon-tactics-solo/DungeonTacticsGame')),
  },
  {
    slug: 'prototypes',
    name: 'Prototypes',
    description: 'prototypes and tests',
    category: 'single-player',
  },
]

export function getGame(slug: string): GameEntry | undefined {
  return games.find((g) => g.slug === slug)
}
