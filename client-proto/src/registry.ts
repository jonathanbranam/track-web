import type { FC } from 'react'
import ExamplePrototype from './prototypes/example'
import MyRatingsPrototype from './prototypes/my-ratings'
import AddSearchA from './prototypes/add-search-a'
import AddSearchD from './prototypes/add-search-d'
import AddSearchE from './prototypes/add-search-e'
import AddSearchF from './prototypes/add-search-f'
import MultiEventsDropdown from './prototypes/multi-events-a'
import MultiEventsButtons from './prototypes/multi-events-b'
import MultiEventsChooser from './prototypes/multi-events-c'
import MultiEventsToggles from './prototypes/multi-events-d'
import MultiEventsCombined from './prototypes/multi-events-e'

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
  { name: 'multi-events-a', label: 'Multi-Events A: Dropdown Selector', Component: MultiEventsDropdown },
  { name: 'multi-events-b', label: 'Multi-Events B: Per-Item Buttons',  Component: MultiEventsButtons  },
  { name: 'multi-events-c', label: 'Multi-Events C: Tap-to-Expand',     Component: MultiEventsChooser  },
  { name: 'multi-events-d', label: 'Multi-Events D: Membership Toggles', Component: MultiEventsToggles },
  { name: 'multi-events-e', label: 'Multi-Events E: Focus + Toggles',    Component: MultiEventsCombined },
  { name: 'my-ratings', label: 'My Ratings Redesign', Component: MyRatingsPrototype },
  { name: 'example', label: 'Example', Component: ExamplePrototype },
]

export default registry
