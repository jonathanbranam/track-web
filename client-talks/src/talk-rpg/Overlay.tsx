import { BEATS } from './script'
import { useDirector } from './Director'

interface OverlayProps {
  expanded: boolean
  onExpand: () => void
  onFullScreen: () => void
}

export default function Overlay({ expanded, onExpand, onFullScreen }: OverlayProps) {
  const director = useDirector()
  const beat = BEATS[director.currentBeat]
  const caption = beat?.caption

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col">
      {caption && (
        <div className="flex-1 flex items-center justify-center px-8">
          {caption.type === 'act-card' && (
            <p className="text-4xl font-black uppercase tracking-widest text-white text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {caption.text}
            </p>
          )}
          {caption.type === 'encounter' && (
            <p className="text-2xl font-bold uppercase tracking-wide text-yellow-300 text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              {caption.text}
            </p>
          )}
          {caption.type === 'punchline' && (
            <p className="text-3xl font-bold text-white text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              {caption.text}
            </p>
          )}
          {caption.type === 'dialogue' && (
            <p className="text-xl text-white text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {caption.text}
            </p>
          )}
        </div>
      )}

      <div className="flex-1" />

      <div className="pointer-events-auto flex items-center gap-2 p-3 justify-end">
        <button
          className="rounded px-3 py-1.5 text-xs font-mono text-white/70 hover:text-white bg-black/40 hover:bg-black/60 transition-colors"
          onClick={(e) => { e.stopPropagation(); director.advance() }}
          title="Advance (→)"
        >
          ▶ ADV
        </button>
        <button
          className="rounded px-3 py-1.5 text-xs font-mono text-white/70 hover:text-white bg-black/40 hover:bg-black/60 transition-colors"
          onClick={(e) => { e.stopPropagation(); onExpand() }}
          title={expanded ? 'Exit Expand' : 'Expand'}
        >
          {expanded ? '⊡' : '⊞'}
        </button>
        <button
          className="rounded px-3 py-1.5 text-xs font-mono text-white/70 hover:text-white bg-black/40 hover:bg-black/60 transition-colors"
          onClick={(e) => { e.stopPropagation(); onFullScreen() }}
          title="Full Screen"
        >
          ⛶
        </button>
      </div>
    </div>
  )
}
