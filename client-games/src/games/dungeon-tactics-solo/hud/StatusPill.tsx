import type { GameState } from '@repo/dungeon-engine'

// Top-center status text. Mirrors the former Phaser status pill: a placement
// prompt during turn 0, and a label while NPC movement/attacks resolve.
// The player phase shows nothing (the action buttons carry the affordance).
function statusText(phase: GameState['phase']): string | null {
  if (phase === 'placement') return 'Place your units'
  if (phase === 'npc-move') return 'Enemies Moving…'
  if (phase === 'npc-attack') return 'Enemy Attacks…'
  return null
}

// `refusal` carries the engine's reason the last Start attempt was refused
// (e.g. no tower on the board). It takes over the pill in place of the phase
// text — Start is not disabled when the engine would refuse it (the control
// never decides that for itself), so the reason has to be reachable somewhere,
// and this is the surface that already sits top-center during placement.
export default function StatusPill({ phase, refusal }: { phase: GameState['phase']; refusal?: string | null }) {
  const text = refusal ?? statusText(phase)
  if (!text) return null
  return (
    <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-lg bg-gray-900/80 px-4 py-1.5 text-[13px] text-gray-300">
      {text}
    </div>
  )
}
