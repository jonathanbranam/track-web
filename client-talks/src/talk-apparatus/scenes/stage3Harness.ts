import { BeatAction } from '../actions'

/**
 * Scene 3 — Harness: three persistent station lights (Define/Review/Improve),
 * a documented pattern written to the skills shelf, the feedback arrow
 * loading it into the next context's foundation, a review gate that stays
 * lit through automated updates, and a steady-state close.
 */
export const stage3Harness: BeatAction[] = [
  { type: 'clearWindow' },
  { type: 'setGauge', percent: 10 },
  { type: 'setCounter', value: 500, speed: 'slow' },
  { type: 'moveGaze', target: 'code' },
  { type: 'flipStatus', key: 'codePaneDimmed', value: false },
  { type: 'stop' },

  { type: 'flipStatus', key: 'stationDefine', value: true },
  { type: 'stop' },

  { type: 'flipStatus', key: 'stationReview', value: true },
  { type: 'stop' },

  { type: 'flipStatus', key: 'stationImprove', value: true },
  { type: 'stop' },

  {
    type: 'flush',
    shelf: 'skills',
    consolidated: { id: 'skill-1', label: 'skill: validate inputs early' },
    clearWindow: false,
  },
  { type: 'moveGaze', target: 'skills' },
  { type: 'stop' },

  { type: 'flipStatus', key: 'feedbackArrow', value: true },
  { type: 'pinFoundation', id: 'skill-foundation-1', label: 'skill: validate inputs early', color: 'green' },
  { type: 'stop' },

  { type: 'flipStatus', key: 'reviewGate', value: true },
  { type: 'stop' },

  { type: 'flipStatus', key: 'testsPassing', value: true },
  { type: 'stop' },

  { type: 'setGauge', percent: 15 },
  { type: 'setCounter', value: 800, speed: 'slow' },
  { type: 'flipStatus', key: 'workingFeatures', value: 12 },
  { type: 'flipStatus', key: 'bug', value: true },
  { type: 'stop' },
]
