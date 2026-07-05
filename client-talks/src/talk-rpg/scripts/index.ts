import { Action, MAP, OVERWORLD_MAP } from '../script'
import { TEST_SCRIPT } from './test-script'
import helloJson from './hello-json.json'
import sceneA from './scene-a.json'
import sceneB from './scene-b.json'
import sceneC from './scene-c.json'
import sceneD1 from './scene-d1.json'
import sceneD2 from './scene-d2.json'
import sceneE from './scene-e.json'
import sceneF from './scene-f.json'
import sceneG from './scene-g.json'
import sceneH from './scene-h.json'
import sceneI from './scene-i.json'
import sceneJ from './scene-j.json'

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
  { id: 'scene-b', name: 'Scene B — The Save File', actions: sceneB as Action[], initialSceneId: MAP.sceneId },
  { id: 'scene-c', name: 'Scene C — The Thesis, As A Journey', actions: sceneC as Action[], initialSceneId: MAP.sceneId },
  { id: 'scene-d1', name: 'Scene D1 — Stage 1: Vibe Coding (Into the Fight)', actions: sceneD1 as Action[], initialSceneId: OVERWORLD_MAP.sceneId },
  { id: 'scene-d2', name: 'Scene D2 — Stage 1: Vibe Coding (Death)', actions: sceneD2 as Action[], initialSceneId: OVERWORLD_MAP.sceneId },
  { id: 'scene-e', name: 'Scene E — Respawn: The Veteran\'s Advice', actions: sceneE as Action[], initialSceneId: MAP.sceneId },
  { id: 'scene-f', name: 'Scene F — Stage 2: Spec-Driven Development', actions: sceneF as Action[], initialSceneId: MAP.sceneId },
  { id: 'scene-g', name: 'Scene G — Stage 3: The Harness', actions: sceneG as Action[], initialSceneId: MAP.sceneId },
  { id: 'scene-h', name: 'Scene H — Climax: The Dragonlord', actions: sceneH as Action[], initialSceneId: MAP.sceneId },
  { id: 'scene-i', name: 'Scene I — The Turn: Cost Of Change', actions: sceneI as Action[], initialSceneId: MAP.sceneId },
  { id: 'scene-j', name: 'Scene J — Close: Back To The Fear', actions: sceneJ as Action[], initialSceneId: MAP.sceneId },
]
