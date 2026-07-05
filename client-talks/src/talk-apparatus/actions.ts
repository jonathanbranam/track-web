import { ApparatusState, Block, ColorRegister, GazeTarget, StageKind, StatusValue } from './state'

export interface SpawnBlockAction {
  type: 'spawnBlock'
  id: string
  label: string
  color: ColorRegister
}

/** Copies a chat block into the context window; the original stays in the chat log. */
export interface PromoteBlockAction {
  type: 'promoteBlock'
  id: string
}

export interface EvictBlockAction {
  type: 'evictBlock'
  id: string
}

export interface CompactBlocksAction {
  type: 'compactBlocks'
  ids: string[]
  into: { id: string; label: string; color: ColorRegister }
}

export interface ClearWindowAction {
  type: 'clearWindow'
}

/**
 * Atomic four-sub-step transition: consolidate the window's green material
 * into one block written to a shelf, clear the window's non-pinned blocks,
 * and (optionally) drop a compact reference block back in. `shelf` lets the
 * same action serve Stage 2's plan-shelf flush and Stage 3's skill-shelf
 * write, since the `BeatAction` vocabulary has no separate "write skill" type.
 */
export interface FlushAction {
  type: 'flush'
  shelf: 'plan' | 'skills'
  consolidated: { id: string; label: string }
  reference?: { id: string; label: string }
  clearWindow?: boolean // defaults to true
}

export interface HighlightBlockAction {
  type: 'highlightBlock'
  id: string
  on?: boolean // defaults to true
}

export interface PinFoundationAction {
  type: 'pinFoundation'
  id: string
  label: string
  color?: ColorRegister // defaults to 'anchor'
}

export interface UnpinFoundationAction {
  type: 'unpinFoundation'
  id: string
}

export interface SetGaugeAction {
  type: 'setGauge'
  percent: number
}

export interface SetCounterAction {
  type: 'setCounter'
  value: number
  speed: 'fast' | 'slow'
}

export interface FlipStatusAction {
  type: 'flipStatus'
  key: string
  value: StatusValue
}

export interface MoveGazeAction {
  type: 'moveGaze'
  target: GazeTarget
}

export interface SceneSwapAction {
  type: 'sceneSwap'
  stageKind: StageKind
}

/** A beat-level narrative hold — distinct from the presenter's `pause()`/`resume()` controls. */
export interface PauseAction {
  type: 'pause'
}

export interface StopAction {
  type: 'stop'
}

export type BeatAction =
  | SpawnBlockAction
  | PromoteBlockAction
  | EvictBlockAction
  | CompactBlocksAction
  | ClearWindowAction
  | FlushAction
  | HighlightBlockAction
  | PinFoundationAction
  | UnpinFoundationAction
  | SetGaugeAction
  | SetCounterAction
  | FlipStatusAction
  | MoveGazeAction
  | SceneSwapAction
  | PauseAction
  | StopAction

function withHighlight(block: Block, on: boolean): Block {
  return { ...block, highlighted: on }
}

/**
 * Computes a single `BeatAction`'s effect on the apparatus state. The one
 * source of truth both the headless precompute pass and live playback call
 * into, so forward play and `snapTo` can never diverge.
 */
export function applyBeatAction(state: ApparatusState, action: BeatAction): ApparatusState {
  switch (action.type) {
    case 'spawnBlock':
      return {
        ...state,
        chatBlocks: [...state.chatBlocks, { id: action.id, label: action.label, color: action.color, highlighted: false }],
      }
    case 'promoteBlock': {
      const block = state.chatBlocks.find((b) => b.id === action.id)
      if (!block) return state
      // Copy — not move — into the context window: the chat log is a permanent
      // transcript that never loses a message, mirroring how the real tools
      // behave. A promoted message enters the (invisible) context window while
      // its original stays in the chat pane, so a later `evictBlock` can drop it
      // from context while the audience still sees it sitting in the chat.
      return {
        ...state,
        windowBlocks: [...state.windowBlocks, { ...block }],
      }
    }
    case 'evictBlock':
      return { ...state, windowBlocks: state.windowBlocks.filter((b) => b.id !== action.id) }
    case 'compactBlocks': {
      const idSet = new Set(action.ids)
      const remaining = state.windowBlocks.filter((b) => !idSet.has(b.id))
      const compacted: Block = { id: action.into.id, label: action.into.label, color: action.into.color, highlighted: false }
      return { ...state, windowBlocks: [...remaining, compacted] }
    }
    case 'clearWindow':
      return { ...state, windowBlocks: [] }
    case 'flush': {
      const shelfKey = action.shelf === 'skills' ? 'skillsShelf' : 'planShelf'
      const consolidated: Block = { id: action.consolidated.id, label: action.consolidated.label, color: 'green', highlighted: false }
      const nextShelf = [...state[shelfKey], consolidated]
      const shouldClear = action.clearWindow ?? true
      const clearedWindow = shouldClear ? [] : state.windowBlocks
      const nextWindow = action.reference
        ? [...clearedWindow, { id: action.reference.id, label: action.reference.label, color: 'green' as const, highlighted: false }]
        : clearedWindow
      return { ...state, [shelfKey]: nextShelf, windowBlocks: nextWindow }
    }
    case 'highlightBlock': {
      const on = action.on ?? true
      return {
        ...state,
        chatBlocks: state.chatBlocks.map((b) => (b.id === action.id ? withHighlight(b, on) : b)),
        windowBlocks: state.windowBlocks.map((b) => (b.id === action.id ? withHighlight(b, on) : b)),
      }
    }
    case 'pinFoundation':
      return {
        ...state,
        foundationBlocks: [
          ...state.foundationBlocks,
          { id: action.id, label: action.label, color: action.color ?? 'anchor', highlighted: false },
        ],
      }
    case 'unpinFoundation':
      return { ...state, foundationBlocks: state.foundationBlocks.filter((b) => b.id !== action.id) }
    case 'setGauge':
      return { ...state, gauge: { percent: action.percent, overflowed: action.percent >= 100 } }
    case 'setCounter':
      return { ...state, counter: { value: action.value, speed: action.speed } }
    case 'flipStatus':
      return { ...state, statuses: { ...state.statuses, [action.key]: action.value } }
    case 'moveGaze':
      return { ...state, gaze: action.target }
    case 'sceneSwap':
      return { ...state, stageKind: action.stageKind }
    case 'pause':
    case 'stop':
      return state
  }
}

export function computeStopIndices(actions: BeatAction[]): number[] {
  const indices: number[] = []
  actions.forEach((action, i) => {
    if (action.type === 'stop') indices.push(i)
  })
  return indices
}
