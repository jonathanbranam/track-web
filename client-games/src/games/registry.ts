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
    slug: 'dungeon-tactics',
    name: 'Dungeon Tactics',
    description: 'A turn-based tactical dungeon crawl. Fight through floors, defeat enemies, and outlast your opponents.',
    category: 'multiplayer',
    lobbySlug: 'dungeon-tactics',
    minPlayers: 2,
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
