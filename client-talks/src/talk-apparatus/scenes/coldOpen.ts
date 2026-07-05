import { BeatAction } from '../actions'

/** Scene 0 — Cold open: an expiring-headline ticker, the divergence chart, then a static hold for the personal admission. */
export const coldOpen: BeatAction[] = [
  { type: 'sceneSwap', stageKind: 'coldOpen' },
  { type: 'flipStatus', key: 'tickerHeadline', value: '2022: "Coding is dead within two years."' },
  { type: 'stop' },

  { type: 'flipStatus', key: 'tickerHeadline', value: '2023: "No junior engineers will be hired again."' },
  { type: 'stop' },

  { type: 'flipStatus', key: 'tickerHeadline', value: '2024: "AI writes ninety percent of the code."' },
  { type: 'stop' },

  { type: 'flipStatus', key: 'tickerHeadline', value: '2026: still hiring engineers.' },
  { type: 'stop' },

  { type: 'flipStatus', key: 'chartRevealed', value: true },
  { type: 'stop' },

  {
    type: 'flipStatus',
    key: 'coldOpenHold',
    value: 'I believed the predicted line. Then I actually tried to live inside the gap.',
  },
  { type: 'stop' },
]
