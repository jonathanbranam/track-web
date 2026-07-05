import { BeatAction } from '../actions'

/**
 * Scene 2 — Spec-driven development: the same apparatus fills with green
 * working material toward the cap, then flushes to the plan shelf before
 * overflow. Momentum climbs steadily while an unwatched code pane quietly
 * accumulates a rising cost-to-change — until the gaze snaps to it, the trap.
 */
export const stage2SpecDriven: BeatAction[] = [
  { type: 'clearWindow' },
  { type: 'setGauge', percent: 0 },
  { type: 'setCounter', value: 0, speed: 'fast' },
  { type: 'moveGaze', target: 'spec' },
  { type: 'flipStatus', key: 'codePaneDimmed', value: true },
  { type: 'flipStatus', key: 'costToChange', value: 0 },
  { type: 'stop' },

  { type: 'spawnBlock', id: 'spec-1', label: 'plan: auth + settings', color: 'green' },
  { type: 'promoteBlock', id: 'spec-1' },
  { type: 'setGauge', percent: 35 },
  { type: 'setCounter', value: 5000, speed: 'fast' },
  { type: 'flipStatus', key: 'costToChange', value: 5 },
  { type: 'stop' },

  { type: 'spawnBlock', id: 'spec-2', label: 'plan: dark mode rollout', color: 'green' },
  { type: 'promoteBlock', id: 'spec-2' },
  { type: 'setGauge', percent: 65 },
  { type: 'setCounter', value: 11000, speed: 'fast' },
  { type: 'flipStatus', key: 'costToChange', value: 12 },
  { type: 'stop' },

  { type: 'spawnBlock', id: 'spec-3', label: 'plan: settings persistence', color: 'green' },
  { type: 'promoteBlock', id: 'spec-3' },
  { type: 'setGauge', percent: 85 },
  { type: 'setCounter', value: 17500, speed: 'fast' },
  { type: 'flipStatus', key: 'costToChange', value: 20 },
  { type: 'stop' },

  {
    type: 'flush',
    shelf: 'plan',
    consolidated: { id: 'plan-consolidated-1', label: 'consolidated plan v1' },
    reference: { id: 'plan-ref-1', label: 'plan ref' },
  },
  { type: 'setGauge', percent: 12 },
  { type: 'stop' },

  { type: 'moveGaze', target: 'app' },
  { type: 'flipStatus', key: 'workingFeatures', value: 3 },
  { type: 'flipStatus', key: 'costToChange', value: 32 },
  { type: 'stop' },

  { type: 'moveGaze', target: 'spec' },
  { type: 'flipStatus', key: 'workingFeatures', value: 5 },
  { type: 'flipStatus', key: 'costToChange', value: 48 },
  { type: 'stop' },

  { type: 'moveGaze', target: 'app' },
  { type: 'flipStatus', key: 'workingFeatures', value: 7 },
  { type: 'flipStatus', key: 'costToChange', value: 63 },
  { type: 'stop' },

  { type: 'moveGaze', target: 'code' },
  { type: 'flipStatus', key: 'codePaneDimmed', value: false },
  { type: 'stop' },
]
