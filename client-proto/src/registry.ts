import type { FC } from 'react'
import ExamplePrototype from './prototypes/example'

export interface PrototypeEntry {
  name: string
  label: string
  Component: FC
}

const registry: PrototypeEntry[] = [
  // Add prototypes here. To archive one: remove its entry and delete src/prototypes/<name>/.
  { name: 'example', label: 'Example', Component: ExamplePrototype },
]

export default registry
