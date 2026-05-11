import type { FC } from 'react'
import ExamplePrototype from './prototypes/example'
import MyRatingsPrototype from './prototypes/my-ratings'
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
  { name: 'multi-events-a', label: 'Multi-Events A: Dropdown Selector', Component: MultiEventsDropdown },
  { name: 'multi-events-b', label: 'Multi-Events B: Per-Item Buttons',  Component: MultiEventsButtons  },
  { name: 'multi-events-c', label: 'Multi-Events C: Tap-to-Expand',     Component: MultiEventsChooser  },
  { name: 'multi-events-d', label: 'Multi-Events D: Membership Toggles', Component: MultiEventsToggles },
  { name: 'multi-events-e', label: 'Multi-Events E: Focus + Toggles',    Component: MultiEventsCombined },
  { name: 'my-ratings', label: 'My Ratings Redesign', Component: MyRatingsPrototype },
  { name: 'example', label: 'Example', Component: ExamplePrototype },
]

export default registry
