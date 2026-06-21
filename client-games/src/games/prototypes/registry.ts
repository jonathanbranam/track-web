import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export interface PrototypeEntry {
  slug: string
  name: string
  description: string
  mount: LazyExoticComponent<ComponentType>
}

export const prototypes: PrototypeEntry[] = [
  {
    slug: 'tilt-tester',
    name: 'Tilt Tester',
    description: 'Tests device motion permission flow and HUD overlay patterns.',
    mount: lazy(() => import('./TiltTester')),
  },
  {
    slug: 'grid-rendering',
    name: 'Grid Rendering',
    description: 'Minimal 2D turn-based tactical scene: grid, units, move/attack planning, and animated playback.',
    mount: lazy(() => import('./grid-rendering/GridRenderingGame')),
  },
]

export function getPrototype(slug: string): PrototypeEntry | undefined {
  return prototypes.find((p) => p.slug === slug)
}
