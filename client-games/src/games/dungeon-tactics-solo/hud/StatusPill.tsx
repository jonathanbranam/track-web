import type { GameState } from '../types'

// Top-center status text. Mirrors the former Phaser status pill: a placement
// prompt during turn 0, and a playback label while PC/NPC actions resolve.
// The player phase shows nothing (the action buttons carry the affordance).
function statusText(phase: GameState['phase']): string | null {
  if (phase === 'placement') return 'Place your units'
  if (phase === 'pc-playback') return 'PC Actions…'
  if (phase === 'npc-playback') return 'Enemy Actions…'
  return null
}

export default function StatusPill({ phase }: { phase: GameState['phase'] }) {
  const text = statusText(phase)
  if (!text) return null
  return (
    <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-lg bg-gray-900/80 px-4 py-1.5 text-[13px] text-gray-300">
      {text}
    </div>
  )
}
