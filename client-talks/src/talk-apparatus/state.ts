export type ColorRegister = 'green' | 'anchor' | 'muted'

/**
 * Who authored a chat message. Drives the transcript's two-sided layout —
 * `user` messages align right, `agent` replies align left — the way iMessage
 * or the Claude Code chat reads. Only meaningful for `chatBlocks`; a promoted
 * copy carries the field along but the context window / shelves ignore it.
 * Absent on a block means `user` (the pre-existing default before agent replies
 * were authored), so older blocks and non-chat blocks render unchanged.
 */
export type Speaker = 'user' | 'agent'

export interface Block {
  id: string
  label: string
  color: ColorRegister
  highlighted: boolean
  speaker?: Speaker
}

export type GazeTarget = 'app' | 'spec' | 'code' | 'skills'

export type StageKind = 'coldOpen' | 'apparatus' | 'close'

export interface GaugeState {
  percent: number
  overflowed: boolean
}

export type CounterSpeed = 'fast' | 'slow'

export interface CounterState {
  value: number
  speed: CounterSpeed
}

/**
 * Generic named-value bag: bug ✓/✗, working-features counter, Stage 3 station
 * lights, and the review gate all live here, but so does every other bit of
 * display state that has no dedicated `BeatAction` of its own — the
 * code/diff pane's dimmed/cost-to-change reading, the skills→foundation
 * feedback arrow, and the non-apparatus scenes' ticker/chart/bar content.
 * `flipStatus` is the one generic "set a named display value" beat; the
 * fixed `BeatAction` vocabulary has no separate action for any of these.
 */
export type StatusValue = string | number | boolean

/** A full snapshot of everything on screen at a `stop` checkpoint (or the pre-script initial state). */
export interface ApparatusState {
  stageKind: StageKind
  chatBlocks: Block[]
  foundationBlocks: Block[]
  windowBlocks: Block[]
  planShelf: Block[]
  skillsShelf: Block[]
  gauge: GaugeState
  counter: CounterState
  statuses: Record<string, StatusValue>
  gaze: GazeTarget | null
  sectionIndex: number
}

export function createInitialState(): ApparatusState {
  return {
    stageKind: 'coldOpen',
    chatBlocks: [],
    foundationBlocks: [],
    windowBlocks: [],
    planShelf: [],
    skillsShelf: [],
    gauge: { percent: 0, overflowed: false },
    counter: { value: 0, speed: 'slow' },
    statuses: {},
    gaze: null,
    sectionIndex: -1,
  }
}

function cloneBlocks(blocks: Block[]): Block[] {
  return blocks.map((b) => ({ ...b }))
}

export function cloneState(state: ApparatusState): ApparatusState {
  return {
    stageKind: state.stageKind,
    chatBlocks: cloneBlocks(state.chatBlocks),
    foundationBlocks: cloneBlocks(state.foundationBlocks),
    windowBlocks: cloneBlocks(state.windowBlocks),
    planShelf: cloneBlocks(state.planShelf),
    skillsShelf: cloneBlocks(state.skillsShelf),
    gauge: { ...state.gauge },
    counter: { ...state.counter },
    statuses: { ...state.statuses },
    gaze: state.gaze,
    sectionIndex: state.sectionIndex,
  }
}

export function snapshotState(state: ApparatusState, sectionIndex: number): ApparatusState {
  return { ...cloneState(state), sectionIndex }
}
