import type { FC } from 'react'
import ExamplePrototype from './prototypes/example'
import MyRatingsPrototype from './prototypes/my-ratings'

export interface PrototypeEntry {
  name: string
  label: string
  Component: FC
}

const registry: PrototypeEntry[] = [
  // Add prototypes here. To archive one: remove its entry and delete src/prototypes/<name>/.
  { name: 'my-ratings', label: 'My Ratings Redesign', Component: MyRatingsPrototype },
  { name: 'example', label: 'Example', Component: ExamplePrototype },
]

export default registry
