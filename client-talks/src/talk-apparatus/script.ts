import { BeatAction } from './actions'
import { coldOpen } from './scenes/coldOpen'
import { stage1VibeCoding } from './scenes/stage1VibeCoding'
import { stage2SpecDriven } from './scenes/stage2SpecDriven'
import { stage3Harness } from './scenes/stage3Harness'
import { close } from './scenes/close'

/** The full "AI Eng Dynamic" beat script: cold open → Stage 1 → Stage 2 → Stage 3 → close. */
export const AI_ENG_DYNAMIC_SCRIPT: BeatAction[] = [
  ...coldOpen,
  ...stage1VibeCoding,
  ...stage2SpecDriven,
  ...stage3Harness,
  ...close,
]
