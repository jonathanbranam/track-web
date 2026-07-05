import { BeatAction } from '../actions'

/**
 * Scene 1 — Vibe coding: a healthy-looking empty apparatus streams neutral
 * blocks, drops in one "remember" instruction (green, highlighted, promoted),
 * stalls on working features despite a feature-rich-looking app, then
 * overflows — evicting the remembered block — with a visible consequence.
 *
 * Each user prompt is followed by a short `speaker: 'agent'` reply so the chat
 * pane reads as a two-sided conversation. Agent replies are chat-only (never
 * promoted): they populate the transcript's left side without touching the
 * context-window / gauge / counter narrative that the user prompts drive.
 */
export const stage1VibeCoding: BeatAction[] = [
  { type: 'sceneSwap', stageKind: 'apparatus' },
  { type: 'pinFoundation', id: 'system-prompt', label: 'system prompt' },
  { type: 'moveGaze', target: 'app' },
  { type: 'setGauge', percent: 0 },
  { type: 'setCounter', value: 0, speed: 'fast' },
  { type: 'flipStatus', key: 'bug', value: true },
  { type: 'flipStatus', key: 'workingFeatures', value: 0 },
  { type: 'flipStatus', key: 'appTabs', value: 1 },
  { type: 'stop' },

  { type: 'spawnBlock', id: 'chat-1', label: 'add a login page', color: 'muted' },
  { type: 'promoteBlock', id: 'chat-1' },
  { type: 'spawnBlock', id: 'agent-1', label: '✓ built the login page', color: 'muted', speaker: 'agent' },
  { type: 'setGauge', percent: 25 },
  { type: 'setCounter', value: 4200, speed: 'fast' },
  { type: 'flipStatus', key: 'appTabs', value: 2 },
  { type: 'stop' },

  { type: 'spawnBlock', id: 'chat-2', label: 'make the button blue', color: 'muted' },
  { type: 'promoteBlock', id: 'chat-2' },
  { type: 'spawnBlock', id: 'agent-2', label: '✓ recolored the button', color: 'muted', speaker: 'agent' },
  { type: 'setGauge', percent: 45 },
  { type: 'setCounter', value: 9100, speed: 'fast' },
  { type: 'flipStatus', key: 'appTabs', value: 4 },
  { type: 'stop' },

  { type: 'spawnBlock', id: 'remember-1', label: 'remember: fix it this way', color: 'green' },
  { type: 'highlightBlock', id: 'remember-1' },
  { type: 'promoteBlock', id: 'remember-1' },
  { type: 'spawnBlock', id: 'agent-remember', label: "noted — I'll keep that in mind", color: 'muted', speaker: 'agent' },
  { type: 'setGauge', percent: 55 },
  { type: 'stop' },

  { type: 'spawnBlock', id: 'chat-3', label: 'also add dark mode', color: 'muted' },
  { type: 'promoteBlock', id: 'chat-3' },
  { type: 'spawnBlock', id: 'agent-3', label: '✓ added a dark mode toggle', color: 'muted', speaker: 'agent' },
  { type: 'setGauge', percent: 70 },
  { type: 'setCounter', value: 15300, speed: 'fast' },
  { type: 'flipStatus', key: 'appTabs', value: 6 },
  { type: 'flipStatus', key: 'workingFeatures', value: 1 },
  { type: 'stop' },

  { type: 'spawnBlock', id: 'chat-4', label: 'add settings panel', color: 'muted' },
  { type: 'promoteBlock', id: 'chat-4' },
  { type: 'spawnBlock', id: 'agent-4', label: '✓ wired up the settings panel', color: 'muted', speaker: 'agent' },
  { type: 'setGauge', percent: 88 },
  { type: 'setCounter', value: 21800, speed: 'fast' },
  { type: 'flipStatus', key: 'appTabs', value: 8 },
  { type: 'flipStatus', key: 'workingFeatures', value: 1 },
  { type: 'stop' },

  { type: 'setGauge', percent: 108 },
  { type: 'evictBlock', id: 'remember-1' },
  { type: 'stop' },

  { type: 'flipStatus', key: 'bug', value: false },
  { type: 'moveGaze', target: 'app' },
  { type: 'stop' },

  { type: 'pause' },
  { type: 'stop' },
]
