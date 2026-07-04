export type Direction = 'up' | 'down' | 'left' | 'right'

export interface RelativeStep {
  direction: Direction
  steps: number
}

export interface WalkAction {
  type: 'walk'
  entity: string
  path: RelativeStep[]
}

export interface PauseAction {
  type: 'pause'
  seconds: number
}

export interface StopAction {
  type: 'stop'
}

export interface StartDialogueAction {
  type: 'startDialogue'
}

export interface SayAction {
  type: 'say'
  text: string
}

export interface EndDialogueAction {
  type: 'endDialogue'
}

export type Action =
  | WalkAction
  | PauseAction
  | StopAction
  | StartDialogueAction
  | SayAction
  | EndDialogueAction

export interface EntityDef {
  id: string
  x: number
  y: number
}

export interface GameMap {
  sceneId: string
  entities: EntityDef[]
}

export const MAP: GameMap = {
  sceneId: 'placeholder-map',
  entities: [
    { id: 'pc', x: 2, y: 2 },
    { id: 'guide', x: 6, y: 5 },
  ],
}

/**
 * Phase 1 proving script: exercises walk/pause/stop/startDialogue/say/endDialogue
 * against the placeholder map, with three `stop` checkpoints.
 */
export const SCRIPT: Action[] = [
  { type: 'walk', entity: 'pc', path: [{ direction: 'right', steps: 3 }] },
  { type: 'pause', seconds: 1 },
  { type: 'stop' },

  { type: 'walk', entity: 'pc', path: [{ direction: 'down', steps: 2 }, { direction: 'right', steps: 2 }] },
  { type: 'startDialogue' },
  { type: 'say', text: 'Hello, traveler.' },
  { type: 'say', text: 'Welcome to the placeholder map.' },
  { type: 'endDialogue' },
  { type: 'stop' },

  { type: 'walk', entity: 'guide', path: [{ direction: 'left', steps: 2 }] },
  { type: 'pause', seconds: 0.5 },
  { type: 'walk', entity: 'pc', path: [{ direction: 'up', steps: 1 }] },
  { type: 'stop' },
]
