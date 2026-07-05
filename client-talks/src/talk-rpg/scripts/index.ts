import { Action, MAP } from '../script'
import { TEST_SCRIPT } from './test-script'
import helloJson from './hello-json.json'
import sceneA from './scene-a.json'

export interface NamedScript {
  id: string
  name: string
  actions: Action[]
  initialSceneId: string
}

// Inline authoring style: a script's Action[] can be written directly here as
// a const, with no separate file, when it's small enough not to warrant one.
const INLINE_DEMO: Action[] = [
  { type: 'showOverlay', kind: 'headline', text: 'Inline Demo' },
  { type: 'pause', seconds: 1 },
  { type: 'hideOverlay' },
  { type: 'stop' },
]

export const SCRIPTS: NamedScript[] = [
  { id: 'test-script', name: 'Test Script', actions: TEST_SCRIPT, initialSceneId: MAP.sceneId },
  { id: 'inline-demo', name: 'Inline Demo', actions: INLINE_DEMO, initialSceneId: MAP.sceneId },
  { id: 'hello-json', name: 'Hello JSON', actions: helloJson as Action[], initialSceneId: MAP.sceneId },
  { id: 'scene-a', name: 'Scene A — Cold Open', actions: sceneA as Action[], initialSceneId: MAP.sceneId },
]
