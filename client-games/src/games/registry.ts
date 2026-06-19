import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export type GameCategory = 'single-player' | 'multiplayer'

export interface GameEntry {
  slug: string
  name: string
  description: string
  category: GameCategory
  /**
   * Lazily-loaded React component that mounts the game. Using `lazy` here keeps
   * heavy game engines (e.g. Phaser) out of the catalog/shell bundle until a
   * specific game route is opened.
   */
  mount: LazyExoticComponent<ComponentType>
}

export const games: GameEntry[] = [
  {
    slug: 'ball-merge',
    name: 'Ball Merge',
    description: 'Drop balls and merge matching sizes — but don’t let them overflow the bin.',
    category: 'single-player',
    mount: lazy(() => import('./ball-merge/BallMergeGame')),
  },
]

export function getGame(slug: string): GameEntry | undefined {
  return games.find((g) => g.slug === slug)
}
