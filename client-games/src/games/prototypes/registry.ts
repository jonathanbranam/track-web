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
    slug: 'ball-merge-physics',
    name: 'Ball Merge Physics',
    description: 'Physics sandbox: drop sports balls into any container shape and tune gravity, bounce, friction, and air drag live.',
    mount: lazy(() => import('./ball-merge-physics/BallMergePhysicsGame')),
  },
]

export function getPrototype(slug: string): PrototypeEntry | undefined {
  return prototypes.find((p) => p.slug === slug)
}
