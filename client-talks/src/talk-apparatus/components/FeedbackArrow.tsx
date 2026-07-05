interface FeedbackArrowProps {
  active: boolean
}

/** The Stage 3 loop made literal: skills shelf → the pinned foundation of the next context. */
export default function FeedbackArrow({ active }: FeedbackArrowProps) {
  if (!active) return null
  return (
    <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-300 transition-opacity duration-500">
      <span>SKILLS</span>
      <span aria-hidden className="text-emerald-400">
        ⟶
      </span>
      <span>FOUNDATION</span>
    </div>
  )
}
