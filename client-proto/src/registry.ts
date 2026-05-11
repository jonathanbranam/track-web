import type { FC } from 'react'
import ExamplePrototype from './prototypes/example'
import AddSearchA from './prototypes/add-search-a'
import AddSearchD from './prototypes/add-search-d'
import AddSearchE from './prototypes/add-search-e'
import AddSearchF from './prototypes/add-search-f'

export interface PrototypeEntry {
  name: string
  label: string
  Component: FC
}

const registry: PrototypeEntry[] = [
  // Add prototypes here. To archive one: remove its entry and delete src/prototypes/<name>/.
  { name: 'add-search-a', label: 'Add Search A: Cascade',       Component: AddSearchA },
  { name: 'add-search-d', label: 'Add Search D: Bottom Sheet',  Component: AddSearchD },
  { name: 'add-search-e', label: 'Add Search E: Inline Panel',  Component: AddSearchE },
  { name: 'add-search-f', label: 'Add Search F: Transparent Import', Component: AddSearchF },
{ name: 'example', label: 'Example', Component: ExamplePrototype },
]

export default registry
