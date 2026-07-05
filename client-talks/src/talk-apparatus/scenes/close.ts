import { BeatAction } from '../actions'

/** Scene 4 — Close: the divergence chart returns with a trajectory line, a typing→judgment bar swap, then a final hold. */
export const close: BeatAction[] = [
  { type: 'sceneSwap', stageKind: 'close' },
  { type: 'flipStatus', key: 'chartTrajectory', value: true },
  { type: 'stop' },

  { type: 'flipStatus', key: 'barTyping', value: 85 },
  { type: 'flipStatus', key: 'barJudgment', value: 15 },
  { type: 'flipStatus', key: 'barDesign', value: 15 },
  { type: 'flipStatus', key: 'barReview', value: 15 },
  { type: 'stop' },

  { type: 'flipStatus', key: 'barTyping', value: 20 },
  { type: 'flipStatus', key: 'barJudgment', value: 80 },
  { type: 'flipStatus', key: 'barDesign', value: 75 },
  { type: 'flipStatus', key: 'barReview', value: 85 },
  { type: 'stop' },

  {
    type: 'flipStatus',
    key: 'closeHold',
    value: "The work didn't get smaller. It moved — from typing to judgment.",
  },
  { type: 'stop' },
]
