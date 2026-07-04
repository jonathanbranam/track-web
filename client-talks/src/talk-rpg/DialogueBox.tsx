import { useDirector } from './Director'
import { useWorldAnchor } from './useWorldAnchor'

/** Renders `resting.ui`'s dialogue variant: a bottom dialogue box for 'say', a world-anchored bubble for 'thought'. */
export default function DialogueBox() {
  const { resting } = useDirector()
  const { ui } = resting
  if (ui.kind !== 'dialogue') return null

  if (ui.variant === 'thought') {
    return <ThoughtBubble entityId={ui.speaker ?? ''} text={ui.text} />
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-16 z-10 flex justify-center px-6">
      <div className="w-full max-w-3xl rounded-lg border-4 border-white bg-slate-900/95 p-5 font-mono text-2xl leading-relaxed text-white shadow-2xl">
        {ui.speaker && (
          <div className="mb-2 text-base font-bold uppercase tracking-wide text-sky-300">{ui.speaker}</div>
        )}
        <div>{ui.text}</div>
      </div>
    </div>
  )
}

/** `speaker` carries the thinking entity's id for `useWorldAnchor`, not a display name — thought bubbles show no speaker label. */
function ThoughtBubble({ entityId, text }: { entityId: string; text: string }) {
  const anchorRef = useWorldAnchor(entityId)
  return (
    <div ref={anchorRef} className="fixed left-0 top-0 z-10" style={{ display: 'none' }}>
      <div className="pointer-events-none -translate-x-1/2 -translate-y-[120%] whitespace-nowrap rounded-2xl border-4 border-white bg-white/95 px-4 py-2 font-mono text-lg italic text-slate-900 shadow-xl">
        {text}
      </div>
    </div>
  )
}
